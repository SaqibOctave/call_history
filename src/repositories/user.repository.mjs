import pool from '../config/db.mjs';

export async function insertUser({ profile_pic, first_name, last_name, username, email, password, role, organization_name }) {
  const { rows } = await pool.query(
    `INSERT INTO "Users" (profile_pic, first_name, last_name, username, email, password, role, organization_name)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING user_id, profile_pic, first_name, last_name, username, email, role, organization_name, created_at, updated_at`,
    [profile_pic ?? null, first_name, last_name, username, email, password, role ?? 'VIEWER', organization_name ?? null]
  );
  return rows[0];
}

export async function findAllUsers({ limit, offset, role, organization_name }) {
  const conditions = [];
  const values     = [];
  let idx = 1;

  if (role) {
    conditions.push(`role = $${idx++}`);
    values.push(role);
  }
  if (organization_name) {
    conditions.push(`organization_name ILIKE $${idx++}`);
    values.push(`%${organization_name}%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [countRes, dataRes] = await Promise.all([
    pool.query(`SELECT COUNT(*) FROM "Users" ${where}`, values),
    pool.query(
      `SELECT user_id, profile_pic, first_name, last_name, username, email, role, organization_name, created_at, updated_at
       FROM "Users" ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...values, limit, offset]
    ),
  ]);

  return {
    data: dataRes.rows,
    total: parseInt(countRes.rows[0].count, 10),
  };
}

export async function findUserById(user_id) {
  const { rows } = await pool.query(
    `SELECT user_id, profile_pic, first_name, last_name, username, email, role, organization_name, created_at, updated_at
     FROM "Users" WHERE user_id = $1`,
    [user_id]
  );
  return rows[0] ?? null;
}

export async function findUserByEmail(email) {
  const { rows } = await pool.query(
    `SELECT * FROM "Users" WHERE email = $1`,
    [email]
  );
  return rows[0] ?? null;
}

export async function findUserByUsername(username) {
  const { rows } = await pool.query(
    `SELECT * FROM "Users" WHERE username = $1`,
    [username]
  );
  return rows[0] ?? null;
}

export async function updateUserById(user_id, fields) {
  const allowed = ['profile_pic', 'first_name', 'last_name', 'username', 'email', 'password', 'role', 'organization_name'];
  const setClauses = [];
  const values     = [];
  let idx = 1;

  for (const key of allowed) {
    if (key in fields) {
      setClauses.push(`${key} = $${idx++}`);
      values.push(fields[key]);
    }
  }

  setClauses.push(`updated_at = $${idx++}`);
  values.push(new Date());
  values.push(user_id);

  const { rows } = await pool.query(
    `UPDATE "Users" SET ${setClauses.join(', ')} WHERE user_id = $${idx}
     RETURNING user_id, profile_pic, first_name, last_name, username, email, role, organization_name, created_at, updated_at`,
    values
  );
  return rows[0] ?? null;
}

export async function deleteUserById(user_id) {
  const { rows } = await pool.query(
    `DELETE FROM "Users" WHERE user_id = $1
     RETURNING user_id, first_name, last_name, username, email, role`,
    [user_id]
  );
  return rows[0] ?? null;
}
