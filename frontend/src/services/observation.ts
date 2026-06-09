import type { ObserverLocation, OverheadSatellite } from '../types';
import type { SatRec } from 'satellite.js';
import { computeLookAngles } from './propagation';
import type { SatelliteRecord } from './propagation';

export function computeRangeRate(
  satrec: SatRec,
  observer: ObserverLocation,
  now: Date,
): number {
  const lookNow = computeLookAngles(satrec, observer, now);
  const lookLater = computeLookAngles(satrec, observer, new Date(now.getTime() + 1000));
  if (!lookNow || !lookLater) return 0;
  return lookLater.rangeKm - lookNow.rangeKm;
}

export function computeOverhead(
  records: SatelliteRecord[],
  observer: ObserverLocation,
  now: Date,
  minElevationDeg = 0,
): OverheadSatellite[] {
  const overhead: OverheadSatellite[] = [];

  for (const { noradId, satrec } of records) {
    const look = computeLookAngles(satrec, observer, now);
    if (!look || look.elevation < minElevationDeg) continue;

    overhead.push({
      noradId,
      azimuth: look.azimuth,
      elevation: look.elevation,
      rangeKm: look.rangeKm,
      rangeRateKmS: computeRangeRate(satrec, observer, now),
    });
  }

  overhead.sort((a, b) => b.elevation - a.elevation);
  return overhead;
}

export function computePassTrack(
  satrec: SatRec,
  observer: ObserverLocation,
  start: Date,
  end: Date,
  stepSeconds = 15,
): Array<{ azimuth: number; elevation: number }> {
  const track: Array<{ azimuth: number; elevation: number }> = [];
  const stepMs = stepSeconds * 1000;

  for (let t = start.getTime(); t <= end.getTime(); t += stepMs) {
    const look = computeLookAngles(satrec, observer, new Date(t));
    if (look && look.elevation >= 0) {
      track.push({ azimuth: look.azimuth, elevation: look.elevation });
    }
  }

  return track;
}

export function computeVisibleSkyTrack(
  satrec: SatRec,
  observer: ObserverLocation,
  now: Date,
  pastMinutes = 30,
  futureMinutes = 30,
  stepSeconds = 20,
): Array<{ azimuth: number; elevation: number }> {
  return computePassTrack(
    satrec,
    observer,
    new Date(now.getTime() - pastMinutes * 60 * 1000),
    new Date(now.getTime() + futureMinutes * 60 * 1000),
    stepSeconds,
  );
}
