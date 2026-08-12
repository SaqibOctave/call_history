import pool from './db.mjs';
import logger from './logger.mjs';

export async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Drop old ENUM type if it exists (no longer needed — status is TEXT)
    await client.query(`
      DO $$ BEGIN
        DROP TYPE IF EXISTS call_result;
      EXCEPTION WHEN others THEN NULL;
      END $$;
    `);

    // ── Call history is a VIEW, not a table ────────────────────────────────
    // pipecat-flows is the single writer of call stats: it writes pipeline
    // calls to `agent_stats` and speech-to-speech calls to `sts_agent_stats`
    // (same DB). This service historically read a standalone "Call_History"
    // table that nothing populated, so the UI was always empty. We now expose
    // "Call_History" as a UNION view over both real tables, tagged with a
    // `kind` discriminator and aliasing `id` → `call_id` so every existing
    // query/report keeps working unchanged. S2S has no TTS stage, so its
    // tts_characters/avg_tts_ttfb_ms are surfaced as 0/NULL.
    //
    // The base tables are owned by pipecat-flows; only build the view once
    // both exist, so this service can start before pipecat has migrated.
    // await client.query(`DROP TABLE IF EXISTS "Call_History" CASCADE;`);

    const { rows: baseTables } = await client.query(`
      SELECT COUNT(*)::int AS n FROM information_schema.tables
      WHERE table_name IN ('agent_stats', 'sts_agent_stats');
    `);

    if (baseTables[0].n === 2) {
      await client.query(`
        CREATE OR REPLACE VIEW "Call_History" AS
          SELECT id AS call_id, session_id, agent_id, agent_name, started_at, ended_at,
                 duration_seconds, status, last_node, turns, prompt_tokens, completion_tokens,
                 total_tokens, tts_characters, avg_llm_ttfb_ms, avg_tts_ttfb_ms, error, created_at,
                 'pipeline' AS kind
          FROM agent_stats
          UNION ALL
          SELECT id AS call_id, session_id, agent_id, agent_name, started_at, ended_at,
                 duration_seconds, status, last_node, turns, prompt_tokens, completion_tokens,
                 total_tokens, 0::bigint AS tts_characters, avg_llm_ttfb_ms,
                 NULL::double precision AS avg_tts_ttfb_ms, error, created_at,
                 's2s' AS kind
          FROM sts_agent_stats;
      `);
      logger.info('Call_History view created over agent_stats + sts_agent_stats');
    } else {
      logger.warn(
        'Skipping Call_History view: agent_stats/sts_agent_stats not found yet ' +
        '(pipecat-flows must run first). Restart this service after they exist.'
      );
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS "Users" (
        user_id           BIGSERIAL    PRIMARY KEY,
        profile_pic       TEXT,
        first_name        TEXT         NOT NULL,
        last_name         TEXT         NOT NULL,
        username          TEXT         NOT NULL UNIQUE,
        email             TEXT         NOT NULL UNIQUE,
        password          TEXT         NOT NULL,
        role              TEXT         NOT NULL DEFAULT 'VIEWER',
        organization_name TEXT,
        created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
        updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email
        ON "Users" (email);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_username
        ON "Users" (username);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_role
        ON "Users" (role);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_organization
        ON "Users" (organization_name);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "RefreshTokens" (
        id         BIGSERIAL    PRIMARY KEY,
        user_id    BIGINT       NOT NULL REFERENCES "Users"(user_id) ON DELETE CASCADE,
        token      TEXT         NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ  NOT NULL,
        created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user
        ON "RefreshTokens" (user_id);
    `);

    await client.query('COMMIT');
    logger.info('Migrations applied successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
