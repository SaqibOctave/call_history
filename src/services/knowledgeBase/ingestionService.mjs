import * as orchestrator from '../scraping/orchestrator.mjs';
import { extractFileText } from './fileExtractor.mjs';
import { chunkText } from './chunker.mjs';
import { embedTexts } from './embedder.mjs';
import * as repo from '../../repositories/agentKnowledgeBase.repository.mjs';
import AppError from '../../utils/AppError.mjs';
import logger from '../../config/logger.mjs';

const SUPPORTED_SOURCE_TYPES = ['url', 'file'];

// Step 1 of the pipeline: get raw text out of whichever source type was given.
// 'url'  -> scrape the page (reuses the same MCP-backed scraper built for POST /api/scrape)
// 'file' -> extract text from the uploaded PDF/CSV buffer (see fileExtractor.mjs)
// Both branches converge on the same plain-text string, so everything downstream
// (chunk -> embed -> persist) doesn't need to know or care which source it came from.
async function extractSourceText({ knowledgeBase, file }) {
  if (knowledgeBase.type === 'url') {
    const scraped = await orchestrator.scrape(knowledgeBase.url, {});
    return scraped.content;
  }

  // type === 'file' — file itself never reaches Joi validation (it's multer's raw
  // buffer, not a plain JSON value), so ingestionService is what actually enforces
  // "a file must be attached when knowledgeBase.type is 'file'".
  if (!file) {
    throw new AppError('knowledgeBase.type is "file" but no file was uploaded', 400);
  }
  return extractFileText(file);
}

// End-to-end pipeline for turning a knowledgeBase (from POST /api/knowledge-bases,
// or the knowledgeBase on POST /api/agents) into searchable pgvector rows:
//
//   1. extract  — scrape a URL, or extract text from an uploaded PDF/CSV
//   2. chunk    — split the text into paragraph-sized pieces (chunker.mjs)
//   3. embed    — turn each chunk into a vector via OpenAI embeddings (embedder.mjs)
//   4. persist  — store the knowledge base row once, and each {chunk text, vector} row
//
// `config` is optional and only meaningful when called from POST /api/agents (that
// endpoint's provider settings) — POST /api/knowledge-bases doesn't pass one, and it
// just defaults to '{}'. Either way this does NOT write to the pipecat-owned
// "agents"/"sts_agents" tables.
export async function createAgentKnowledgeBase({ name, config, knowledgeBase, file }) {
  if (!knowledgeBase || !SUPPORTED_SOURCE_TYPES.includes(knowledgeBase.type)) {
    throw new AppError(
      `knowledgeBase.type must be one of: ${SUPPORTED_SOURCE_TYPES.join(', ')}`,
      400
    );
  }

  // sizeBytes is only known upfront for uploaded files (multer already has it from
  // the HTTP request); a scraped URL's byte size isn't meaningful in the same way,
  // so it's left null and simply omitted from the response below.
  const sizeBytes = knowledgeBase.type === 'file' ? file?.size : undefined;

  // source_url column doubles as "where did this come from": the page URL for
  // type 'url', or the original filename for type 'file' — see the comment on
  // that column in migrate.mjs.
  const record = await repo.createKnowledgeBase({
    name,
    config: config || {},
    sourceType: knowledgeBase.type,
    sourceUrl: knowledgeBase.type === 'url' ? knowledgeBase.url : knowledgeBase.fileName,
    sizeBytes,
  });

  try {
    await repo.updateStatus(record.id, knowledgeBase.type === 'url' ? 'scraping' : 'extracting');
    const content = await extractSourceText({ knowledgeBase, file });

    if (!content || !content.trim()) {
      throw new AppError('No content was extracted to embed', 422);
    }

    const chunks = chunkText(content);

    await repo.updateStatus(record.id, 'embedding');
    const embeddings = await embedTexts(chunks);

    // Zip chunk text back up with its embedding — embedTexts guarantees the same
    // order/length as the `chunks` array it was given.
    await repo.insertChunks(
      record.id,
      chunks.map((chunkContent, i) => ({ content: chunkContent, embedding: embeddings[i] }))
    );

    await repo.updateStatus(record.id, 'ready');

    return buildKnowledgeBaseResponse({ ...record, status: 'ready' }, chunks.length);
  } catch (err) {
    logger.error(`Knowledge base ingestion failed (id=${record.id}): ${err.message}`);
    await repo.updateStatus(record.id, 'failed', err.message);
    throw err;
  }
}

// Shapes a DB row (or the in-memory stub returned while pgvector is disabled) into
// the API's public knowledge-base shape. sizeBytes is only included when present
// (file-sourced KBs), matching how a URL-sourced KB has no such field at all rather
// than an explicit null.
export function buildKnowledgeBaseResponse(record, chunkCount) {
  const response = {
    id: record.id,
    name: record.name,
    type: record.source_type,
    source: record.source_url,
    status: record.status,
    chunks: chunkCount,
    createdAt: record.created_at,
  };
  if (record.size_bytes != null) response.sizeBytes = record.size_bytes;
  return response;
}
