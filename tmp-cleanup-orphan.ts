import dotenv from 'dotenv';
dotenv.config();
import { getSupabaseAdmin } from './server/services/supabaseAdmin.js';

const sb = getSupabaseAdmin();
const HASH = 'fb5b7675a9a0e9cb539fa0131875922f1bdd290389a192aa1a67d0b9d871eeb7';

// Show ALL documents with this hash
const { data: docs } = await sb.from('documents').select('id,status,title,created_at').eq('content_hash', HASH);
console.log('All documents with this hash:');
for (const d of docs ?? []) console.log(' ', JSON.stringify(d));

// Delete ALL of them (all are orphaned — no chunks yet)
for (const doc of docs ?? []) {
  // Check chunk count first
  const { count } = await sb.from('document_chunks').select('id', { count: 'exact', head: true }).eq('document_id', doc.id);
  console.log(`  doc ${doc.id} has ${count ?? 0} chunks`);
  if ((count ?? 0) === 0) {
    const { error } = await sb.from('documents').delete().eq('id', doc.id);
    console.log(`  Deleted ${doc.id}:`, error?.message ?? 'OK');
  } else {
    console.log(`  KEEPING ${doc.id} — has chunks (already ingested)`);
  }
}

// Show ALL sources named CDSCO Drugs Rules
const { data: src } = await sb.from('sources').select('id,name,created_at').eq('name', 'CDSCO Drugs Rules');
console.log('\nAll CDSCO Drugs Rules sources:');
for (const s of src ?? []) console.log(' ', JSON.stringify(s));

// Delete sources that have no documents
for (const s of src ?? []) {
  const { count } = await sb.from('documents').select('id', { count: 'exact', head: true }).eq('source_id', s.id);
  console.log(`  source ${s.id} has ${count ?? 0} documents`);
  if ((count ?? 0) === 0) {
    const { error } = await sb.from('sources').delete().eq('id', s.id);
    console.log(`  Deleted source ${s.id}:`, error?.message ?? 'OK');
  } else {
    console.log(`  KEEPING source ${s.id}`);
  }
}

console.log('\nCleanup complete.');
