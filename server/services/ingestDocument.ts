/**
 * ingestDocument.ts
 *
 * Real document ingestion pipeline for IP-SAKTI Sahayak.
 *
 * Pipeline:
 *  1. Read PDF from disk.
 *  2. Compute SHA-256 hash → deduplication guard.
 *  3. Extract text page-by-page via pdf-parse custom pagerender callback.
 *  4. Chunk pages via chunking.ts.
 *  5. Upsert source record (CDSCO).
 *  6. Insert document record (checks for duplicate hash first).
 *  7. Embed each chunk with existing embedText() → verify 768 dims.
 *  8. Batch-insert document_chunks rows.
 *  9. Update document status to 'indexed'.
 *
 * Run:   npx tsx server/services/ingestDocument.ts
 *
 * Guards:
 *  - Stops immediately on any Supabase or Gemini error.
 *  - Skips entirely if this PDF hash already exists in documents.
 *  - Never fabricates embeddings or chunk content.
 *  - Uses service-role client for all writes.
 *  - Never touches frontend code.
 */

import { createRequire } from 'module';
import { readFileSync, existsSync } from 'fs';
import { createHash } from 'crypto';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

// ── CJS interop: pdf-parse is CommonJS ────────────────────────────────────────
const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (
  buf: Buffer,
  options?: Record<string, unknown>
) => Promise<{ numpages: number; text: string; info: Record<string, unknown> | null }>;

// ── Local imports ─────────────────────────────────────────────────────────────
import { embedText } from './embeddings_quota';
import { getSupabaseAdmin } from './supabaseAdmin.js';
import { chunkPages, PageText } from './chunking.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PDF_PATH = resolve(__dirname, '../../data/knowledge-base/drugs-rules-1945.pdf');

// CDSCO source metadata — authoritative, no invented values.
const SOURCE_METADATA = {
  name: 'CDSCO Drugs Rules',
  organization: 'Central Drugs Standard Control Organisation',
  jurisdiction: 'India',
  authority_tier: 1,
  source_type: 'government_regulation',
  base_url: 'https://www.cdsco.gov.in/opencms/opencms/en/Acts-and-rules/Drugs-Rules/',
  description: 'The Drugs Rules, 1945 — principal subordinate legislation under the Drugs and Cosmetics Act, 1940. Governs manufacture, distribution, sale, import and labelling of drugs in India.',
  is_active: true,
};

const DOCUMENT_METADATA = {
  title: 'The Drugs Rules, 1945',
  document_type: 'government_regulation',
  jurisdiction: 'India',
  // Exact publication/effective dates cannot be established from the PDF alone — use null.
  publication_date: null,
  effective_date: null,
  version: null,
  // The direct PDF URL returned 404 previously; use null and record the canonical page URL.
  canonical_url: null,
  storage_path: 'data/knowledge-base/drugs-rules-1945.pdf',
};

// Rate limit: measured ~100+ RPM on this key. Use 600ms between calls
// (matches actual API latency) with exponential backoff on any 429.
const EMBED_PAUSE_MS = 600;
// Max retries on 429 with exponential backoff
const EMBED_MAX_RETRIES = 5;

// ── Helpers ───────────────────────────────────────────────────────────────────

