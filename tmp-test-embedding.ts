import dotenv from 'dotenv';

dotenv.config();
console.log("GEMINI_API_KEY exists:", Boolean(process.env.GEMINI_API_KEY), "length:", process.env.GEMINI_API_KEY?.length);
const { embedText } = await import('./server/services/embeddings');

const testText = "An Ayurvedic herbal product may be subject to different regulatory requirements depending on its intended use, formulation, claims, and jurisdiction.";

const runTest = async () => {
  try {
    const embedding = await embedText(testText);
    if (!Array.isArray(embedding)) {
      console.log('Failure: Result is not an array');
      process.exit(1);
    }
    if (embedding.length !== 768) {
      console.log(`Failure: Expected 768, got ${embedding.length}`);
      process.exit(1);
    }
    if (!embedding.every((v) => typeof v === 'number')) {
      console.log('Failure: Non-numeric values found');
      process.exit(1);
    }
    console.log('Success');
    console.log('Embedding dimension:', embedding.length);
    console.log('First 3 values:', embedding.slice(0, 3).join(', '));
  } catch (err: any) {
    console.log('Failure:', err.message ?? err);
    process.exit(1);
  }
};

runTest();