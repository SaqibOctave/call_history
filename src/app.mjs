import express from 'express';
import cors from 'cors';
import logger from './config/logger.mjs';
import callHistoryRoutes from './routes/callHistory.routes.mjs';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/call', callHistoryRoutes);

export default app;
