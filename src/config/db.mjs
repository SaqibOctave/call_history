import pg from 'pg';
import logger from './logger.mjs';

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

pool.on('connect', () => logger.info('PostgreSQL connected'));
pool.on('error', (err) => logger.error(`PostgreSQL error: ${err.message}`));

export default pool;
