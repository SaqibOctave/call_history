import pool from '../config/db.mjs';

export async function saveRefreshToken({ user_id, token, expires_at }) {
  await pool.query(
    `INSERT INTO "RefreshTokens" (user_id, token, expires_at) VALUES ($1, $2, $3)`,
    [user_id, token, expires_at]
  );
}

export async function findRefreshToken(token) {
  const { rows } = await pool.query(
    `SELECT * FROM "RefreshTokens" WHERE token = $1`,
    [token]
  );
  return rows[0] ?? null;
}

export async function deleteRefreshToken(token) {
  await pool.query(`DELETE FROM "RefreshTokens" WHERE token = $1`, [token]);
}

export async function deleteAllUserRefreshTokens(user_id) {
  await pool.query(`DELETE FROM "RefreshTokens" WHERE user_id = $1`, [user_id]);
}
