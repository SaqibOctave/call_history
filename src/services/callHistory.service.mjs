import CallResult from '../config/call_result.enum.mjs';
import * as repo from '../repositories/callHistory.repository.mjs';
import { HTTP_STATUS, createError } from '../utils/response.mjs';

const VALID_RESULTS = Object.values(CallResult);
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function createCall(data) {
  const { agent_name, result, duration, call_time } = data;

  if (!agent_name || typeof agent_name !== 'string') {
    throw createError('agent_name is required', HTTP_STATUS.BAD_REQUEST);
  }
  if (!VALID_RESULTS.includes(result)) {
    throw createError(`result must be one of: ${VALID_RESULTS.join(', ')}`, HTTP_STATUS.BAD_REQUEST);
  }
  if (!Number.isInteger(duration) || duration < 0) {
    throw createError('duration must be a non-negative integer (seconds)', HTTP_STATUS.BAD_REQUEST);
  }

  return repo.insertCall({ agent_name: agent_name.trim(), result, duration, call_time });
}

export async function getAllCalls(query) {
  const limit = Math.min(parseInt(query.limit ?? 25, 10), 100);
  const page  = Math.max(parseInt(query.page  ?? 1,  10), 1);

  if (isNaN(limit) || isNaN(page)) {
    throw createError('limit and page must be numbers', HTTP_STATUS.BAD_REQUEST);
  }

  const offset     = (page - 1) * limit;
  const call_id    = query.call_id    ?? null;
  const result     = query.result     ?? null;
  const agent_name = query.agent_name ?? null;

  if (call_id && !UUID_REGEX.test(call_id)) {
    throw createError('Invalid call_id format', HTTP_STATUS.BAD_REQUEST);
  }
  if (result && !VALID_RESULTS.includes(result)) {
    throw createError(`result must be one of: ${VALID_RESULTS.join(', ')}`, HTTP_STATUS.BAD_REQUEST);
  }

  const { data, total } = await repo.findAllCalls({ limit, offset, call_id, result, agent_name });

  return {
    data,
    pagination: {
      total,
      limit,
      page,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getCallById(id) {
  if (!UUID_REGEX.test(id)) {
    throw createError('Invalid call ID format', HTTP_STATUS.BAD_REQUEST);
  }

  const call = await repo.findCallById(id);
  if (!call) throw createError('Call not found', HTTP_STATUS.NOT_FOUND);
  return call;
}

export async function deleteCall(id) {
  if (!UUID_REGEX.test(id)) {
    throw createError('Invalid call ID format', HTTP_STATUS.BAD_REQUEST);
  }

  const deleted = await repo.deleteCallById(id);
  if (!deleted) throw createError('Call not found', HTTP_STATUS.NOT_FOUND);
  return deleted;
}
