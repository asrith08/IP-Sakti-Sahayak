/**
 * READ-ONLY Supabase verification script.
 * No inserts, no updates, no Gemini calls.
 */
import dotenv from 'dotenv';
dotenv.config();
import { getSupabaseAdmin } from './server/services/supabaseAdmin.js';

const sb = getSupabaseAdmin();
const HASH = 'fb5b7675a9a0e9cb539fa0131875922f1bdd290389a192aa1a67d0b9d871eeb7';

console.log('\n═══════════════════════════════════════════════════════');
console.log(' SUPABASE STATE VERIFICATION (READ-ONLY)');
console.log('═══════════════════════════════════════════════════════\n');

// ── 1. Documents with this hash ───────────────────────────────────────────────
const { data: docs, error: docsErr } = await sb
  .from('documents')
  .select('id, source_id, status, content_hash, title, created_at, metadata')
  .eq('content_hash', HASH);

if (docsErr) { console.error('DOCUMENTS QUERY FAILED:', docsErr.message); process.exit(1); }

console.log(`Documents with hash ${HASH}:`);
console.log(`  Count: ${docs?.length ?? 0}`);
if (!docs || docs.length === 0) { console.log('  ⚠  No documents found.'); process.exit(0); }

for (const doc of docs) {
  console.log(`\n  ── Document ──────────────────────────────────────────`);
  console.log(`  id:           ${doc.id}`);
  console.log(`  source_id:    ${doc.source_id}`);
  console.log(`  status:       ${doc.status}`);
  console.log(`  title:        ${doc.title}`);
  console.log(`  content_hash: ${doc.content_hash}`);
  console.log(`  created_at:   ${doc.created_at}`);
  console.log(`  metadata:     ${JSON.stringify(doc.metadata)}`);
}

// Check for duplicates
if (docs.length > 1) {
  console.log(`\n  ⚠  DUPLICATE DOCUMENTS FOUND: ${docs.length} documents share the same hash!`);
} else {
  console.log(`\n  ✓  No duplicate documents.`);
}

const primaryDoc = docs[0];
const documentId = primaryDoc.id as string;

// ── 2. Source ─────────────────────────────────────────────────────────────────
console.log('\n── Source ────────────────────────────────────────────────');
const { data: src, error: srcErr } = await sb
  .from('sources')
  .select('id, name, organization, authority_tier, source_type, base_url')
  .eq('id', primaryDoc.source_id);

if (srcErr) { console.error('SOURCE QUERY FAILED:', srcErr.message); process.exit(1); }
if (!src || src.length === 0) {
  console.log('  ⚠  Source record NOT found for source_id:', primaryDoc.source_id);
} else {
  const s = src[0];
  console.log(`  id:             ${s.id}`);
  console.log(`  name:           ${s.name}`);
  console.log(`  organization:   ${s.organization}`);
  console.log(`  authority_tier: ${s.authority_tier}`);
  console.log(`  source_type:    ${s.source_type}`);
  console.log(`  base_url:       ${s.base_url}`);
}

// ── 3. Total chunk count ──────────────────────────────────────────────────────
console.log('\n── Chunks ────────────────────────────────────────────────');
const { count: totalChunks, error: countErr } = await sb
  .from('document_chunks')
  .select('id', { count: 'exact', head: true })
  .eq('document_id', documentId);

if (countErr) { console.error('CHUNK COUNT FAILED:', countErr.message); process.exit(1); }
console.log(`  Total chunks stored: ${totalChunks ?? 0}`);

// ── 4. Chunks with non-null embeddings ────────────────────────────────────────
const { count: embeddedChunks, error: embCountErr } = await sb
  .from('document_chunks')
  .select('id', { count: 'exact', head: true })
  .eq('document_id', documentId)
  .not('embedding', 'is', null);

if (embCountErr) { console.error('EMBEDDED COUNT FAILED:', embCountErr.message); process.exit(1); }
console.log(`  Chunks with non-null embeddings: ${embeddedChunks ?? 0}`);

// ── 5. Embedding dimensions — sample first and last embedded chunk ────────────
console.log('\n── Embedding dimensions (sampled) ───────────────────────');
const { data: firstEmb, error: firstEmbErr } = await sb
  .from('document_chunks')
  .select('chunk_index, embedding')
  .eq('document_id', documentId)
  .not('embedding', 'is', null)
  .order('chunk_index', { ascending: true })
  .limit(1);

const { data: lastEmb, error: lastEmbErr } = await sb
  .from('document_chunks')
  .select('chunk_index, embedding')
  .eq('document_id', documentId)
  .not('embedding', 'is', null)
  .order('chunk_index', { ascending: false })
  .limit(1);

if (firstEmbErr || lastEmbErr) {
  console.error('EMBEDDING SAMPLE FAILED:', firstEmbErr?.message ?? lastEmbErr?.message);
} else {
  const parseEmbDim = (raw: unknown): number => {
    if (!raw) return -1;
    if (Array.isArray(raw)) return raw.length;
    // Supabase returns vector as a string like "[0.1,0.2,...]"
    if (typeof raw === 'string') {
      try { return JSON.parse(raw).length; } catch { return -1; }
    }
    return -1;
  };

  if (firstEmb && firstEmb.length > 0) {
    const dim = parseEmbDim(firstEmb[0].embedding);
    console.log(`  First embedded chunk: index=${firstEmb[0].chunk_index}, dim=${dim}`);
  }
  if (lastEmb && lastEmb.length > 0) {
    const dim = parseEmbDim(lastEmb[0].embedding);
    console.log(`  Last  embedded chunk: index=${lastEmb[0].chunk_index}, dim=${dim}`);
  }
}

