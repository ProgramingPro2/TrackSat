export function formatFrequencyHz(hz: number | null | undefined): string | null {
  if (hz === null || hz === undefined || hz === 0) return null;
  if (hz >= 1_000_000_000) return `${(hz / 1_000_000_000).toFixed(3)} GHz`;
  if (hz >= 1_000_000) return `${(hz / 1_000_000).toFixed(3)} MHz`;
  if (hz >= 1_000) return `${(hz / 1_000).toFixed(3)} kHz`;
  return `${hz} Hz`;
}

export function formatFrequencyRange(
  low: number | null | undefined,
  high: number | null | undefined,
): string | null {
  const lowStr = formatFrequencyHz(low);
  const highStr = formatFrequencyHz(high);
  if (lowStr && highStr && lowStr !== highStr) return `${lowStr} - ${highStr}`;
  return lowStr ?? highStr;
}

export function formatKeplerianBlock(
  name: string,
  noradId: string,
  k: import('../types').KeplerianElements,
): string {
  const lines = [
    `Satellite: ${name} (NORAD ${noradId})`,
    `Epoch (UTC): ${k.epoch}`,
    `Inclination (deg): ${k.inclination}`,
    `RAAN (deg): ${k.raan}`,
    `Eccentricity: ${k.eccentricity}`,
    `Argument of Perigee (deg): ${k.argOfPerigee}`,
    `Mean Anomaly (deg): ${k.meanAnomaly}`,
    `Mean Motion (rev/day): ${k.meanMotion}`,
  ];
  if (k.bstar !== undefined) lines.push(`BSTAR: ${k.bstar}`);
  if (k.revAtEpoch !== undefined) lines.push(`Rev at Epoch: ${k.revAtEpoch}`);
  return lines.join('\n');
}

export function formatTleBlock(tle: { name: string; line1: string; line2: string }): string {
  return `${tle.name}\n${tle.line1}\n${tle.line2}`;
}

export function formatDateTime(date: Date): string {
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatDuration(minutes: number): string {
  const m = Math.floor(minutes);
  const s = Math.round((minutes - m) * 60);
  return `${m}m ${s}s`;
}

const COMPASS_POINTS = [
  'N',
  'NNE',
  'NE',
  'ENE',
  'E',
  'ESE',
  'SE',
  'SSE',
  'S',
  'SSW',
  'SW',
  'WSW',
  'W',
  'WNW',
  'NW',
  'NNW',
] as const;

export function azimuthToCompass(degrees: number): string {
  const normalized = ((degrees % 360) + 360) % 360;
  const index = Math.round(normalized / 22.5) % 16;
  return COMPASS_POINTS[index];
}

export function formatCountdown(toDate: Date, fromDate = new Date()): string {
  const diffMs = toDate.getTime() - fromDate.getTime();
  if (diffMs <= 0) return 'now';

  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export function formatRangeRate(kmPerSecond: number): string {
  const abs = Math.abs(kmPerSecond);
  const direction = kmPerSecond < 0 ? 'approaching' : kmPerSecond > 0 ? 'receding' : 'steady';
  return `${abs.toFixed(2)} km/s ${direction}`;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
