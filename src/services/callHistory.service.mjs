import CallResult from '../config/call_result.enum.mjs';
import * as repo from '../repositories/callHistory.repository.mjs';

const VALID_RESULTS = Object.values(CallResult);

export async function createCall(data) {
  console.log('Creating call with data:', data);
  const { agent_name, result, duration, call_time } = data;

  if (!agent_name || typeof agent_name !== 'string') {
    throw Object.assign(new Error('agent_name is required'), { status: 400 });
  }
  if (!VALID_RESULTS.includes(result)) {
    throw Object.assign(
      new Error(`result must be one of: ${VALID_RESULTS.join(', ')}`),
      { status: 400 }
    );
  }
  if (!Number.isInteger(duration) || duration < 0) {
    throw Object.assign(
      new Error('duration must be a non-negative integer (seconds)'),
      { status: 400 }
    );
  }

  return repo.insertCall({ agent_name: agent_name.trim(), result, duration, call_time });
}

export async function getAllCalls(query) {
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const limit = Math.min(parseInt(query.limit ?? 25, 10), 100);
  const page  = Math.max(parseInt(query.page  ?? 1,  10), 1);

  if (isNaN(limit) || isNaN(page)) {
    throw Object.assign(new Error('limit and page must be numbers'), { status: 400 });
  }

  const offset = (page - 1) * limit;

  const call_id    = query.call_id    ?? null;
  const result     = query.result     ?? null;
  const agent_name = query.agent_name ?? null;

  if (call_id && !UUID_REGEX.test(call_id)) {
    throw Object.assign(new Error('Invalid call_id format'), { status: 400 });
  }
  if (result && !VALID_RESULTS.includes(result)) {
    throw Object.assign(
      new Error(`result must be one of: ${VALID_RESULTS.join(', ')}`),
      { status: 400 }
    );
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
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_REGEX.test(id)) {
    throw Object.assign(new Error('Invalid call ID format'), { status: 400 });
  }

  const call = await repo.findCallById(id);
  if (!call) {
    throw Object.assign(new Error('Call not found'), { status: 404 });
  }
  return call;
}
