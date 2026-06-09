import { useCallback, useEffect, useRef, useState } from 'react';
import type { ObserverLocation, SatelliteSummary, UpcomingPass } from '../types';
import type { PassWorkerRequest, PassWorkerResponse } from '../services/passWorker';

export interface UseUpcomingPassesOptions {
  hours?: number;
  maxResults?: number;
  minElevationDeg?: number;
  refreshIntervalMs?: number;
}

export interface PassComputationProgress {
  processed: number;
  total: number;
}

function deserializePasses(
  passes: NonNullable<PassWorkerResponse['passes']>,
): UpcomingPass[] {
  return passes.map((p) => ({
    noradId: p.noradId,
    aos: new Date(p.aos),
    los: new Date(p.los),
    maxElevation: p.maxElevation,
    maxElevationAzimuth: p.maxElevationAzimuth,
    durationMinutes: p.durationMinutes,
    aosAzimuth: p.aosAzimuth,
    losAzimuth: p.losAzimuth,
  }));
}

export function useUpcomingPasses(
  satellites: SatelliteSummary[],
  observer: ObserverLocation,
  options: UseUpcomingPassesOptions = {},
) {
  const {
    hours = 12,
    maxResults = 50,
    minElevationDeg = 10,
    refreshIntervalMs = 5 * 60 * 1000,
  } = options;

  const [passes, setPasses] = useState<UpcomingPass[]>([]);
  const [computing, setComputing] = useState(false);
  const [progress, setProgress] = useState<PassComputationProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!workerRef.current) {
      workerRef.current = new Worker(new URL('../services/passWorker.ts', import.meta.url), {
        type: 'module',
      });
    }

    const worker = workerRef.current;

    const handleMessage = (event: MessageEvent<PassWorkerResponse>) => {
      if (event.data.requestId !== requestIdRef.current) return;

      if (event.data.type === 'error') {
        setError(event.data.error ?? 'Pass computation failed');
        setComputing(false);
        setProgress(null);
        return;
      }

      setPasses(deserializePasses(event.data.passes ?? []));

      if (event.data.processed !== undefined && event.data.total !== undefined) {
        setProgress({ processed: event.data.processed, total: event.data.total });
      }

      if (event.data.type === 'result') {
        setComputing(false);
        setProgress(null);
      }
    };

    worker.addEventListener('message', handleMessage);

    return () => {
      worker.removeEventListener('message', handleMessage);
    };
  }, []);

  const compute = useCallback(() => {
    if (satellites.length === 0) {
      setPasses([]);
      setComputing(false);
      setProgress(null);
      return;
    }

    const worker = workerRef.current;
    if (!worker) return;

    const requestId = ++requestIdRef.current;
    setComputing(true);
    setError(null);
    setProgress(null);

    const request: PassWorkerRequest = {
      type: 'compute',
      requestId,
      satellites,
      observer,
      startIso: new Date().toISOString(),
      hours,
      minElevationDeg,
      maxResults,
    };

    worker.postMessage(request);
  }, [satellites, observer, hours, minElevationDeg, maxResults]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => compute(), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [compute]);

  useEffect(() => {
    const interval = setInterval(() => compute(), refreshIntervalMs);
    return () => clearInterval(interval);
  }, [compute, refreshIntervalMs]);

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  return { passes, computing, progress, error, refresh: compute };
}