function sha256(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex');
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

/**
 * Extract per-page text from the PDF using pdf-parse's custom pagerender callback.
 * The callback fires once per page in order; we collect into an array.
 */
async function extractPages(buf: Buffer): Promise<{ numpages: number; pages: PageText[] }> {
  const pages: PageText[] = [];

  // We capture page index via a closure counter.
  // pdf-parse calls pagerender(pageData) for pages 1..numpages in order.
  let pageIdx = 0;

  const options = {
    // Custom render: collect per-page text into our array.
    pagerender: async (pageData: {
      getTextContent: (opts: Record<string, unknown>) => Promise<{
        items: Array<{ str: string; transform: number[] }>;
      }>;
    }) => {
      pageIdx += 1;
      const current = pageIdx; // capture for async closure
      const content = await pageData.getTextContent({ normalizeWhitespace: false });

      let lastY: number | undefined;
      let text = '';
      for (const item of content.items) {
        if (lastY === item.transform[5] || lastY === undefined) {
          text += item.str;
        } else {
          text += '\n' + item.str;
        }
        lastY = item.transform[5];
      }

      pages.push({ pageNumber: current, text });
      return text; // pdf-parse still concatenates into ret.text — we don't use it
    },
    max: 0, // all pages
  };

  const result = await pdfParse(buf, options);
  return { numpages: result.numpages, pages };
}

// ── Main pipeline ─────────────────────────────────────────────────────────────

export async function ingestDrugsRules1945(opts: {
  dryRun?: boolean; // if true: extract+chunk only, no embeddings/DB writes
  maxChunksForDryRun?: number;
}): Promise<void> {
  const { dryRun = false, maxChunksForDryRun = 5 } = opts;

  // ── Guard: env vars ──────────────────────────────────────────────────────────
  if (!process.env.SUPABASE_URL) throw new Error('SUPABASE_URL is missing from .env');
  if (!dryRun && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing from .env');
  }
  if (!dryRun && !process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is missing from .env');
  }

  // ── Step 1: Read PDF ─────────────────────────────────────────────────────────
  if (!existsSync(PDF_PATH)) {
    throw new Error(`PDF not found at: ${PDF_PATH}`);
  }
  const pdfBuffer = readFileSync(PDF_PATH);
  console.log(`[ingest] PDF read: ${(pdfBuffer.length / 1024 / 1024).toFixed(2)} MB`);

  // ── Step 2: SHA-256 hash ─────────────────────────────────────────────────────
  const contentHash = sha256(pdfBuffer);
  console.log(`[ingest] Content hash: ${contentHash}`);

  // ── Step 3: Extract pages ────────────────────────────────────────────────────
  console.log('[ingest] Extracting text from PDF...');
  const { numpages, pages } = await extractPages(pdfBuffer);
  console.log(`[ingest] Pages extracted: ${numpages} (collected: ${pages.length})`);

  if (pages.length === 0) {
    throw new Error('PDF extraction returned 0 pages — cannot proceed.');
  }

  // Spot-check
  const firstPageSample = pages[0]?.text.slice(0, 200).replace(/\n/g, ' ') ?? '';
  const lastPageSample = pages[pages.length - 1]?.text.slice(0, 200).replace(/\n/g, ' ') ?? '';
  console.log(`[ingest] First page sample: "${firstPageSample}"`);
  console.log(`[ingest] Last  page sample: "${lastPageSample}"`);

  // ── Step 4: Chunk ────────────────────────────────────────────────────────────
  console.log('[ingest] Chunking pages...');
  const chunks = chunkPages(pages);
  console.log(`[ingest] Total chunks: ${chunks.length}`);

  if (chunks.length === 0) {
    throw new Error('Chunking produced 0 chunks — cannot proceed.');
  }

  // Representative sample
  const sampleIndices = [0, Math.floor(chunks.length / 4), Math.floor(chunks.length / 2), chunks.length - 1];
  for (const i of sampleIndices) {
    const c = chunks[i];
    if (!c) continue;
    console.log(`[ingest] Chunk #${c.chunk_index} | page=${c.page_number} | section="${c.section_title ?? '—'}" | sub="${c.subsection_title ?? '—'}" | len=${c.content.length}`);
    console.log(`         preview: "${c.content.slice(0, 120).replace(/\n/g, ' ')}"`);
  }

  // ── DRY RUN stops here ────────────────────────────────────────────────────────
  if (dryRun) {
    console.log(`\n[ingest] DRY RUN — showing first ${maxChunksForDryRun} chunks in detail:\n`);
    for (let i = 0; i < Math.min(maxChunksForDryRun, chunks.length); i++) {
      const c = chunks[i];
      console.log(`── Chunk #${c.chunk_index} ────────────────────────`);
      console.log(`   page_number:       ${c.page_number}`);
      console.log(`   section_title:     ${c.section_title ?? 'null'}`);
      console.log(`   subsection_title:  ${c.subsection_title ?? 'null'}`);
      console.log(`   content length:    ${c.content.length}`);
      console.log(`   content:\n${c.content.slice(0, 400)}`);
      console.log('');
    }
    // Count section/subsection coverage
    const withSection = chunks.filter((c) => c.section_title).length;
    const withSub = chunks.filter((c) => c.subsection_title).length;
    console.log(`[ingest] Section coverage:    ${withSection}/${chunks.length} chunks have section_title`);
    console.log(`[ingest] Subsection coverage: ${withSub}/${chunks.length} chunks have subsection_title`);
    console.log('\n[ingest] DRY RUN complete — no embeddings or DB writes performed.');
    return;
  }

  // ── Step 5: Check for duplicate or resume partial ingestion ─────────────────
  const supabase = getSupabaseAdmin();

  console.log('[ingest] Checking for existing document with same hash...');
  const { data: existingDocs, error: existingErr } = await supabase
    .from('documents')
    .select('id, status, title')
    .eq('content_hash', contentHash);

  if (existingErr) {
    throw new Error(`Supabase duplicate-check failed: ${existingErr.message}`);
  }

  let documentId: string | null = null;
  let resumeFromChunk = 0;

  if (existingDocs && existingDocs.length > 0) {
    const doc = existingDocs[0];
    if (doc.status === 'indexed') {
      console.log(`[ingest] Document already fully ingested (id=${doc.id}, status=indexed). Nothing to do.`);
      return;
    }
    // Partial ingestion — resume from where we left off
    console.log(`[ingest] Found partial ingestion (id=${doc.id}, status=${doc.status}). Checking existing chunks...`);
    const { count: existingChunkCount } = await supabase
      .from('document_chunks')
      .select('id', { count: 'exact', head: true })
      .eq('document_id', doc.id);
    resumeFromChunk = existingChunkCount ?? 0;
    documentId = doc.id as string;
    console.log(`[ingest] Resuming from chunk index ${resumeFromChunk} (${existingChunkCount} already inserted).`);
  }
  console.log('[ingest] No duplicate found — proceeding with ingestion.');

  // ── Step 6: Find-or-create source record ─────────────────────────────────────
  // The sources table has no UNIQUE constraint on name (only a plain index),
  // so we cannot use onConflict. Use select-then-insert instead.
  console.log('[ingest] Finding or creating source record...');
  const { data: existingSources, error: sourceSelectErr } = await supabase
    .from('sources')
    .select('id')
    .eq('name', SOURCE_METADATA.name)
    .limit(1);

  if (sourceSelectErr) {
    throw new Error(`Source lookup failed: ${sourceSelectErr.message}`);
  }

  let sourceId: string;
  if (existingSources && existingSources.length > 0) {
    sourceId = existingSources[0].id as string;
    console.log(`[ingest] Existing source found, ID: ${sourceId}`);
  } else {
    const { data: newSource, error: sourceInsertErr } = await supabase
      .from('sources')
      .insert(SOURCE_METADATA)
      .select('id')
      .single();

    if (sourceInsertErr || !newSource) {
      throw new Error(`Source insert failed: ${sourceInsertErr?.message ?? 'no data returned'}`);
    }
    sourceId = newSource.id as string;
    console.log(`[ingest] New source created, ID: ${sourceId}`);
  }

  // ── Step 7: Insert document record ───────────────────────────────────────────
  if (!documentId) {
    console.log('[ingest] Inserting document record...');
    const { data: docData, error: docErr } = await supabase
      .from('documents')
      .insert({
        ...DOCUMENT_METADATA,
        source_id: sourceId,
        content_hash: contentHash,
        status: 'processing',
        metadata: {
          numpages,
          file_size_bytes: pdfBuffer.length,
          ingested_at: new Date().toISOString(),
          source_provenance: SOURCE_METADATA.base_url,
        },
      })
      .select('id')
      .single();

    if (docErr || !docData) {
      throw new Error(`Document insert failed: ${docErr?.message ?? 'no data returned'}`);
    }
    documentId = docData.id as string;
  }
  console.log(`[ingest] Document ID: ${documentId}`);

  // ── Step 8: Embed and insert chunks ──────────────────────────────────────────
  const chunksToProcess = chunks.slice(resumeFromChunk);
  console.log(`[ingest] Embedding ${chunksToProcess.length} chunks (skipping first ${resumeFromChunk} already done)...`);

  const BATCH_INSERT_SIZE = 50;
  let insertedCount = resumeFromChunk;
  let batchRows: Record<string, unknown>[] = [];

  const flush = async () => {
    if (batchRows.length === 0) return;
    const { error: batchErr } = await supabase.from('document_chunks').insert(batchRows);
    if (batchErr) {
      throw new Error(`Chunk batch insert failed at chunk ~${insertedCount}: ${batchErr.message}`);
    }
    insertedCount += batchRows.length;
    console.log(`[ingest]   Inserted ${insertedCount}/${chunks.length} chunks...`);
    batchRows = [];
  };

  for (const chunk of chunksToProcess) {
    // Generate real embedding with retry on 429
    let embedding: number[] | null = null;
    for (let attempt = 1; attempt <= EMBED_MAX_RETRIES; attempt++) {
      try {
        embedding = await embedText(chunk.content);
        break;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        const is429 = msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED');
        if (is429 && attempt < EMBED_MAX_RETRIES) {
          const backoff = 5000 * attempt; // 5s, 10s, 15s, 20s
          console.log(`[ingest]   Rate-limited on chunk #${chunk.chunk_index}, retrying in ${(backoff / 1000).toFixed(0)}s (attempt ${attempt}/${EMBED_MAX_RETRIES})...`);
          await sleep(backoff);
        } else {
          throw new Error(`Embedding failed on chunk #${chunk.chunk_index} after ${attempt} attempt(s): ${msg}`);
        }
      }
    }
    if (!embedding) throw new Error(`Embedding null after retries on chunk #${chunk.chunk_index}`);

    // Hard assertion — never insert wrong-dimension data
    if (embedding.length !== 768) {
      throw new Error(`Embedding dimension mismatch on chunk #${chunk.chunk_index}: expected 768, got ${embedding.length}. STOPPING.`);
    }

    batchRows.push({
      document_id: documentId,
      chunk_index: chunk.chunk_index,
      content: chunk.content,
      section_title: chunk.section_title,
      subsection_title: chunk.subsection_title,
      page_number: chunk.page_number,
      source_url: SOURCE_METADATA.base_url,
      metadata: {
        document_title: DOCUMENT_METADATA.title,
        jurisdiction: DOCUMENT_METADATA.jurisdiction,
        source_name: SOURCE_METADATA.name,
        authority_tier: SOURCE_METADATA.authority_tier,
      },
      embedding: `[${embedding.join(',')}]`,
    });

    // Flush in batches
    if (batchRows.length >= BATCH_INSERT_SIZE) {
      await flush();
    }

    // Rate-limit: pause between Gemini calls to stay under 5 RPM
    await sleep(EMBED_PAUSE_MS);
  }

  // Flush remaining
  await flush();

  // ── Step 9: Mark document as indexed ─────────────────────────────────────────
  console.log('[ingest] Updating document status to "indexed"...');
  const { error: statusErr } = await supabase
    .from('documents')
    .update({ status: 'indexed', metadata: {
      numpages,
      file_size_bytes: pdfBuffer.length,
      ingested_at: new Date().toISOString(),
      source_provenance: SOURCE_METADATA.base_url,
      total_chunks: chunks.length,
    }})
    .eq('id', documentId);

  if (statusErr) {
    throw new Error(`Document status update failed: ${statusErr.message}`);
  }

  console.log(`\n[ingest] ✓ Ingestion complete.`);
  console.log(`[ingest]   Source ID:   ${sourceId}`);
  console.log(`[ingest]   Document ID: ${documentId}`);
  console.log(`[ingest]   Pages:       ${numpages}`);
  console.log(`[ingest]   Chunks:      ${chunks.length}`);
  console.log(`[ingest]   Hash:        ${contentHash}`);
}

// ── CLI entry point ───────────────────────────────────────────────────────────
// Detect if run directly: `npx tsx server/services/ingestDocument.ts`
// or with --dry-run flag
const isDirect = process.argv[1] && fileURLToPath(import.meta.url).endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop()!);

if (isDirect || process.argv.includes('--run')) {
  const dryRun = process.argv.includes('--dry-run');
  console.log(`[ingest] Starting ${dryRun ? 'DRY RUN (no DB/Gemini)' : 'FULL INGESTION'}...`);

  ingestDrugsRules1945({ dryRun, maxChunksForDryRun: 5 })
    .then(() => {
      process.exit(0);
    })
    .catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`\n[ingest] FATAL ERROR: ${msg}`);
      process.exit(1);
    });
}
