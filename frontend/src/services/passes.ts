import type { ObserverLocation, SatellitePass, UpcomingPass } from '../types';
import type { SatRec } from 'satellite.js';
import { computeLookAngles, isStationarySatellite } from './propagation';
import type { SatelliteRecord } from './propagation';

const DEFAULT_MIN_ELEVATION_DEG = 10;
const FINE_STEP_SECONDS = 30;
const COARSE_STEP_SECONDS = 180;
const IN_PASS_STEP_SECONDS = 15;

export interface PredictPassesOptions {
  minElevationDeg?: number;
  maxPasses?: number;
  refine?: boolean;
}

export interface PredictPassesBatchOptions extends PredictPassesOptions {
  maxResults?: number;
  passesPerSatellite?: number;
  progressInterval?: number;
}

export interface PredictPassesBatchProgress {
  passes: UpcomingPass[];
  processed: number;
  total: number;
  done: boolean;
}

function getOrbitalPeriodMs(satrec: SatRec): number {
  const periodMinutes = (2 * Math.PI) / satrec.no;
  return periodMinutes * 60 * 1000;
}

function getElevation(
  satrec: SatRec,
  observer: ObserverLocation,
  date: Date,
): number {
  return computeLookAngles(satrec, observer, date)?.elevation ?? -90;
}

function stepSecondsForElevation(
  elevation: number,
  minElevationDeg: number,
  inPass: boolean,
  orbitalPeriodMs: number,
): number {
  if (inPass) return IN_PASS_STEP_SECONDS;

  const margin = elevation - minElevationDeg;
  if (margin < -20) {
    const coarse = Math.max(
      COARSE_STEP_SECONDS,
      Math.floor((orbitalPeriodMs / 1000) * 0.12),
    );
    return Math.min(coarse, 600);
  }
  if (margin < -5) return 60;
  return FINE_STEP_SECONDS;
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
  const coarseAos = new Date(pass.aos.getTime() - FINE_STEP_SECONDS * 1000);
  const aos = refineCrossingTime(satrec, observer, coarseAos, pass.aos, minElevationDeg, true);
  const los = refineCrossingTime(
    satrec,
    observer,
    pass.los,
    new Date(pass.los.getTime() + FINE_STEP_SECONDS * 1000),
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

function sortAndTrimPasses(
  passes: UpcomingPass[],
  maxResults: number,
): UpcomingPass[] {
  passes.sort((a, b) => a.aos.getTime() - b.aos.getTime());
  return passes.slice(0, maxResults);
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
  const orbitalPeriodMs = getOrbitalPeriodMs(satrec);
  let cursor = start.getTime();
  let inPass = false;
  let passStart: Date | null = null;
  let maxEl = -90;
  let maxElAz = 0;
  let aosAz = 0;
  let losAz = 0;

  while (cursor < endTime && passes.length < maxPasses) {
    const date = new Date(cursor);
    const look = computeLookAngles(satrec, observer, date);
    const elevation = look?.elevation ?? -90;

    if (!inPass && elevation >= minElevationDeg) {
      inPass = true;
      passStart = date;
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
        const los = date;
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

      const jumpMs = Math.max(orbitalPeriodMs * 0.45, FINE_STEP_SECONDS * 1000);
      cursor = Math.min(endTime, cursor + jumpMs);
      continue;
    }

    const stepSeconds = stepSecondsForElevation(
      elevation,
      minElevationDeg,
      inPass,
      orbitalPeriodMs,
    );
    cursor += stepSeconds * 1000;
  }

  return passes;
}

function refineUpcomingPasses(
  recordsById: Map<string, SatRec>,
  observer: ObserverLocation,
  passes: UpcomingPass[],
  minElevationDeg: number,
): UpcomingPass[] {
  return passes.map((pass) => {
    const satrec = recordsById.get(pass.noradId);
    if (!satrec) return pass;
    const refined = refinePass(satrec, observer, pass, minElevationDeg);
    return { noradId: pass.noradId, ...refined };
  });
}

export function predictPassesBatch(
  records: SatelliteRecord[],
  observer: ObserverLocation,
  start: Date,
  hours: number,
  options: PredictPassesBatchOptions = {},
  onProgress?: (progress: PredictPassesBatchProgress) => void,
): UpcomingPass[] {
  const minElevationDeg = options.minElevationDeg ?? DEFAULT_MIN_ELEVATION_DEG;
  const maxResults = options.maxResults ?? 50;
  const passesPerSatellite = options.passesPerSatellite ?? 2;
  const progressInterval = options.progressInterval ?? 5;
  const days = hours / 24;
  const allPasses: UpcomingPass[] = [];
  const recordsById = new Map(records.map(({ noradId, satrec }) => [noradId, satrec]));
  const total = records.length;

  const emitProgress = (processed: number, done: boolean, passesOverride?: UpcomingPass[]) => {
    onProgress?.({
      passes: passesOverride ?? sortAndTrimPasses([...allPasses], maxResults),
      processed,
      total,
      done,
    });
  };

  for (let index = 0; index < records.length; index++) {
    const { noradId, satrec } = records[index];

    if (isStationarySatellite(satrec, start)) {
      if ((index + 1) % progressInterval === 0 || index + 1 === total) {
        emitProgress(index + 1, false);
      }
      continue;
    }

    const passes = predictPasses(satrec, observer, start, days, passesPerSatellite, {
      minElevationDeg,
      refine: false,
    });

    for (const pass of passes) {
      if (pass.los.getTime() <= start.getTime()) continue;
      allPasses.push({ noradId, ...pass });
    }

    if ((index + 1) % progressInterval === 0 || index + 1 === total) {
      emitProgress(index + 1, false);
    }
  }

  const topPasses = sortAndTrimPasses(allPasses, maxResults);
  const refinedPasses = refineUpcomingPasses(recordsById, observer, topPasses, minElevationDeg);
  emitProgress(total, true, refinedPasses);
  return refinedPasses;
}
