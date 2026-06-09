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

export interface SerializedPass {
  noradId: string;
  aos: string;
  los: string;
  maxElevation: number;
  maxElevationAzimuth: number;
  durationMinutes: number;
  aosAzimuth?: number;
  losAzimuth?: number;
}

export interface PassWorkerResponse {
  type: 'partial' | 'result' | 'error';
  requestId: number;
  passes?: SerializedPass[];
  processed?: number;
  total?: number;
  error?: string;
}

function serializePasses(
  passes: Array<{
    noradId: string;
    aos: Date;
    los: Date;
    maxElevation: number;
    maxElevationAzimuth: number;
    durationMinutes: number;
    aosAzimuth?: number;
    losAzimuth?: number;
  }>,
): SerializedPass[] {
  return passes.map((p) => ({
    noradId: p.noradId,
    aos: p.aos.toISOString(),
    los: p.los.toISOString(),
    maxElevation: p.maxElevation,
    maxElevationAzimuth: p.maxElevationAzimuth,
    durationMinutes: p.durationMinutes,
    aosAzimuth: p.aosAzimuth,
    losAzimuth: p.losAzimuth,
  }));
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

    const passes = predictPassesBatch(
      records,
      msg.observer,
      new Date(msg.startIso),
      msg.hours,
      {
        minElevationDeg: msg.minElevationDeg,
        maxResults: msg.maxResults,
        progressInterval: 3,
      },
      (progress) => {
        const response: PassWorkerResponse = {
          type: progress.done ? 'result' : 'partial',
          requestId: msg.requestId,
          passes: serializePasses(progress.passes),
          processed: progress.processed,
          total: progress.total,
        };
        self.postMessage(response);
      },
    );

    // predictPassesBatch already emits a final progress callback; send result if none was emitted.
    if (records.length === 0) {
      const response: PassWorkerResponse = {
        type: 'result',
        requestId: msg.requestId,
        passes: serializePasses(passes),
        processed: 0,
        total: 0,
      };
      self.postMessage(response);
    }
  } catch (err) {
    const response: PassWorkerResponse = {
      type: 'error',
      requestId: msg.requestId,
      error: err instanceof Error ? err.message : 'Pass computation failed',
    };
    self.postMessage(response);
  }
};
