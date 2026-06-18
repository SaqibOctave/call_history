import CallResult from '../config/call_result.enum.mjs';
import DateFilter from '../config/date_filter.enum.mjs';
import * as repo from '../repositories/callHistory.repository.mjs';
import { HTTP_STATUS, createError } from '../utils/response.mjs';

const VALID_STATUSES = Object.values(CallResult);
const VALID_FILTERS  = Object.values(DateFilter);

function resolveDateRange(filter) {
  const now   = new Date();
  const start = new Date(now);
  const end   = new Date(now);

  switch (filter) {
    case DateFilter.TODAY:
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case DateFilter.YESTERDAY:
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      break;
    case DateFilter.LAST_7_DAYS:
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      break;
    case DateFilter.LAST_30_DAYS:
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      break;
  }

  return { from_time: start, to_time: end };
}

function parseCallId(idParam) {
  const id = parseInt(idParam, 10);
  if (isNaN(id) || id <= 0) {
    throw createError('call_id must be a positive integer', HTTP_STATUS.BAD_REQUEST);
  }
  return id;
}

export async function createCall(data) {
  const { session_id, agent_id, started_at, status } = data;

  if (!session_id || typeof session_id !== 'string') {
    throw createError('session_id is required', HTTP_STATUS.BAD_REQUEST);
  }
  if (!agent_id || typeof agent_id !== 'string') {
    throw createError('agent_id is required', HTTP_STATUS.BAD_REQUEST);
  }
  if (!started_at) {
    throw createError('started_at is required', HTTP_STATUS.BAD_REQUEST);
  }
  if (status && !VALID_STATUSES.includes(status)) {
    throw createError(`status must be one of: ${VALID_STATUSES.join(', ')}`, HTTP_STATUS.BAD_REQUEST);
  }

  return repo.insertCall(data);
}

export async function getAllCalls(query) {
  const limit = Math.min(parseInt(query.limit ?? 25, 10), 100);
  const page  = Math.max(parseInt(query.page  ?? 1,  10), 1);

  if (isNaN(limit) || isNaN(page)) {
    throw createError('limit and page must be numbers', HTTP_STATUS.BAD_REQUEST);
  }

  const offset      = (page - 1) * limit;
  const agent_id    = query.agent_id    ?? null;
  const agent_name  = query.agent_name  ?? null;
  const status      = query.status      ?? null;
  const date_filter = query.date_filter ?? null;

  if (status && !VALID_STATUSES.includes(status)) {
    throw createError(`status must be one of: ${VALID_STATUSES.join(', ')}`, HTTP_STATUS.BAD_REQUEST);
  }
  if (date_filter && !VALID_FILTERS.includes(date_filter)) {
    throw createError(`date_filter must be one of: ${VALID_FILTERS.join(', ')}`, HTTP_STATUS.BAD_REQUEST);
  }

  const { from_time, to_time } = date_filter ? resolveDateRange(date_filter) : {};

  const { data, total } = await repo.findAllCalls({ limit, offset, agent_id, agent_name, status, from_time, to_time });

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

export async function getCallById(idParam) {
  const id   = parseCallId(idParam);
  const call = await repo.findCallById(id);
  if (!call) throw createError('Call not found', HTTP_STATUS.NOT_FOUND);
  return call;
}

export async function deleteCall(idParam) {
  const id      = parseCallId(idParam);
  const deleted = await repo.deleteCallById(id);
  if (!deleted) throw createError('Call not found', HTTP_STATUS.NOT_FOUND);
  return deleted;
}
