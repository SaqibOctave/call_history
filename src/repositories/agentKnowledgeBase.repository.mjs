import pool from '../config/db.mjs';
import pgvector from 'pgvector';

// ── DB writes disabled for now ──────────────────────────────────────────────
// The pgvector extension isn't installed on the Postgres server yet (see the
// "Skipping pgvector migrations" warning at startup / migrate.mjs), so
// "AgentKnowledgeBases"/"AgentKnowledgeChunks" don't exist and any INSERT/UPDATE
// against them would just throw. Every function below logs what it WOULD have
// written instead of writing it, so the ingestion pipeline (scrape -> chunk ->
// embed) can still be exercised end-to-end and inspected via console.
//
// Once `CREATE EXTENSION vector` succeeds on that Postgres instance (install
// pgvector on the DB host, then restart this app so migrate.mjs re-runs), swap
// each function body back to the commented-out pool query below it.

// Creates the tracking row for one ingestion request (status starts 'pending') so
// there's a record of it even if scraping/embedding fails partway through — the
// service layer moves it through 'scraping' -> 'embedding' -> 'ready'/'failed' via
// updateStatus() as the pipeline progresses.
export async function createKnowledgeBase({ name, config, sourceType, sourceUrl }) {
  console.log('[DB write skipped] would INSERT INTO "AgentKnowledgeBases":', {
    name,
    config,
    source_type: sourceType,
    source_url: sourceUrl,
    status: 'pending',
  });

  // Fake row shaped like what RETURNING would give back, so the rest of the
  // pipeline (updateStatus/insertChunks calls, response payload) still works.
  return { id: `preview-${Date.now()}`, name, config, source_type: sourceType, source_url: sourceUrl, status: 'pending' };

  // UNCOMMENT after pgvector is installed and migrations have created the tables:
  //
  // const { rows } = await pool.query(
  //   `
  //   INSERT INTO "AgentKnowledgeBases" (name, config, source_type, source_url)
  //   VALUES ($1, $2, $3, $4)
  //   RETURNING id, name, config, source_type, source_url, status, created_at
  //   `,
  //   [name, config, sourceType, sourceUrl]
  // );
  // return rows[0];
}

export async function updateStatus(id, status, error = null) {
  console.log(`[DB write skipped] would UPDATE "AgentKnowledgeBases" id=${id}:`, { status, error });

  // UNCOMMENT after pgvector is installed and migrations have created the tables:
  //
  // await pool.query(
  //   `UPDATE "AgentKnowledgeBases" SET status = $2, error = $3, updated_at = now() WHERE id = $1`,
  //   [id, status, error]
  // );
}

// chunks: [{ content: string, embedding: number[] }, ...], already in chunk order.
export async function insertChunks(knowledgeBaseId, chunks) {
  console.log(`[DB write skipped] would INSERT ${chunks.length} rows into "AgentKnowledgeChunks" for knowledge_base_id=${knowledgeBaseId}:`);
  chunks.forEach((chunk, index) => {
    console.log(`  chunk[${index}]`, {
      content_preview: chunk.content.length > 120 ? `${chunk.content.slice(0, 120)}…` : chunk.content,
      content_length: chunk.content.length,
      embedding_dimensions: chunk.embedding.length,
      embedding_preview: chunk.embedding.slice(0, 5),
    });
  });

  // UNCOMMENT after pgvector is installed and migrations have created the tables.
  // Runs as one transaction so a failure partway through doesn't leave a knowledge
  // base with only some of its chunks stored.
  //
  // const client = await pool.connect();
  // try {
  //   await client.query('BEGIN');
  //
  //   for (const [index, chunk] of chunks.entries()) {
  //     await client.query(
  //       `
  //       INSERT INTO "AgentKnowledgeChunks" (knowledge_base_id, chunk_index, content, embedding)
  //       VALUES ($1, $2, $3, $4)
  //       `,
  //       [
  //         knowledgeBaseId,
  //         index,
  //         chunk.content,
  //         // pgvector.toSql turns [0.1, -0.2, ...] into the '[0.1,-0.2,...]' text
  //         // format the `vector` column type expects on input.
  //         pgvector.toSql(chunk.embedding),
  //       ]
  //     );
  //   }
  //
  //   await client.query('COMMIT');
  // } catch (err) {
  //   await client.query('ROLLBACK');
  //   throw err;
  // } finally {
  //   client.release();
  // }
}
