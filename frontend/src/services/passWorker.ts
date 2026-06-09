/// <reference lib="webworker" />

import { twoline2satrec } from 'satellite.js';
import { predictPassesBatch } from './passes';
import type { ObserverLocation, SatelliteSummary } from '../types';

export interface PassWorkerRequest {
  type: 'compute';
  requestId: number;
  satellites: SatelliteSummary[];
  observer: ObserverLocation;
  startIso: string;
  hours: number;
  minElevationDeg: number;
  maxResults: number;
}

export interface PassWorkerResponse {
  type: 'result' | 'error';
  requestId: number;
  passes?: Array<{
    noradId: string;
    aos: string;
    los: string;
    maxElevation: number;
    maxElevationAzimuth: number;
    durationMinutes: number;
    aosAzimuth?: number;
    losAzimuth?: number;
  }>;
  error?: string;
}

self.onmessage = (event: MessageEvent<PassWorkerRequest>) => {
  const msg = event.data;
  if (msg.type !== 'compute') return;

  try {
    const records = msg.satellites
      .map((sat) => {
        try {
          const satrec = twoline2satrec(sat.line1, sat.line2);
          if (satrec.error !== 0) return null;
          return { noradId: sat.noradId, satrec };
        } catch {
          return null;
        }
      })
      .filter((r): r is { noradId: string; satrec: ReturnType<typeof twoline2satrec> } => r !== null);

    const passes = predictPassesBatch(records, msg.observer, new Date(msg.startIso), msg.hours, {
      minElevationDeg: msg.minElevationDeg,
      maxResults: msg.maxResults,
      refine: true,
    });

    const response: PassWorkerResponse = {
      type: 'result',
      requestId: msg.requestId,
      passes: passes.map((p) => ({
        noradId: p.noradId,
        aos: p.aos.toISOString(),
        los: p.los.toISOString(),
        maxElevation: p.maxElevation,
        maxElevationAzimuth: p.maxElevationAzimuth,
        durationMinutes: p.durationMinutes,
        aosAzimuth: p.aosAzimuth,
        losAzimuth: p.losAzimuth,
      })),
    };

    self.postMessage(response);
  } catch (err) {
    const response: PassWorkerResponse = {
      type: 'error',
      requestId: msg.requestId,
      error: err instanceof Error ? err.message : 'Pass computation failed',
    };
    self.postMessage(response);
  }
};
