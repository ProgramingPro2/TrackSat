import { describe, expect, it, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import satellitesRouter from '../src/routes/satellites.js';
import healthRouter from '../src/routes/health.js';
import { errorHandler, notFoundHandler } from '../src/middleware/errorHandler.js';
import { catalogCache } from '../src/services/cache.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/health', healthRouter);
app.use('/api/satellites', satellitesRouter);
app.use(notFoundHandler);
app.use(errorHandler);

describe('API routes', () => {
  beforeAll(async () => {
    await catalogCache.loadFromDisk();
    try {
      await catalogCache.refresh();
    } catch {
      // allow tests to run if network unavailable but disk cache exists
    }
  }, 120000);

  it('GET /api/health returns status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
  });

  it('GET /api/satellites returns catalog list', async () => {
    const res = await request(app).get('/api/satellites');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('satellites');
    expect(Array.isArray(res.body.satellites)).toBe(true);
  });

  it('GET /api/satellites/:noradId/tle returns plain text TLE', async () => {
    const list = await request(app).get('/api/satellites?hasRadio=true');
    const first = list.body.satellites?.[0];
    if (!first) return;

    const res = await request(app).get(`/api/satellites/${first.noradId}/tle`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/plain/);
    expect(res.text).toContain('\n1 ');
    expect(res.text).toContain('\n2 ');
  });
});
