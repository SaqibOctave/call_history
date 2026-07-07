import pool from '../config/db.mjs';

// Read-only: "Call_History" is a view over pipecat-flows' agent_stats /
// sts_agent_stats tables (pipecat is the sole writer). See migrate.mjs.
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
