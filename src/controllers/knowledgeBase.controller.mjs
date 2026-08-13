import * as ingestionService from '../services/knowledgeBase/ingestionService.mjs';
import * as repo from '../repositories/agentKnowledgeBase.repository.mjs';
import { sendSuccess, sendCreated, sendError, createError, HTTP_STATUS } from '../utils/response.mjs';
import logger from '../config/logger.mjs';

// POST /api/knowledge-bases — scrapes a URL or extracts an uploaded PDF/CSV, chunks
// it, embeds every chunk, and stores the result (see ingestionService.mjs for the
// full pipeline). Runs synchronously: the response only comes back once ingestion
// finishes (status 'ready') or fails (status 'failed', error surfaced below).
export async function createKnowledgeBase(req, res) {
  console.log('POST /api/knowledge-bases payload:', JSON.stringify(req.body, null, 2));
  if (req.file) {
    console.log('POST /api/knowledge-bases file:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });
  }

  const { name, knowledgeBase } = req.body;

  try {
    const result = await ingestionService.createAgentKnowledgeBase({
      name,
      knowledgeBase,
      file: req.file, // only set for knowledgeBase.type === 'file'
    });
    sendCreated(res, result);
  } catch (err) {
    logger.error(`createKnowledgeBase: ${err.message}`);
    sendError(res, err);
  }
}

// GET /api/knowledge-bases — list, newest first. See
// agentKnowledgeBase.repository.mjs#listKnowledgeBases for the exact shape.
export async function listKnowledgeBases(req, res) {
  try {
    const data = await repo.listKnowledgeBases();
    sendSuccess(res, data);
  } catch (err) {
    logger.error(`listKnowledgeBases: ${err.message}`);
    sendError(res, err);
  }
}

// GET /api/knowledge-bases/:id
export async function getKnowledgeBaseById(req, res) {
  try {
    const knowledgeBase = await repo.getKnowledgeBaseById(req.params.id);
    if (!knowledgeBase) {
      throw createError('Knowledge base not found', HTTP_STATUS.NOT_FOUND);
    }
    sendSuccess(res, knowledgeBase);
  } catch (err) {
    logger.error(`getKnowledgeBaseById: ${err.message}`);
    sendError(res, err);
  }
}
