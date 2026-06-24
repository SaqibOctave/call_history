import pool from '../config/db.mjs';

const REPORT_TIMEZONE = process.env.REPORT_TIMEZONE || 'UTC';

export async function totalCallsInWindow(from, to) {
  const { rows } = await pool.query(
    `SELECT
       DATE(started_at AT TIME ZONE $3) AS date,
       COUNT(*)::int                    AS count
     FROM "Call_History"
     WHERE started_at >= $1
       AND started_at <= $2
     GROUP BY DATE(started_at AT TIME ZONE $3)
     ORDER BY date ASC`,
    [from, to, REPORT_TIMEZONE]
  );
  return rows;
}

export async function avgTtsLatencyInWindow(from, to) {
  const { rows } = await pool.query(
    `SELECT
       COUNT(*)::int                                       AS total_calls,
       COALESCE(SUM(avg_tts_ttfb_ms), 0)::float          AS total_tts_ttfb_ms,
       COALESCE(AVG(avg_tts_ttfb_ms), 0)::float          AS avg_tts_ttfb_ms
     FROM "Call_History"
     WHERE started_at >= $1
       AND started_at <= $2
       AND avg_tts_ttfb_ms IS NOT NULL`,
    [from, to]
  );
  return rows[0];
}

export async function avgLlmLatencyInWindow(from, to) {
  const { rows } = await pool.query(
    `SELECT
       COUNT(*)::int                                  AS total_calls,
       COALESCE(AVG(avg_llm_ttfb_ms), 0)::float     AS avg_llm_ttfb_ms
     FROM "Call_History"
     WHERE started_at >= $1
       AND started_at <= $2
       AND avg_llm_ttfb_ms IS NOT NULL`,
    [from, to]
  );
  return rows[0];
}

export async function usageTotalsInWindow(from, to) {
  const { rows } = await pool.query(
    `SELECT
       COALESCE(SUM(tts_characters),    0)::int AS total_tts_characters,
       COALESCE(SUM(completion_tokens), 0)::int AS total_completion_tokens,
       COALESCE(SUM(prompt_tokens),     0)::int AS total_prompt_tokens
     FROM "Call_History"
     WHERE started_at >= $1
       AND started_at <= $2`,
    [from, to]
  );
  return rows[0];
}

export async function callsByAgentInWindow(from, to) {
  const { rows } = await pool.query(
    `SELECT
       agent_id,
       agent_name,
       COUNT(*)::int AS total_calls
     FROM "Call_History"
     WHERE started_at >= $1
       AND started_at <= $2
     GROUP BY agent_id, agent_name
     ORDER BY total_calls DESC`,
    [from, to]
  );
  return rows;
}

export async function conversationQualityInWindow(from, to) {
  const { rows } = await pool.query(
    `SELECT
       COUNT(*)::int                                                        AS total_calls,
       COALESCE(SUM(turns), 0)::int                                        AS total_turns,
       COALESCE(AVG(turns), 0)::float                                      AS avg_turns,
       COALESCE(SUM(duration_seconds), 0)::float                          AS total_duration_seconds,
       COALESCE(AVG(duration_seconds), 0)::float                          AS avg_duration_seconds,
       COUNT(*) FILTER (WHERE status = 'failed')::int                     AS failed_calls,
       COUNT(*) FILTER (WHERE status = 'completed')::int                  AS completed_calls
     FROM "Call_History"
     WHERE started_at >= $1
       AND started_at <= $2`,
    [from, to]
  );
  return rows[0];
}

export async function agentStatus(kind) {
  const table = kind === 's2s' ? 'sts_agents' : 'agents';
  const { rows } = await pool.query(
    `SELECT
       (SELECT COUNT(*)::int FROM ${table})   AS active_agents,
       COUNT(DISTINCT ch.agent_id)::int       AS on_call_agents
     FROM "Call_History" ch
     WHERE ch.status = 'onCall'
       AND ch.agent_id IN (SELECT id FROM ${table})`
  );
  return rows[0];
}

export async function callStatsInWindow(from, to, kind) {
  const table = kind === 's2s' ? 'sts_agents' : 'agents';
  const { rows } = await pool.query(
    `SELECT
       COUNT(*)::int                                          AS total_calls,
       COUNT(*) FILTER (WHERE status = 'failed')::int       AS failed_calls,
       COALESCE(AVG(avg_llm_ttfb_ms), 0)::float            AS avg_llm_ttfb_ms
     FROM "Call_History"
     WHERE started_at >= $1
       AND started_at <= $2
       AND agent_id IN (SELECT id FROM ${table})`,
    [from, to]
  );
  return rows[0];
}

export async function pipelineAgentLiveStatus(from, to, limit) {
  const { rows } = await pool.query(
    `SELECT
       a.name,
       a.status,
       a.port,
       COUNT(ch.call_id)::int                       AS calls_today,
       COALESCE(AVG(ch.avg_tts_ttfb_ms), 0)::float AS avg_ttfb_ms
     FROM agents a
     LEFT JOIN "Call_History" ch
       ON ch.agent_id = a.id
      AND ch.started_at >= $1
      AND ch.started_at <= $2
     GROUP BY a.id, a.name, a.status, a.port
     ORDER BY calls_today DESC
     LIMIT $3`,
    [from, to, limit]
  );
  return rows;
}

export async function s2sAgentLiveStatus(from, to, limit) {
  const { rows } = await pool.query(
    `SELECT
       a.name,
       a.status,
       a.port,
       COUNT(s.id)::int                             AS calls_today,
       COALESCE(AVG(s.avg_llm_ttfb_ms), 0)::float AS avg_ttfb_ms
     FROM sts_agents a
     LEFT JOIN sts_agent_stats s
       ON s.agent_id = a.id
      AND s.started_at >= $1
      AND s.started_at <= $2
     GROUP BY a.id, a.name, a.status, a.port
     ORDER BY calls_today DESC
     LIMIT $3`,
    [from, to, limit]
  );
  return rows;
}

export async function callCountsByStatusInWindow(from, to) {
  const { rows } = await pool.query(
    `SELECT
       status,
       COUNT(*)::int AS count
     FROM "Call_History"
     WHERE started_at >= $1
       AND started_at <= $2
     GROUP BY status`,
    [from, to]
  );
  return rows;
}
