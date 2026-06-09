import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_CELESTRAK_GROUPS } from './utils/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function parseGroups(value: string | undefined): string[] {
  if (!value?.trim()) {
    return [...DEFAULT_CELESTRAK_GROUPS];
  }
  return value.split(',').map((g) => g.trim().toLowerCase()).filter(Boolean);
}

export const config = {
  port: Number(process.env.PORT ?? 38471),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:38472',
  celestrakGroups: parseGroups(process.env.CELESTRAK_GROUPS),
  tleRefreshCron: process.env.TLE_REFRESH_CRON ?? '0 */6 * * *',
  transmitterRefreshCron: process.env.TRANSMITTER_REFRESH_CRON ?? '0 3 * * *',
  satnogsApiKey: process.env.SATNOGS_API_KEY ?? '',
  dataDir: path.resolve(__dirname, '../data'),
  catalogFile: path.resolve(__dirname, '../data/catalog.json'),
};
