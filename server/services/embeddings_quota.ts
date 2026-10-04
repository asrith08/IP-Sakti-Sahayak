import { embedText as originalEmbedText } from './embeddings.js';

export async function embedText(text: string): Promise<number[]> {
  try {
    return await originalEmbedText(text);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    // If quota exhausted or rate limited, throw a clear error
    if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429')) {
      throw new Error(`Gemini embedding quota exhausted. Ingestion should be resumed after the quota resets.`);
    }
    // Re-throw other errors
    throw err;
  }
}
