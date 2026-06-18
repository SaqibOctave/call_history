import pool from '../config/db.mjs';

export async function insertCall({ agent_name, result, duration, call_time }) {
  const { rows } = await pool.query(
    `INSERT INTO "Call_History" (agent_name, result, duration, call_time)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [agent_name, result, duration, call_time ?? new Date()]
  );
  return rows[0];
}

export async function findAllCalls({ limit, offset, call_id, result, agent_name }) {
  const conditions = [];
  const values = [];
  let idx = 1;

  if (call_id) {
    conditions.push(`call_id = $${idx++}`);
    values.push(call_id);
  }
  if (result) {
    conditions.push(`result = $${idx++}`);
    values.push(result);
  }
  if (agent_name) {
    conditions.push(`agent_name ILIKE $${idx++}`);
    values.push(`%${agent_name}%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [countRes, dataRes] = await Promise.all([
    pool.query(`SELECT COUNT(*) FROM "Call_History" ${where}`, values),
    pool.query(
      `SELECT * FROM "Call_History" ${where} ORDER BY call_time DESC LIMIT $${idx++} OFFSET $${idx++}`,
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
