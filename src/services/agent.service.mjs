
import * as repo from '../repositories/agent.repository.mjs';
import { HTTP_STATUS, createError } from '../utils/response.mjs';

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

  const status              = query.status              ?? null;
  const name = query.name ?? null;


  const offset = (page - 1) * limit;
  const { data, total } = await repo.findAllAgents({ limit, offset, status, name });

  return {
    data,
    pagination: { total, limit, page, totalPages: Math.ceil(total / limit) },
  };
}





export async function getAgentById(idParam) {
//   const id   = parseAgentId(idParam);
  const agent = await repo.findAgentById(idParam);
  if (!agent) throw createError('Agent not found', HTTP_STATUS.NOT_FOUND);
  return agent;
}