// ── 6. Page number range ──────────────────────────────────────────────────────
console.log('\n── Page number range ────────────────────────────────────');
const { data: pageMin, error: pageMinErr } = await sb
  .from('document_chunks')
  .select('page_number')
  .eq('document_id', documentId)
  .order('page_number', { ascending: true })
  .limit(1);

const { data: pageMax, error: pageMaxErr } = await sb
  .from('document_chunks')
  .select('page_number')
  .eq('document_id', documentId)
  .order('page_number', { ascending: false })
  .limit(1);

if (pageMinErr || pageMaxErr) {
  console.error('PAGE RANGE FAILED:', pageMinErr?.message ?? pageMaxErr?.message);
} else {
  console.log(`  Min page_number: ${pageMin?.[0]?.page_number ?? 'null'}`);
  console.log(`  Max page_number: ${pageMax?.[0]?.page_number ?? 'null'}`);
}

// ── 7. Section/subsection coverage ───────────────────────────────────────────
console.log('\n── Metadata coverage ────────────────────────────────────');
const { count: withSection, error: secErr } = await sb
  .from('document_chunks')
  .select('id', { count: 'exact', head: true })
  .eq('document_id', documentId)
  .not('section_title', 'is', null);

const { count: withSub, error: subErr } = await sb
  .from('document_chunks')
  .select('id', { count: 'exact', head: true })
  .eq('document_id', documentId)
  .not('subsection_title', 'is', null);

if (secErr || subErr) {
  console.error('METADATA COUNT FAILED:', secErr?.message ?? subErr?.message);
} else {
  console.log(`  Chunks with section_title:    ${withSection ?? 0}`);
  console.log(`  Chunks with subsection_title: ${withSub ?? 0}`);
}

// ── 8. Highest chunk_index stored ────────────────────────────────────────────
console.log('\n── Chunk index watermark ────────────────────────────────');
const { data: maxChunkRow, error: maxChunkErr } = await sb
  .from('document_chunks')
  .select('chunk_index')
  .eq('document_id', documentId)
  .order('chunk_index', { ascending: false })
  .limit(1);

if (maxChunkErr) {
  console.error('MAX CHUNK INDEX FAILED:', maxChunkErr.message);
} else {
  const maxIdx = maxChunkRow?.[0]?.chunk_index ?? null;
  console.log(`  Highest chunk_index stored: ${maxIdx}`);
  console.log(`  (Total expected: 1839 chunks, indices 0–1838)`);
  if (maxIdx !== null) {
    console.log(`  Remaining to ingest: ${1839 - (maxIdx + 1)} chunks (indices ${maxIdx + 1}–1838)`);
  }
}

// ── 9. Duplicate chunk check (same document_id + chunk_index) ─────────────────
console.log('\n── Duplicate chunk check ────────────────────────────────');
// Fetch all chunk_indexes and detect dupes client-side
const { data: allIndexes, error: dupErr } = await sb
  .from('document_chunks')
  .select('chunk_index')
  .eq('document_id', documentId)
  .order('chunk_index', { ascending: true });

if (dupErr) {
  console.error('DUPLICATE CHECK FAILED:', dupErr.message);
} else {
  const indexCounts: Record<number, number> = {};
  for (const row of allIndexes ?? []) {
    indexCounts[row.chunk_index] = (indexCounts[row.chunk_index] ?? 0) + 1;
  }
  const dupes = Object.entries(indexCounts).filter(([, count]) => count > 1);
  if (dupes.length === 0) {
    console.log('  ✓ No duplicate chunk_index values found.');
  } else {
    console.log(`  ⚠ DUPLICATES FOUND: ${dupes.length} chunk_index values appear more than once:`);
    for (const [idx, count] of dupes.slice(0, 10)) {
      console.log(`    chunk_index=${idx} appears ${count} times`);
    }
  }
}

// ── 10. Sample chunk content ──────────────────────────────────────────────────
console.log('\n── Sample chunk content ─────────────────────────────────');
const { data: samples, error: sampErr } = await sb
  .from('document_chunks')
  .select('chunk_index, page_number, section_title, subsection_title, content')
  .eq('document_id', documentId)
  .in('chunk_index', [0, 100, 500, 899])
  .order('chunk_index', { ascending: true });

if (sampErr) {
  console.error('SAMPLE QUERY FAILED:', sampErr.message);
} else {
  for (const s of samples ?? []) {
    console.log(`\n  Chunk #${s.chunk_index} | page=${s.page_number} | section="${s.section_title ?? '—'}" | sub="${s.subsection_title ?? '—'}"`);
    console.log(`  Content: "${String(s.content).slice(0, 120).replace(/\n/g, ' ')}"`);
  }
}

console.log('\n═══════════════════════════════════════════════════════');
console.log(' VERIFICATION COMPLETE');
console.log('═══════════════════════════════════════════════════════\n');
