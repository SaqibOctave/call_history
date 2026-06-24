import pool from '../config/db.mjs';

const SCRUB_KEYS = `- 'flow_code' - 'flow_path'`;
// Strip every provider API key from the config before it leaves the API —
// covers the STT→LLM→TTS pipeline keys and the speech-to-speech provider keys.
const SCRUB_CONFIG =
  `- 'OPENAI_API_KEY' - 'CARTESIA_API_KEY' - 'DEEPGRAM_API_KEY'` +
  ` - 'GOOGLE_API_KEY' - 'AWS_SECRET_ACCESS_KEY' - 'AZURE_API_KEY'` +
  ` - 'XAI_API_KEY' - 'INWORLD_API_KEY' - 'GROQ_API_KEY'` +
  ` - 'ANTHROPIC_API_KEY' - 'ELEVENLABS_API_KEY' - 'ASSEMBLYAI_API_KEY'` +
  ` - 'GLADIA_API_KEY'`;

// Projection for one agents table, tagged with a `kind` discriminator so the
// frontend knows which manager route prefix to use for mutations. `agents` →
// 'pipeline' (STT→LLM→TTS), `sts_agents` → 's2s' (speech-to-speech, /STS/*).
const agentProjection = (table, kind) => `
  SELECT
    (to_jsonb(a) ${SCRUB_KEYS})
    || jsonb_build_object(
      'config',
      COALESCE(a.config::jsonb, '{}'::jsonb) ${SCRUB_CONFIG}
    )
    || jsonb_build_object('kind', '${kind}') AS agent,
    a.created_at AS created_at
  FROM ${table} a
`;

const KIND_TABLE = { pipeline: 'agents', s2s: 'sts_agents' };

export async function findAllAgents({ limit, offset, status, name, kind }) {
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

  // When `kind` is specified, query only the relevant table; otherwise union both.
  const tables = kind
    ? [[KIND_TABLE[kind], kind]]
    : [['agents', 'pipeline'], ['sts_agents', 's2s']];

  const projections = tables
    .map(([table, k]) => `${agentProjection(table, k)} ${where}`)
    .join('\n    UNION ALL\n    ');

  const countExprs = tables
    .map(([table]) => `(SELECT COUNT(*) FROM ${table} a ${where})`)
    .join(' + ');

  const [countRes, dataRes] = await Promise.all([
    pool.query(`SELECT ${countExprs} AS count`, values),
    pool.query(
      `
      SELECT agent FROM (${projections}) AS combined
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
  // Look in the pipeline table first, then the speech-to-speech table.
  for (const [table, kind] of [['agents', 'pipeline'], ['sts_agents', 's2s']]) {
    const { rows } = await pool.query(
      `SELECT agent FROM (${agentProjection(table, kind)} WHERE a.id = $1) AS t`,
      [agent_id]
    );
    if (rows[0]?.agent) return rows[0].agent;
  }
  return null;
}