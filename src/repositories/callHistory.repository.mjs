import pool from '../config/db.mjs';

export async function insertCall(data) {
  const {
    session_id, agent_id, agent_name, started_at, ended_at,
    duration_seconds, status, last_node, turns,
    prompt_tokens, completion_tokens, total_tokens,
    tts_characters, avg_llm_ttfb_ms, avg_tts_ttfb_ms, error,
  } = data;

  const { rows } = await pool.query(
    `INSERT INTO "Call_History" (
        session_id, agent_id, agent_name, started_at, ended_at,
        duration_seconds, status, last_node, turns,
        prompt_tokens, completion_tokens, total_tokens,
        tts_characters, avg_llm_ttfb_ms, avg_tts_ttfb_ms, error
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11, $12,
        $13, $14, $15, $16
      ) RETURNING *`,
    [
      session_id, agent_id, agent_name ?? null, started_at, ended_at ?? null,
      duration_seconds ?? null, status ?? 'unknown', last_node ?? null, turns ?? 0,
      prompt_tokens ?? 0, completion_tokens ?? 0, total_tokens ?? 0,
      tts_characters ?? 0, avg_llm_ttfb_ms ?? null, avg_tts_ttfb_ms ?? null, error ?? null,
    ]
  );
  return rows[0];
}

export async function findAllCalls({ limit, offset, agent_id, agent_name, status, from_time, to_time }) {
  const conditions = [];
  const values = [];
  let idx = 1;

  if (agent_id) {
    conditions.push(`agent_id = $${idx++}`);
    values.push(agent_id);
  }
  if (agent_name) {
    conditions.push(`agent_name ILIKE $${idx++}`);
    values.push(`%${agent_name}%`);
  }
  if (status) {
    conditions.push(`status = $${idx++}`);
    values.push(status);
  }
  if (from_time) {
    conditions.push(`started_at >= $${idx++}`);
    values.push(from_time);
  }
  if (to_time) {
    conditions.push(`started_at <= $${idx++}`);
    values.push(to_time);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [countRes, dataRes] = await Promise.all([
    pool.query(`SELECT COUNT(*) FROM "Call_History" ${where}`, values),
    pool.query(
      `SELECT * FROM "Call_History" ${where} ORDER BY started_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...values, limit, offset]
    ),
  ]);

  return {
    data: dataRes.rows,
    total: parseInt(countRes.rows[0].count, 10),
  };
}

export async function findCallById(call_id) {
  const { rows } = await pool.query(
    `SELECT * FROM "Call_History" WHERE call_id = $1`,
    [call_id]
  );
  return rows[0] ?? null;
}

export async function deleteCallById(call_id) {
  const { rows } = await pool.query(
    `DELETE FROM "Call_History" WHERE call_id = $1 RETURNING *`,
    [call_id]
  );
  return rows[0] ?? null;
}
