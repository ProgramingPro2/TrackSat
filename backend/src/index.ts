import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import satellitesRouter from './routes/satellites.js';
import healthRouter from './routes/health.js';
import { catalogCache } from './services/cache.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

app.use('/api/health', healthRouter);
app.use('/api/satellites', satellitesRouter);
app.get('/api/groups', (_req, res) => {
  res.json({ groups: config.celestrakGroups });
});

app.use(notFoundHandler);
app.use(errorHandler);

async function start(): Promise<void> {
  await catalogCache.loadFromDisk();

  catalogCache
    .refresh()
    .then(() => catalogCache.startScheduledRefresh())
    .catch((err) => {
      console.error('Initial catalog refresh failed:', err);
      catalogCache.startScheduledRefresh();
    });

  app.listen(config.port, '0.0.0.0', () => {
    console.log(`TrackSat backend listening on http://0.0.0.0:${config.port}`);
  });
}

void start();

export default app;
