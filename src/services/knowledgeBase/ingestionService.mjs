import * as orchestrator from '../scraping/orchestrator.mjs';
import { chunkText } from './chunker.mjs';
import { embedTexts } from './embedder.mjs';
import * as repo from '../../repositories/agentKnowledgeBase.repository.mjs';
import AppError from '../../utils/AppError.mjs';
import logger from '../../config/logger.mjs';

const SUPPORTED_SOURCE_TYPES = ['url'];

// End-to-end pipeline for turning a "create agent" payload's knowledgeBase into
// searchable pgvector rows:
//
//   1. scrape   — reuse the MCP-backed scraper already built for POST /api/scrape
//   2. chunk    — split the scraped text into paragraph-sized pieces
//   3. embed    — turn each chunk into a vector via OpenAI embeddings
//   4. persist  — store {name, config} once, and each {chunk text, vector} row
//
// The agent's name/config are stored alongside the chunks (in AgentKnowledgeBases)
// purely as context for this ingestion job — this does NOT write to the
// pipecat-owned "agents"/"sts_agents" tables.
export async function createAgentKnowledgeBase({ name, config, knowledgeBase }) {
  if (!knowledgeBase || !SUPPORTED_SOURCE_TYPES.includes(knowledgeBase.type)) {
    throw new AppError(
      `knowledgeBase.type must be one of: ${SUPPORTED_SOURCE_TYPES.join(', ')}`,
      400
    );
  }

  const record = await repo.createKnowledgeBase({
    name,
    config: config || {},
    sourceType: knowledgeBase.type,
    sourceUrl: knowledgeBase.url,
  });

  try {
    await repo.updateStatus(record.id, 'scraping');
    const scraped = await orchestrator.scrape(knowledgeBase.url, {});

    if (!scraped.content || !scraped.content.trim()) {
      throw new AppError('No content was extracted from the page to embed', 422);
    }

    const chunks = chunkText(scraped.content);

    await repo.updateStatus(record.id, 'embedding');
    const embeddings = await embedTexts(chunks);

    // Zip chunk text back up with its embedding — embedTexts guarantees the same
    // order/length as the `chunks` array it was given.
    await repo.insertChunks(
      record.id,
      chunks.map((content, i) => ({ content, embedding: embeddings[i] }))
    );

    await repo.updateStatus(record.id, 'ready');

    return {
      id: record.id,
      name: record.name,
      status: 'ready',
      sourceUrl: knowledgeBase.url,
      chunkCount: chunks.length,
    };
  } catch (err) {
    logger.error(`Knowledge base ingestion failed (id=${record.id}): ${err.message}`);
    await repo.updateStatus(record.id, 'failed', err.message);
    throw err;
  }
}
