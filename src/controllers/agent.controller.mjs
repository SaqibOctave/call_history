
import * as service from '../services/agent.service.mjs';
import * as knowledgeBaseService from '../services/knowledgeBase/ingestionService.mjs';
import { sendSuccess, sendCreated, sendError } from '../utils/response.mjs';
import logger from '../config/logger.mjs';


export async function getAllAgents(req, res) {
  try {
    const result = await service.getAllAgents(req.query);
    sendSuccess(res, result);
  } catch (err) {
    logger.error(`getAllAgents: ${err.message}`);
    sendError(res, err);
  }
}

export async function getAgentById(req, res) {
  try {
    const agent = await service.getAgentById(req.params.id);
    sendSuccess(res, agent);
  } catch (err) {
    logger.error(`getAgentById: ${err.message}`);
    sendError(res, err);
  }
}

// Logged for visibility while this endpoint is still evolving (e.g. no auth/agent
// persistence wired up yet) — cheap to keep once it's not needed anymore.
export async function createAgent(req, res) {
  console.log('POST /api/agents payload:', JSON.stringify(req.body, null, 2));

  const { name, config, knowledgeBase } = req.body;

  // No knowledgeBase in the payload => nothing to scrape/embed yet, just echo it back.
  if (!knowledgeBase) {
    return sendCreated(res, { message: 'Payload received (not persisted)', data: req.body });
  }

  try {
    const result = await knowledgeBaseService.createAgentKnowledgeBase({ name, config, knowledgeBase });
    sendCreated(res, { message: 'Knowledge base scraped, embedded, and stored', data: result });
  } catch (err) {
    logger.error(`createAgent (knowledge base ingestion): ${err.message}`);
    sendError(res, err);
  }
}