/**
 * Quick smoke-test: embed 2 chunks and insert them into Supabase.
 * Used to verify the full pipeline works before the long run.
 */
import dotenv from 'dotenv';
dotenv.config();

import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { embedText } from './server/services/embeddings.js';
import { getSupabaseAdmin } from './server/services/supabaseAdmin.js';
import { chunkPages, PageText } from './server/services/chunking.js';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse') as (buf: Buffer, options?: Record<string, unknown>) => Promise<{ numpages: number }>;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PDF_PATH = resolve(__dirname, 'data/knowledge-base/drugs-rules-1945.pdf');

console.log('[smoke] Reading PDF...');
const buf = readFileSync(PDF_PATH);
const hash = createHash('sha256').update(buf).digest('hex');
console.log('[smoke] Hash:', hash);

const pages: PageText[] = [];
let pageIdx = 0;
const options = {
  pagerender: async (pageData: { getTextContent: (o: Record<string,unknown>) => Promise<{ items: Array<{ str: string; transform: number[] }> }> }) => {
    pageIdx++;
    const current = pageIdx;
    if (current > 3) return '';
    const c = await pageData.getTextContent({ normalizeWhitespace: false });
    let lastY: number | undefined; let text = '';
    for (const item of c.items) {
      if (lastY === item.transform[5] || lastY === undefined) text += item.str;
      else text += '\n' + item.str;
      lastY = item.transform[5];
    }
    pages.push({ pageNumber: current, text });
    return text;
  },
  max: 3,
};
await pdfParse(buf, options);
console.log(`[smoke] Extracted ${pages.length} pages (max 3).`);

const chunks = chunkPages(pages);
console.log(`[smoke] Chunks from first 3 pages: ${chunks.length}`);

const testChunks = chunks.slice(0, 2);
const sb = getSupabaseAdmin();

// Insert a test source
const { data: src } = await sb.from('sources').insert({
  name: 'SMOKE TEST SOURCE - DELETE ME',
  authority_tier: 99,
  organization: 'test',
  jurisdiction: 'test',
  source_type: 'test',
}).select('id').single();
const sourceId = src!.id as string;

const { data: doc } = await sb.from('documents').insert({
  source_id: sourceId,
  title: 'SMOKE TEST DOC - DELETE ME',
  document_type: 'test',
  jurisdiction: 'India',
  content_hash: hash + '_SMOKE',
  status: 'processing',
}).select('id').single();
const documentId = doc!.id as string;

for (const chunk of testChunks) {
  console.log(`[smoke] Embedding chunk #${chunk.chunk_index} (len=${chunk.content.length})...`);
  const emb = await embedText(chunk.content);
  console.log(`[smoke] Embedding dim: ${emb.length} ✓`);
  const { error } = await sb.from('document_chunks').insert({
    document_id: documentId,
    chunk_index: chunk.chunk_index,
    content: chunk.content,
    section_title: chunk.section_title,
    subsection_title: chunk.subsection_title,
    page_number: chunk.page_number,
    source_url: 'https://www.cdsco.gov.in/opencms/opencms/en/Acts-and-rules/Drugs-Rules/',
    metadata: { test: true },
    embedding: `[${emb.join(',')}]`,
  });
  if (error) throw new Error(`Insert failed: ${error.message}`);
  console.log(`[smoke] Chunk #${chunk.chunk_index} inserted OK`);
  await new Promise(r => setTimeout(r, 13000));
}

// Verify
const { data: verify } = await sb.from('document_chunks').select('id,chunk_index,page_number,embedding').eq('document_id', documentId);
console.log('[smoke] Verified chunks in DB:', verify?.length);
for (const v of verify ?? []) {
  const embArr: number[] = JSON.parse(v.embedding);
  console.log(`  chunk_index=${v.chunk_index} page=${v.page_number} embedding_dim=${embArr.length}`);
}

// Cleanup smoke test records
await sb.from('documents').delete().eq('id', documentId);
await sb.from('sources').delete().eq('id', sourceId);
console.log('[smoke] Cleanup done. Pipeline verified end-to-end. ✓');
