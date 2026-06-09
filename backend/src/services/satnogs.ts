import { config } from '../config.js';
import { SatnogsTransmitterSchema } from '../utils/types.js';
import type { SatnogsTransmitter } from '../utils/types.js';

const SATNOGS_API = 'https://db.satnogs.org/api/transmitters/';

export async function fetchAllTransmitters(): Promise<SatnogsTransmitter[]> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'User-Agent': 'TrackSat/1.0 (ham radio satellite tracker)',
  };

  if (config.satnogsApiKey) {
    headers.Authorization = `Token ${config.satnogsApiKey}`;
  }

  const response = await fetch(SATNOGS_API, { headers });

  if (!response.ok) {
    throw new Error(`SatNOGS fetch failed: ${response.status}`);
  }

  const data = (await response.json()) as unknown[];
  const transmitters: SatnogsTransmitter[] = [];

  for (const item of data) {
    const parsed = SatnogsTransmitterSchema.safeParse(item);
    if (parsed.success) {
      transmitters.push(parsed.data);
    }
  }

  return transmitters.filter((t) => t.status === 'active' && t.norad_cat_id);
}

export function groupTransmittersByNorad(
  transmitters: SatnogsTransmitter[],
): Map<number, SatnogsTransmitter[]> {
  const map = new Map<number, SatnogsTransmitter[]>();

  for (const tx of transmitters) {
    if (!tx.norad_cat_id) continue;
    const existing = map.get(tx.norad_cat_id) ?? [];
    existing.push(tx);
    map.set(tx.norad_cat_id, existing);
  }

  return map;
}
