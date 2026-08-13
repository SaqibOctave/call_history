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

// GET /api/knowledge-bases?search=&limit=&page= — paginated + searchable list,
// newest first. Same pagination convention as GET /api/agents
// (agent.service.mjs#getAllAgents): 1-indexed `page`, `limit` capped at 100,
// response shaped as { data, pagination: { total, limit, page, totalPages } }.
// `search` matches against the knowledge base's name (case-insensitive substring).
export async function listKnowledgeBases(req, res) {
  try {
    const limit = Math.min(parseInt(req.query.limit ?? 25, 10), 100);
    const page  = Math.max(parseInt(req.query.page  ?? 1,  10), 1);

    if (Number.isNaN(limit) || Number.isNaN(page)) {
      throw createError('limit and page must be numbers', HTTP_STATUS.BAD_REQUEST);
    }

    const search = req.query.search?.trim() || null;
    const offset = (page - 1) * limit;

    const { data, total } = await repo.listKnowledgeBases({ limit, offset, search });

    sendSuccess(res, {
      data,
      pagination: { total, limit, page, totalPages: Math.ceil(total / limit) },
    });
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

// DELETE /api/knowledge-bases/:id — removes the knowledge base row; its chunks go
// with it via ON DELETE CASCADE (see the FK in migrate.mjs), so nothing else to clean
// up here. 404s if the id doesn't exist rather than silently no-op'ing.
export async function deleteKnowledgeBase(req, res) {
  try {
    const deleted = await repo.deleteKnowledgeBase(req.params.id);
    if (!deleted) {
      throw createError('Knowledge base not found', HTTP_STATUS.NOT_FOUND);
    }
    sendSuccess(res, { message: 'Knowledge base deleted', id: req.params.id });
  } catch (err) {
    logger.error(`deleteKnowledgeBase: ${err.message}`);
    sendError(res, err);
  }
}
