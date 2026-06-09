import type { ObserverLocation, SatellitePass, UpcomingPass } from '../types';
import type { SatRec } from 'satellite.js';
import { computeLookAngles } from './propagation';
import type { SatelliteRecord } from './propagation';

const DEFAULT_MIN_ELEVATION_DEG = 10;
const STEP_SECONDS = 30;

export interface PredictPassesOptions {
  minElevationDeg?: number;
  maxPasses?: number;
  refine?: boolean;
}

function getElevation(
  satrec: SatRec,
  observer: ObserverLocation,
  date: Date,
): number {
  return computeLookAngles(satrec, observer, date)?.elevation ?? -90;
}

function refineCrossingTime(
  satrec: SatRec,
  observer: ObserverLocation,
  low: Date,
  high: Date,
  targetElevation: number,
  rising: boolean,
): Date {
  let lo = low.getTime();
  let hi = high.getTime();

  for (let i = 0; i < 12; i++) {
    const mid = Math.floor((lo + hi) / 2);
    const el = getElevation(satrec, observer, new Date(mid));
    const above = el >= targetElevation;

    if (rising) {
      if (above) hi = mid;
      else lo = mid;
    } else {
      if (above) lo = mid;
      else hi = mid;
    }
  }

  return new Date(Math.floor((lo + hi) / 2));
}

function refinePass(
  satrec: SatRec,
  observer: ObserverLocation,
  pass: SatellitePass,
  minElevationDeg: number,
): SatellitePass {
  const coarseAos = new Date(pass.aos.getTime() - STEP_SECONDS * 1000);
  const aos = refineCrossingTime(satrec, observer, coarseAos, pass.aos, minElevationDeg, true);
  const los = refineCrossingTime(
    satrec,
    observer,
    pass.los,
    new Date(pass.los.getTime() + STEP_SECONDS * 1000),
    minElevationDeg,
    false,
  );

  let maxEl = -90;
  let maxElAz = 0;
  let aosAz = 0;
  let losAz = 0;
  const stepMs = 5000;

  for (let t = aos.getTime(); t <= los.getTime(); t += stepMs) {
    const look = computeLookAngles(satrec, observer, new Date(t));
    if (!look) continue;
    if (t === aos.getTime()) aosAz = look.azimuth;
    if (t >= los.getTime() - stepMs) losAz = look.azimuth;
    if (look.elevation > maxEl) {
      maxEl = look.elevation;
      maxElAz = look.azimuth;
    }
  }

  const aosLook = computeLookAngles(satrec, observer, aos);
  const losLook = computeLookAngles(satrec, observer, los);
  if (aosLook) aosAz = aosLook.azimuth;
  if (losLook) losAz = losLook.azimuth;

  return {
    aos,
    los,
    maxElevation: maxEl,
    maxElevationAzimuth: maxElAz,
    durationMinutes: (los.getTime() - aos.getTime()) / 60000,
    aosAzimuth: aosAz,
    losAzimuth: losAz,
  };
}

export function predictPasses(
  satrec: SatRec,
  observer: ObserverLocation,
  start: Date,
  days: number,
  maxPasses = 5,
  options: PredictPassesOptions = {},
): SatellitePass[] {
  const minElevationDeg = options.minElevationDeg ?? DEFAULT_MIN_ELEVATION_DEG;
  const refine = options.refine ?? false;
  const passes: SatellitePass[] = [];
  const endTime = start.getTime() + days * 24 * 60 * 60 * 1000;
  let cursor = new Date(start);
  let inPass = false;
  let passStart: Date | null = null;
  let maxEl = -90;
  let maxElAz = 0;
  let aosAz = 0;
  let losAz = 0;

  while (cursor.getTime() < endTime && passes.length < maxPasses) {
    const look = computeLookAngles(satrec, observer, cursor);
    const elevation = look?.elevation ?? -90;

    if (!inPass && elevation >= minElevationDeg) {
      inPass = true;
      passStart = new Date(cursor);
      maxEl = elevation;
      maxElAz = look?.azimuth ?? 0;
      aosAz = look?.azimuth ?? 0;
    } else if (inPass && elevation >= minElevationDeg) {
      if (elevation > maxEl) {
        maxEl = elevation;
        maxElAz = look?.azimuth ?? maxElAz;
      }
    } else if (inPass && elevation < minElevationDeg) {
      if (passStart) {
        const aos = passStart;
        const los = new Date(cursor);
        const pass: SatellitePass = {
          aos,
          los,
          maxElevation: maxEl,
          maxElevationAzimuth: maxElAz,
          durationMinutes: (los.getTime() - aos.getTime()) / 60000,
          aosAzimuth: aosAz,
          losAzimuth: look?.azimuth ?? losAz,
        };
        passes.push(refine ? refinePass(satrec, observer, pass, minElevationDeg) : pass);
      }
      inPass = false;
      passStart = null;
      maxEl = -90;
    }

    cursor = new Date(cursor.getTime() + STEP_SECONDS * 1000);
  }

  return passes;
}

export interface PredictPassesBatchOptions extends PredictPassesOptions {
  maxResults?: number;
  passesPerSatellite?: number;
}

export function predictPassesBatch(
  records: SatelliteRecord[],
  observer: ObserverLocation,
  start: Date,
  hours: number,
  options: PredictPassesBatchOptions = {},
): UpcomingPass[] {
  const minElevationDeg = options.minElevationDeg ?? DEFAULT_MIN_ELEVATION_DEG;
  const maxResults = options.maxResults ?? 50;
  const passesPerSatellite = options.passesPerSatellite ?? 2;
  const days = hours / 24;
  const allPasses: UpcomingPass[] = [];

  for (const { noradId, satrec } of records) {
    const passes = predictPasses(satrec, observer, start, days, passesPerSatellite, {
      minElevationDeg,
      refine: options.refine ?? true,
    });

    for (const pass of passes) {
      if (pass.los.getTime() <= start.getTime()) continue;
      allPasses.push({ noradId, ...pass });
    }
  }

  allPasses.sort((a, b) => a.aos.getTime() - b.aos.getTime());
  return allPasses.slice(0, maxResults);
}
