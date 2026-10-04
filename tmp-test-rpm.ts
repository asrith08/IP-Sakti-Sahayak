/**
 * Measures how fast the Gemini embedding API responds.
 * Fires 6 requests as fast as possible to find the real rate limit.
 */
import dotenv from 'dotenv';
dotenv.config();
import { embedText } from './server/services/embeddings.js';

const TEXT = "The Drugs Rules 1945 govern manufacture and distribution of drugs in India.";

console.log('Testing real throughput — firing 6 embedding requests as fast as possible...\n');

const results: { i: number; ms: number; ok: boolean; err?: string }[] = [];
const start = Date.now();

for (let i = 1; i <= 6; i++) {
  const t0 = Date.now();
  try {
    const emb = await embedText(TEXT);
    const ms = Date.now() - t0;
    results.push({ i, ms, ok: true });
    console.log(`  Request ${i}: OK (${ms}ms, dim=${emb.length})`);
  } catch (err: unknown) {
    const ms = Date.now() - t0;
    const msg = err instanceof Error ? err.message : String(err);
    const is429 = msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED');
    results.push({ i, ms, ok: false, err: is429 ? '429 rate-limited' : msg.slice(0, 80) });
    console.log(`  Request ${i}: FAILED after ${ms}ms — ${results[i-1].err}`);
    if (is429) {
      console.log('\n  Rate limit hit at request', i, '— free tier confirmed (5 RPM).');
      console.log('  To get faster throughput, enable billing at https://ai.google.dev/');
      break;
    }
  }
}

const total = Date.now() - start;
const succeeded = results.filter(r => r.ok).length;
console.log(`\nResult: ${succeeded} succeeded in ${(total/1000).toFixed(1)}s`);
if (succeeded === 6) {
  const avgMs = results.reduce((s, r) => s + r.ms, 0) / results.length;
  console.log(`Average latency: ${avgMs.toFixed(0)}ms`);
  console.log(`Estimated safe RPM: ~${Math.floor(60000 / (avgMs * 1.1))}`);
  console.log(`Estimated time for 1839 chunks at this rate: ~${Math.ceil(1839 * avgMs / 60000)} minutes`);
}
