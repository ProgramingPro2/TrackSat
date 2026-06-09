import type { CelestrakOmm, KeplerianElements } from './types.js';

const CELESTRAK_GP_URL = 'https://celestrak.org/NORAD/elements/gp.php';

export function normalizeNoradId(id: string | number): string {
  const parsed = Number(String(id).trim());
  return Number.isNaN(parsed) ? String(id).trim() : String(parsed);
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

function formatEpochForTle(epoch: string): { year: number; dayOfYear: number } {
  const date = new Date(epoch);
  const year = date.getUTCFullYear() % 100;
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const diff = date.getTime() - start;
  const dayOfYear = diff / 86400000;
  return { year, dayOfYear };
}

function formatScientific(value: number | undefined, width: number): string {
  if (value === undefined || Number.isNaN(value) || value === 0) {
    return ' 00000+0 00000-0';
  }
  const sign = value < 0 ? '-' : ' ';
  const abs = Math.abs(value);
  if (abs < 1e-99) {
    return ' 00000+0 00000-0';
  }
  const exp = Math.floor(Math.log10(abs));
  const mantissa = abs / Math.pow(10, exp);
  const mantStr = mantissa.toFixed(6).slice(2);
  const expStr = (exp >= 0 ? '+' : '-') + Math.abs(exp).toString().padStart(2, '0');
  return `${sign}${mantStr}e${expStr}`.padStart(width);
}

export function ommToKeplerian(omm: CelestrakOmm): KeplerianElements {
  return {
    epoch: omm.EPOCH,
    inclination: omm.INCLINATION,
    raan: omm.RA_OF_ASC_NODE,
    eccentricity: omm.ECCENTRICITY,
    argOfPerigee: omm.ARG_OF_PERICENTER,
    meanAnomaly: omm.MEAN_ANOMALY,
    meanMotion: omm.MEAN_MOTION,
    bstar: omm.BSTAR !== undefined ? Number(omm.BSTAR) : undefined,
    revAtEpoch: omm.REV_AT_EPOCH !== undefined ? Number(omm.REV_AT_EPOCH) : undefined,
  };
}

export function ommToTleLines(omm: CelestrakOmm): { name: string; line1: string; line2: string } {
  const noradId = omm.NORAD_CAT_ID.padStart(5, '0').slice(-5);
  const { year, dayOfYear } = formatEpochForTle(omm.EPOCH);
  const epochStr = `${pad2(year)}${dayOfYear.toFixed(8).padStart(12, '0')}`;
  const classification = omm.CLASSIFICATION_TYPE ?? 'U';
  const intDes = (omm.OBJECT_ID ?? '').replace(/-/g, '').slice(0, 8).padEnd(8, ' ');
  const elementSetNo = String(omm.ELEMENT_SET_NO ?? 999).padStart(4, '0').slice(-4);
  const revAtEpoch = String(Math.floor(Number(omm.REV_AT_EPOCH ?? 0))).padStart(5, ' ');

  const inc = omm.INCLINATION.toFixed(4).padStart(8, ' ');
  const raan = omm.RA_OF_ASC_NODE.toFixed(4).padStart(8, ' ');
  const ecc = omm.ECCENTRICITY.toFixed(7).slice(2);
  const argp = omm.ARG_OF_PERICENTER.toFixed(4).padStart(8, ' ');
  const ma = omm.MEAN_ANOMALY.toFixed(4).padStart(8, ' ');
  const mm = omm.MEAN_MOTION.toFixed(8).padStart(11, ' ');

  const line1 = `1 ${noradId}${classification} ${intDes}${epochStr} ${formatScientific(Number(omm.MEAN_MOTION_DOT ?? 0), 10)} ${formatScientific(Number(omm.MEAN_MOTION_DDOT ?? 0), 8)} ${formatScientific(Number(omm.BSTAR ?? 0), 8)} 0 ${elementSetNo}`;
  const line2 = `2 ${noradId} ${inc} ${raan} ${ecc} ${argp} ${ma} ${mm}${revAtEpoch}`;

  return {
    name: omm.OBJECT_NAME.trim(),
    line1,
    line2,
  };
}

export function formatKeplerianBlock(
  name: string,
  noradId: string,
  keplerian: KeplerianElements,
): string {
  const lines = [
    `Satellite: ${name} (NORAD ${noradId})`,
    `Epoch (UTC): ${keplerian.epoch}`,
    `Inclination (deg): ${keplerian.inclination}`,
    `RAAN (deg): ${keplerian.raan}`,
    `Eccentricity: ${keplerian.eccentricity}`,
    `Argument of Perigee (deg): ${keplerian.argOfPerigee}`,
    `Mean Anomaly (deg): ${keplerian.meanAnomaly}`,
    `Mean Motion (rev/day): ${keplerian.meanMotion}`,
  ];
  if (keplerian.bstar !== undefined) {
    lines.push(`BSTAR: ${keplerian.bstar}`);
  }
  if (keplerian.revAtEpoch !== undefined) {
    lines.push(`Rev at Epoch: ${keplerian.revAtEpoch}`);
  }
  return lines.join('\n');
}

export function formatFrequencyHz(hz: number | null | undefined): string | null {
  if (hz === null || hz === undefined || hz === 0) return null;
  if (hz >= 1_000_000_000) {
    return `${(hz / 1_000_000_000).toFixed(3)} GHz`;
  }
  if (hz >= 1_000_000) {
    return `${(hz / 1_000_000).toFixed(3)} MHz`;
  }
  if (hz >= 1_000) {
    return `${(hz / 1_000).toFixed(3)} kHz`;
  }
  return `${hz} Hz`;
}

export function formatFrequencyRange(
  low: number | null | undefined,
  high: number | null | undefined,
): string | null {
  const lowStr = formatFrequencyHz(low);
  const highStr = formatFrequencyHz(high);
  if (lowStr && highStr && lowStr !== highStr) {
    return `${lowStr} - ${highStr}`;
  }
  return lowStr ?? highStr;
}

export async function fetchCelestrakGroup(
  group: string,
  format: 'JSON' | 'TLE' = 'JSON',
): Promise<CelestrakOmm[] | string> {
  const url = `${CELESTRAK_GP_URL}?GROUP=${encodeURIComponent(group)}&FORMAT=${format}`;
  const response = await fetch(url, {
    headers: { 'User-Agent': 'TrackSat/1.0 (ham radio satellite tracker)' },
  });

  if (!response.ok) {
    throw new Error(`CelesTrak fetch failed for group ${group}: ${response.status}`);
  }

  if (format === 'TLE') {
    return response.text();
  }

  const text = await response.text();
  if (text.startsWith('Invalid query') || text.startsWith('No GP data')) {
    throw new Error(`CelesTrak invalid query for group: ${text.slice(0, 120)}`);
  }

  const data = JSON.parse(text) as unknown[];
  return data as CelestrakOmm[];
}

export function parseTleText(tleText: string): Map<string, { line1: string; line2: string; name: string }> {
  const lines = tleText.split('\n').map((l) => l.trim()).filter(Boolean);
  const map = new Map<string, { line1: string; line2: string; name: string }>();

  for (let i = 0; i < lines.length; i++) {
    let name = '';
    let line1 = '';
    let line2 = '';

    if (lines[i].startsWith('1 ')) {
      line1 = lines[i];
      line2 = lines[i + 1] ?? '';
      i += 1;
    } else if (lines[i + 1]?.startsWith('1 ') && lines[i + 2]?.startsWith('2 ')) {
      name = lines[i];
      line1 = lines[i + 1];
      line2 = lines[i + 2];
      i += 2;
    } else {
      continue;
    }

    const noradMatch = line1.match(/^1\s+(\d+)/);
    if (!noradMatch || !line2.startsWith('2 ')) continue;

    const noradId = normalizeNoradId(noradMatch[1]);
    map.set(noradId, { name: name.trim(), line1, line2 });
  }

  return map;
}
