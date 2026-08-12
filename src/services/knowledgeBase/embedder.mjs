import { getOpenAIClient } from '../../config/openaiClient.mjs';
import AppError from '../../utils/AppError.mjs';

// Must match the VECTOR(...) column width in the AgentKnowledgeChunks migration
// (src/config/migrate.mjs) — if this model ever changes, that column has to change too.
export const EMBEDDING_MODEL = 'text-embedding-3-small';
export const EMBEDDING_DIMENSIONS = 1536;

// OpenAI's embeddings endpoint accepts many strings in one request, but very large
// pages could produce enough chunks to hit the request's token limit. Batching keeps
// each call comfortably under that regardless of how big the source page was.
const BATCH_SIZE = 96;

function toBatches(items, size) {
  const batches = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}

// Returns one embedding vector (number[]) per input string, in the same order —
// texts[i] and the returned array[i] always correspond to the same chunk.
export async function embedTexts(texts) {
  const client = getOpenAIClient();
  const vectors = [];

  for (const batch of toBatches(texts, BATCH_SIZE)) {
    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
    });
    vectors.push(...response.data.map((d) => d.embedding));
  }

  if (vectors.length !== texts.length) {
    throw new AppError('Embedding response count did not match the number of chunks sent', 502);
  }

  return vectors;
}
