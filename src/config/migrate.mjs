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

    // Drop old table if it has the old schema (missing session_id column)
    await client.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_name = 'Call_History'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'Call_History' AND column_name = 'session_id'
        ) THEN
          DROP TABLE "Call_History";
        END IF;
      END $$;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "Call_History" (
        call_id           BIGSERIAL        PRIMARY KEY,
        session_id        TEXT             NOT NULL,
        agent_id          TEXT             NOT NULL,
        agent_name        TEXT,
        started_at        TIMESTAMPTZ      NOT NULL,
        ended_at          TIMESTAMPTZ,
        duration_seconds  DOUBLE PRECISION,
        status            TEXT             NOT NULL DEFAULT 'unknown',
        last_node         TEXT,
        turns             INTEGER          DEFAULT 0,
        prompt_tokens     BIGINT           DEFAULT 0,
        completion_tokens BIGINT           DEFAULT 0,
        total_tokens      BIGINT           DEFAULT 0,
        tts_characters    BIGINT           DEFAULT 0,
        avg_llm_ttfb_ms   DOUBLE PRECISION,
        avg_tts_ttfb_ms   DOUBLE PRECISION,
        error             TEXT,
        created_at        TIMESTAMPTZ      NOT NULL DEFAULT now()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_call_history_session
        ON "Call_History" (session_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_call_history_agent_id
        ON "Call_History" (agent_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_call_history_agent_name
        ON "Call_History" (agent_name);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_call_history_status
        ON "Call_History" (status);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_call_history_started_at
        ON "Call_History" (started_at DESC);
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
