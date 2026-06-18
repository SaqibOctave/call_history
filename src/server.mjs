import 'dotenv/config';
import app from './app.mjs';
import pool from './config/db.mjs';
import logger from './config/logger.mjs';
import { runMigrations } from './config/migrate.mjs';

const PORT = process.env.PORT || 3000;

async function start() {
  await pool.query('SELECT 1');
  await runMigrations();
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
}

start().catch((err) => {
  logger.error(`Startup failed: ${err.message}`);
  process.exit(1);
});
