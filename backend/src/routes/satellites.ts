import { Router } from 'express';
import { z } from 'zod';
import { catalogCache } from '../services/cache.js';
import { filterSatellites, toSummary } from '../services/catalog.js';

const router = Router();

const listQuerySchema = z.object({
  group: z.string().optional(),
  hasRadio: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  search: z.string().optional(),
});

router.get('/', async (req, res, next) => {
  try {
    const query = listQuerySchema.parse(req.query);
    const snapshot = await catalogCache.ensureLoaded();
    const filtered = filterSatellites(snapshot.satellites, query);

    res.json({
      updatedAt: snapshot.updatedAt,
      count: filtered.length,
      satellites: filtered.map(toSummary),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:noradId/tle', async (req, res, next) => {
  try {
    const { noradId } = req.params;
    const snapshot = await catalogCache.ensureLoaded();
    const sat = snapshot.satellites.find((s) => s.noradId === noradId);

    if (!sat) {
      res.status(404).json({ error: 'Satellite not found' });
      return;
    }

    const tleText = `${sat.tle.name}\n${sat.tle.line1}\n${sat.tle.line2}\n`;
    res.type('text/plain').send(tleText);
  } catch (error) {
    next(error);
  }
});

router.get('/:noradId', async (req, res, next) => {
  try {
    const { noradId } = req.params;
    const snapshot = await catalogCache.ensureLoaded();
    const sat = snapshot.satellites.find((s) => s.noradId === noradId);

    if (!sat) {
      res.status(404).json({ error: 'Satellite not found' });
      return;
    }

    res.json(sat);
  } catch (error) {
    next(error);
  }
});

export default router;
