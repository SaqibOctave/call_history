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

  // Run separately from the block above, in its own transaction: pgvector is an
  // optional extension, and if it isn't installed on this Postgres instance we want
  // that to just disable knowledge-base ingestion, not block the whole app from
  // starting (unlike the migrations above, which the rest of the app depends on).
  await runVectorMigrations();
}

async function runVectorMigrations() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Adds the VECTOR column type + similarity operators used below. Requires the
    // pgvector extension to be installed on the Postgres server itself (not just
    // "available to create") — CREATE EXTENSION fails otherwise.
    await client.query(`CREATE EXTENSION IF NOT EXISTS vector;`);

    // One row per "create agent" request that included a knowledgeBase — holds the
    // agent name/config from the payload plus the ingestion job's status. This is
    // NOT the pipecat-owned "agents"/"sts_agents" table; it only tracks the
    // knowledge-base scrape → embed pipeline for now.
    await client.query(`
      CREATE TABLE IF NOT EXISTS "AgentKnowledgeBases" (
        id          BIGSERIAL    PRIMARY KEY,
        name        TEXT         NOT NULL,
        config      JSONB        NOT NULL DEFAULT '{}',
        source_type TEXT         NOT NULL,
        source_url  TEXT,
        status      TEXT         NOT NULL DEFAULT 'pending',
        error       TEXT,
        created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
        updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
      );
    `);

    // One row per chunk of scraped text, each with its own embedding vector.
    // VECTOR(1536) must match the output size of whichever embedding model
    // generates the vectors (text-embedding-3-small = 1536 dims — see
    // src/services/knowledgeBase/embedder.mjs). Changing the model later means
    // changing this column width too.
    await client.query(`
      CREATE TABLE IF NOT EXISTS "AgentKnowledgeChunks" (
        id                BIGSERIAL    PRIMARY KEY,
        knowledge_base_id BIGINT       NOT NULL REFERENCES "AgentKnowledgeBases"(id) ON DELETE CASCADE,
        chunk_index       INT          NOT NULL,
        content           TEXT         NOT NULL,
        embedding         VECTOR(1536) NOT NULL,
        created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
        UNIQUE (knowledge_base_id, chunk_index)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_agent_kb_chunks_kb
        ON "AgentKnowledgeChunks" (knowledge_base_id);
    `);

    // IVFFlat index for approximate-nearest-neighbor cosine search (the standard
    // similarity metric for OpenAI embeddings). It's fine to create this before any
    // data exists — it just won't be well-clustered until there's enough data to
    // REINDEX against; harmless either way on a table this size.
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_agent_kb_chunks_embedding
        ON "AgentKnowledgeChunks" USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100);
    `);

    await client.query('COMMIT');
    logger.info('pgvector migrations applied (AgentKnowledgeBases, AgentKnowledgeChunks)');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.warn(`Skipping pgvector migrations: ${err.message}`);
  } finally {
    client.release();
  }
}
