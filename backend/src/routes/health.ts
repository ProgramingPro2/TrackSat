import { Router } from 'express';
import { catalogCache } from '../services/cache.js';

const router = Router();

router.get('/', (_req, res) => {
  const snapshot = catalogCache.getSnapshot();
  res.json({
    status: 'ok',
    catalogLoaded: snapshot !== null,
    satelliteCount: snapshot?.satellites.length ?? 0,
    updatedAt: snapshot?.updatedAt ?? null,
    lastError: catalogCache.getLastError(),
  });
});

export default router;
