import pool from '../config/db.mjs';

export async function totalCallsInWindow(from, to) {
  const { rows } = await pool.query(
    `SELECT
       DATE(started_at AT TIME ZONE 'UTC') AS date,
       COUNT(*)::int                       AS count
     FROM "Call_History"
     WHERE started_at >= $1
       AND started_at <= $2
     GROUP BY DATE(started_at AT TIME ZONE 'UTC')
     ORDER BY date ASC`,
    [from, to]
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
