import type { TransmitterInfo } from './types.js';

export interface FrequencyBandDefinition {
  id: string;
  label: string;
  minHz: number;
  maxHz: number;
}

export const HAM_FREQUENCY_BANDS: FrequencyBandDefinition[] = [
  { id: 'vhf', label: 'VHF (2m)', minHz: 144_000_000, maxHz: 148_000_000 },
  { id: 'uhf', label: 'UHF (70cm)', minHz: 430_000_000, maxHz: 440_000_000 },
];

export const FREQUENCY_BAND_IDS = HAM_FREQUENCY_BANDS.map((band) => band.id);

const bandById = new Map(HAM_FREQUENCY_BANDS.map((band) => [band.id, band]));

export function parseBandIds(value: string | undefined): string[] {
  if (!value?.trim()) return [];

  return value
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter((id) => bandById.has(id));
}

function rangesOverlap(
  rangeLow: number | null,
  rangeHigh: number | null,
  bandLow: number,
  bandHigh: number,
): boolean {
  if (rangeLow == null && rangeHigh == null) return false;

  const low = rangeLow ?? rangeHigh!;
  const high = rangeHigh ?? rangeLow!;

  return low <= bandHigh && high >= bandLow;
}

export function transmitterMatchesBand(tx: TransmitterInfo, band: FrequencyBandDefinition): boolean {
  return (
    rangesOverlap(tx.uplinkLow, tx.uplinkHigh, band.minHz, band.maxHz) ||
    rangesOverlap(tx.downlinkLow, tx.downlinkHigh, band.minHz, band.maxHz)
  );
}

export function satelliteMatchesBands(
  transmitters: TransmitterInfo[],
  bandIds: string[],
): boolean {
  if (bandIds.length === 0) return true;

  const bands = bandIds
    .map((id) => bandById.get(id))
    .filter((band): band is FrequencyBandDefinition => band != null);

  if (bands.length === 0) return true;

  return bands.some((band) => transmitters.some((tx) => transmitterMatchesBand(tx, band)));
}
