import { useEffect, useMemo, useRef, useState } from 'react';
import type { ObserverLocation, OverheadSatellite } from '../types';
import { computeOverhead } from '../services/observation';
import type { SatelliteRecord } from '../services/propagation';

const THROTTLE_MS = 2000;

export function useOverhead(
  records: SatelliteRecord[],
  observer: ObserverLocation,
  now: Date,
  minElevationDeg = 0,
): OverheadSatellite[] {
  const [overhead, setOverhead] = useState<OverheadSatellite[]>([]);
  const lastComputeRef = useRef(0);
  const observerKey = `${observer.latitude},${observer.longitude},${observer.altitudeKm}`;

  const recordsKey = useMemo(
    () => records.map((r) => r.noradId).join(','),
    [records],
  );

  useEffect(() => {
    const elapsed = now.getTime() - lastComputeRef.current;
    if (elapsed < THROTTLE_MS && lastComputeRef.current > 0) return;

    lastComputeRef.current = now.getTime();
    setOverhead(computeOverhead(records, observer, now, minElevationDeg));
  }, [records, recordsKey, observer, observerKey, now, minElevationDeg]);

  return overhead;
}
