import { GoogleGenAI } from "@google/genai";

// Lazy-initialized: created on first call so that dotenv has already loaded
// GEMINI_API_KEY by the time the constructor runs.
let _ai: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  if (!_ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set in environment variables");
    }
    _ai = new GoogleGenAI({ apiKey });
  }
  return _ai;
}

export const embedText = async (text: string): Promise<number[]> => {
  try {
    const response = await getAI().models.embedContent({
      model: "gemini-embedding-2",
      contents: text,
      config: {
        outputDimensionality: 768,
      },
    });

    const embedding = response.embeddings?.[0]?.values;

    if (!embedding) {
      throw new Error("No embeddings returned from Gemini API");
    }

    if (!Array.isArray(embedding) || embedding.length !== 768) {
      throw new Error(`Embedding dimension mismatch: expected 768, got ${embedding.length}`);
    }

    return embedding;
  } catch (err: any) {
    console.error("Gemini embedding error", err);
    throw new Error(`Gemini embedding failed: ${err.message ?? err}`);
  }
};