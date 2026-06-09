import {
  propagate,
  twoline2satrec,
  eciToGeodetic,
  eciToEcf,
  gstime,
  ecfToLookAngles,
  degreesLat,
  degreesLong,
  type SatRec,
} from 'satellite.js';
import type { ObserverLocation, PropagatedPosition, SatelliteSummary } from '../types';

export type { SatRec };

export interface SatelliteRecord {
  noradId: string;
  satrec: SatRec;
}

function isEciPosition(
  position: { x: number; y: number; z: number } | boolean,
): position is { x: number; y: number; z: number } {
  return typeof position === 'object' && position !== null && 'x' in position;
}

export function isValidCoordinate(latitude: number, longitude: number): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export function createSatelliteRecords(satellites: SatelliteSummary[]): SatelliteRecord[] {
  const records: SatelliteRecord[] = [];

  for (const sat of satellites) {
    try {
      const satrec = twoline2satrec(sat.line1, sat.line2);
      if (satrec.error !== 0) continue;
      records.push({ noradId: sat.noradId, satrec });
    } catch {
      // skip invalid TLEs
    }
  }

  return records;
}

export function propagateSatellite(
  satrec: SatRec,
  date: Date,
): { latitude: number; longitude: number; altitudeKm: number } | null {
  const positionAndVelocity = propagate(satrec, date);
  if (!isEciPosition(positionAndVelocity.position)) return null;

  const gmst = gstime(date);
  const geodetic = eciToGeodetic(positionAndVelocity.position, gmst);

  const result = {
    latitude: degreesLat(geodetic.latitude),
    longitude: degreesLong(geodetic.longitude),
    altitudeKm: geodetic.height,
  };

  if (
    !isValidCoordinate(result.latitude, result.longitude) ||
    !Number.isFinite(result.altitudeKm)
  ) {
    return null;
  }

  return result;
}

export function propagateAll(
  records: SatelliteRecord[],
  date: Date,
): PropagatedPosition[] {
  const positions: PropagatedPosition[] = [];

  for (const { noradId, satrec } of records) {
    const pos = propagateSatellite(satrec, date);
    if (!pos) continue;
    positions.push({ noradId, ...pos });
  }

  return positions;
}

function lookAnglesFromEciPosition(
  position: { x: number; y: number; z: number },
  observer: ObserverLocation,
  date: Date,
): { azimuth: number; elevation: number; rangeKm: number } {
  const gmst = gstime(date);
  const observerGd = {
    latitude: (observer.latitude * Math.PI) / 180,
    longitude: (observer.longitude * Math.PI) / 180,
    height: observer.altitudeKm,
  };

  const satelliteEcf = eciToEcf(position, gmst);
  const look = ecfToLookAngles(observerGd, satelliteEcf);
  const elevationDeg = (look.elevation * 180) / Math.PI;
  const azimuthDeg = ((look.azimuth * 180) / Math.PI + 360) % 360;

  return {
    azimuth: azimuthDeg,
    elevation: elevationDeg,
    rangeKm: look.rangeSat,
  };
}

export function computeLookAngles(
  satrec: SatRec,
  observer: ObserverLocation,
  date: Date,
): { azimuth: number; elevation: number; rangeKm: number } | null {
  const positionAndVelocity = propagate(satrec, date);
  if (!isEciPosition(positionAndVelocity.position)) return null;
  return lookAnglesFromEciPosition(positionAndVelocity.position, observer, date);
}

export function propagateWithLook(
  satrec: SatRec,
  observer: ObserverLocation,
  date: Date,
): {
  position: PropagatedPosition;
  look: { azimuth: number; elevation: number; rangeKm: number };
} | null {
  const positionAndVelocity = propagate(satrec, date);
  if (!isEciPosition(positionAndVelocity.position)) return null;

  const gmst = gstime(date);
  const geodetic = eciToGeodetic(positionAndVelocity.position, gmst);
  const latitude = degreesLat(geodetic.latitude);
  const longitude = degreesLong(geodetic.longitude);
  const altitudeKm = geodetic.height;

  if (!isValidCoordinate(latitude, longitude) || !Number.isFinite(altitudeKm)) {
    return null;
  }

  return {
    position: { noradId: '', latitude, longitude, altitudeKm },
    look: lookAnglesFromEciPosition(positionAndVelocity.position, observer, date),
  };
}

export function computeGroundTrack(
  satrec: SatRec,
  start: Date,
  minutes: number,
  stepSeconds = 60,
): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  const steps = Math.floor((minutes * 60) / stepSeconds);

  for (let i = 0; i <= steps; i++) {
    const date = new Date(start.getTime() + i * stepSeconds * 1000);
    const pos = propagateSatellite(satrec, date);
    if (pos) points.push([pos.latitude, pos.longitude]);
  }

  return points;
}

export function isStationarySatellite(
  satrec: SatRec,
  date: Date,
  windowMinutes = 60,
): boolean {
  const posStart = propagateSatellite(satrec, date);
  const posEnd = propagateSatellite(
    satrec,
    new Date(date.getTime() + windowMinutes * 60 * 1000),
  );
  if (!posStart || !posEnd) return false;

  const latDelta = Math.abs(posStart.latitude - posEnd.latitude);
  const lonDelta = Math.abs(posStart.longitude - posEnd.longitude);
  const lonDeltaWrapped = Math.min(lonDelta, 360 - lonDelta);

  return latDelta < 0.5 && lonDeltaWrapped < 0.5;
}

export function computeOrbitTrack(
  satrec: SatRec,
  now: Date,
  pastMinutes = 45,
  futureMinutes = 45,
  stepSeconds = 90,
): Array<[number, number]> {
  const past = computeGroundTrack(
    satrec,
    new Date(now.getTime() - pastMinutes * 60 * 1000),
    pastMinutes,
    stepSeconds,
  );
  const future = computeGroundTrack(satrec, now, futureMinutes, stepSeconds);
  return [...past, ...future].filter(([lat, lng]) => isValidCoordinate(lat, lng));
}

export function estimateFootprintRadiusKm(altitudeKm: number): number {
  const earthRadiusKm = 6371;
  const horizonAngle = Math.acos(earthRadiusKm / (earthRadiusKm + altitudeKm));
  return earthRadiusKm * horizonAngle;
}
