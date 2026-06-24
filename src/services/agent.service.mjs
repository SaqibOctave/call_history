
import * as repo from '../repositories/agent.repository.mjs';
import { HTTP_STATUS, createError } from '../utils/response.mjs';

const VALID_STATUSES = ['running', 'inactive'];
const VALID_KINDS    = ['pipeline', 's2s'];

function parseAgentId(idParam) {
  const id = parseInt(idParam, 10);
  if (isNaN(id) || id <= 0) {
    throw createError('agent_id must be a positive integer', HTTP_STATUS.BAD_REQUEST);
  }
  return id;
}

export async function getAllAgents(query) {
  const limit = Math.min(parseInt(query.limit ?? 25, 10), 100);
  const page  = Math.max(parseInt(query.page  ?? 1,  10), 1);

  if (isNaN(limit) || isNaN(page)) {
    throw createError('limit and page must be numbers', HTTP_STATUS.BAD_REQUEST);
  }

  const status = query.status ?? null;
  if (status !== null && !VALID_STATUSES.includes(status)) {
    throw createError(`status must be one of: ${VALID_STATUSES.join(', ')}`, HTTP_STATUS.BAD_REQUEST);
  }

  const name = query.name ?? null;

  const kind = query.kind ?? null;
  if (kind !== null && !VALID_KINDS.includes(kind)) {
    throw createError(`kind must be one of: ${VALID_KINDS.join(', ')}`, HTTP_STATUS.BAD_REQUEST);
  }

  const offset = (page - 1) * limit;
  const { data, total } = await repo.findAllAgents({ limit, offset, status, name, kind });

  return {
    data,
    pagination: { total, limit, page, totalPages: Math.ceil(total / limit) },
  };
}

export async function getAgentById(idParam) {
  // const id    = parseAgentId(idParam);
  const agent = await repo.findAgentById(idParam);
  if (!agent) throw createError('Agent not found', HTTP_STATUS.NOT_FOUND);
  return agent;
}
