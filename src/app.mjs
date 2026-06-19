import express from 'express';
import cors from 'cors';
import logger from './config/logger.mjs';
import callHistoryRoutes from './routes/callHistory.routes.mjs';
import userRoutes from './routes/user.routes.mjs';

const app = express();

const BODY_LIMIT = process.env.BODY_LIMIT || '10mb';

app.use(cors());
app.use(express.json({ limit: BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: BODY_LIMIT }));

app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/call', callHistoryRoutes);
app.use('/api/users', userRoutes);

export default app;
