import pool from '../config/db.mjs';
import pgvector from 'pgvector';

// URL-sourced knowledge bases have no meaningful size in bytes — rather than
// returning `sizeBytes: null`, drop the key entirely so a url-type row has no
// sizeBytes field at all, same as a file-type row always does have one.
function omitNullSizeBytes(row) {
  if (row.sizeBytes == null) delete row.sizeBytes;
  return row;
}

// Creates the tracking row for one ingestion request (status starts 'pending') so
// there's a record of it even if scraping/embedding fails partway through — the
// service layer moves it through 'scraping'/'extracting' -> 'embedding' ->
// 'ready'/'failed' via updateStatus() as the pipeline progresses.
export async function createKnowledgeBase({ name, config, sourceType, sourceUrl, sizeBytes }) {
  const { rows } = await pool.query(
    `
    INSERT INTO "AgentKnowledgeBases" (name, config, source_type, source_url, size_bytes)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, name, config, source_type, source_url, size_bytes::int AS size_bytes, status, created_at
    `,
    [name, config, sourceType, sourceUrl, sizeBytes ?? null]
  );
  return rows[0];
}

export async function updateStatus(id, status, error = null) {
  await pool.query(
    `UPDATE "AgentKnowledgeBases" SET status = $2, error = $3, updated_at = now() WHERE id = $1`,
    [id, status, error]
  );
}

// chunks: [{ content: string, embedding: number[] }, ...], already in chunk order.
// Runs as one transaction so a failure partway through doesn't leave a knowledge
// base with only some of its chunks stored.
export async function insertChunks(knowledgeBaseId, chunks) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const [index, chunk] of chunks.entries()) {
      await client.query(
        `
        INSERT INTO "AgentKnowledgeChunks" (knowledge_base_id, chunk_index, content, embedding)
        VALUES ($1, $2, $3, $4)
        `,
        [
          knowledgeBaseId,
          index,
          chunk.content,
          // pgvector.toSql turns [0.1, -0.2, ...] into the '[0.1,-0.2,...]' text
          // format the `vector` column type expects on input.
          pgvector.toSql(chunk.embedding),
        ]
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Paginated, searchable list — same {data, total} shape/convention as
// agent.repository.mjs#findAllAgents, so the controller can build the same
// {data, pagination: {total, limit, page, totalPages}} response shape used there.
// Each row has a live chunk count, via a LEFT JOIN + COUNT rather than a
// denormalized counter column, so it can never drift out of sync with what's
// actually in AgentKnowledgeChunks (e.g. if insertChunks fails partway through).
//
// search matches against `name` only (ILIKE, case-insensitive substring) — add more
// conditions here the same way (push onto `conditions`/`values`) if filtering by
// type/status is ever needed too.
export async function listKnowledgeBases({ limit, offset, search } = {}) {
  const conditions = [];
  const values = [];
  let idx = 1;

  if (search) {
    conditions.push(`kb.name ILIKE $${idx++}`);
    values.push(`%${search}%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [countRes, dataRes] = await Promise.all([
    pool.query(`SELECT COUNT(*)::int AS count FROM "AgentKnowledgeBases" kb ${where}`, values),
    pool.query(
      `
      SELECT
        kb.id,
        kb.name,
        kb.source_type AS type,
        kb.source_url  AS source,
        kb.status,
        kb.size_bytes::int AS "sizeBytes",
        kb.created_at  AS "createdAt",
        COUNT(c.id)::int AS chunks
      FROM "AgentKnowledgeBases" kb
      LEFT JOIN "AgentKnowledgeChunks" c ON c.knowledge_base_id = kb.id
      ${where}
      GROUP BY kb.id
      ORDER BY kb.created_at DESC
      LIMIT $${idx++}
      OFFSET $${idx++}
      `,
      [...values, limit, offset]
    ),
  ]);

  return { data: dataRes.rows.map(omitNullSizeBytes), total: countRes.rows[0].count };
}

// Same shape as listKnowledgeBases()'s rows, for a single id. Returns null (not a
// thrown error) when the id doesn't exist, so the controller can turn that into a
// clean 404.
export async function getKnowledgeBaseById(id) {
  const { rows } = await pool.query(
    `
    SELECT
      kb.id,
      kb.name,
      kb.source_type AS type,
      kb.source_url  AS source,
      kb.status,
      kb.size_bytes::int AS "sizeBytes",
      kb.created_at  AS "createdAt",
      COUNT(c.id)::int AS chunks
    FROM "AgentKnowledgeBases" kb
    LEFT JOIN "AgentKnowledgeChunks" c ON c.knowledge_base_id = kb.id
    WHERE kb.id = $1
    GROUP BY kb.id
    `,
    [id]
  );
  return rows[0] ? omitNullSizeBytes(rows[0]) : null;
}

// Deletes the knowledge base row; its chunks go with it via ON DELETE CASCADE (see
// the AgentKnowledgeChunks FK in migrate.mjs) — no separate chunk cleanup needed.
// Returns true if a row was actually deleted, false if the id didn't exist, so the
// controller can turn that into a clean 404 instead of a false "success".
export async function deleteKnowledgeBase(id) {
  const { rowCount } = await pool.query(`DELETE FROM "AgentKnowledgeBases" WHERE id = $1`, [id]);
  return rowCount > 0;
}
