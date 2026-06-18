import pool from './db.mjs';
import logger from './logger.mjs';

export async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create the ENUM type only if it doesn't already exist
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE call_result AS ENUM ('completed', 'onCall', 'failed');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    // Create the table only if it doesn't already exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Call_History" (
        call_id    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_name VARCHAR(255)  NOT NULL,
        result     call_result   NOT NULL,
        duration   INTEGER       NOT NULL,  -- call duration in seconds
        call_time  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      );
    `);

    // Indexes (IF NOT EXISTS is safe to re-run)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_call_history_agent
        ON "Call_History" (agent_name);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_call_history_result
        ON "Call_History" (result);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_call_history_time
        ON "Call_History" (call_time DESC);
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
