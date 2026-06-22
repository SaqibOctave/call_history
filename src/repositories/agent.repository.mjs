import pool from '../config/db.mjs';


export async function findAllAgents({ limit, offset, status, name }) {
  const conditions = [];
  const values = [];
  let idx = 1;

  if (status) {
    conditions.push(`status = $${idx++}`);
    values.push(status);
  }

  if (name) {
    conditions.push(`name ILIKE $${idx++}`);
    values.push(`%${name}%`);
  }


  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  // const [countRes, dataRes] = await Promise.all([
  //   pool.query(`SELECT COUNT(*) FROM "agents" ${where}`, values),
  //   pool.query(
  //     `SELECT *
  //      FROM "agents" ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
  //     [...values, limit, offset]
  //   ),
  // ]);

  const [countRes, dataRes] = await Promise.all([
    pool.query(
      `SELECT COUNT(*) FROM agents ${where}`,
      values
    ),
    // pool.query(
    //   `
    //   SELECT
    //     to_jsonb(a) - 'flow_code' - 'flow_path'  AS agent
    //   FROM agents a
    //   ${where}
    //   ORDER BY created_at DESC
    //   LIMIT $${idx++}
    //   OFFSET $${idx++}
    //   `,
    //   [...values, limit, offset]
    // ),

    pool.query(
      `
  SELECT
    (
      to_jsonb(a)
      - 'flow_code'
      - 'flow_path'
    )
    || jsonb_build_object(
      'config',
      COALESCE(a.config::jsonb, '{}'::jsonb)
        - 'OPENAI_API_KEY'
        - 'CARTESIA_API_KEY'
        - 'DEEPGRAM_API_KEY'
    ) AS agent
  FROM agents a
  ${where}
  ORDER BY created_at DESC
  LIMIT $${idx++}
  OFFSET $${idx++}
  `,
      [...values, limit, offset]
    )
  ]);

  return {
    data: dataRes.rows,
    total: parseInt(countRes.rows[0].count, 10),
  };
}

export async function findAgentById(agent_id) {
  const { rows } = await pool.query(
    `SELECT *
     FROM "agents" WHERE id = $1`,
    [agent_id]
  );
  return rows[0] ?? null;
}