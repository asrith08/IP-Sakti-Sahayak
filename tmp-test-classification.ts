import { classifyQuestion } from './server/services/questionClassifier';

const queries = [
  "Is this turmeric-based Ayurvedic formulation patentable in India?",
  "Can I sell this Ayurvedic product in India under current regulations?",
  "What is the weather today?"
];

for (const q of queries) {
  console.log(`\nQuery: ${q}`);
  console.log(classifyQuestion(q));
}
