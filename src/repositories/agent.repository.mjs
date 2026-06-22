import pool from '../config/db.mjs';

const SCRUB_KEYS = `- 'flow_code' - 'flow_path'`;
const SCRUB_CONFIG = `- 'OPENAI_API_KEY' - 'CARTESIA_API_KEY' - 'DEEPGRAM_API_KEY'`;

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

  const [countRes, dataRes] = await Promise.all([
    pool.query(`SELECT COUNT(*) FROM agents ${where}`, values),
    pool.query(
      `
      SELECT
        (to_jsonb(a) ${SCRUB_KEYS})
        || jsonb_build_object(
          'config',
          COALESCE(a.config::jsonb, '{}'::jsonb) ${SCRUB_CONFIG}
        ) AS agent
      FROM agents a
      ${where}
      ORDER BY created_at DESC
      LIMIT $${idx++}
      OFFSET $${idx++}
      `,
      [...values, limit, offset]
    ),
  ]);

  return {
    data: dataRes.rows.map(r => r.agent),
    total: parseInt(countRes.rows[0].count, 10),
  };
}

export async function findAgentById(agent_id) {
  const { rows } = await pool.query(
    `
    SELECT
      (to_jsonb(a) ${SCRUB_KEYS})
      || jsonb_build_object(
        'config',
        COALESCE(a.config::jsonb, '{}'::jsonb) ${SCRUB_CONFIG}
      ) AS agent
    FROM agents a
    WHERE a.id = $1
    `,
    [agent_id]
  );
  return rows[0]?.agent ?? null;
}