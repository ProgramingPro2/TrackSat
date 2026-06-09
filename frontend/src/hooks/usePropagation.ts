import { useEffect, useMemo, useState } from 'react';
import type { PropagatedPosition, SatelliteSummary } from '../types';
import {
  createSatelliteRecords,
  propagateAll,
  type SatelliteRecord,
} from '../services/propagation';

export function usePropagation(satellites: SatelliteSummary[], intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date());
  const [positions, setPositions] = useState<PropagatedPosition[]>([]);

  const records: SatelliteRecord[] = useMemo(
    () => createSatelliteRecords(satellites),
    [satellites],
  );

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  useEffect(() => {
    setPositions(propagateAll(records, now));
  }, [records, now]);

  const positionMap = useMemo(() => {
    const map = new Map<string, PropagatedPosition>();
    for (const pos of positions) {
      map.set(pos.noradId, pos);
    }
    return map;
  }, [positions]);

  const getRecord = (noradId: string): SatelliteRecord | undefined =>
    records.find((r) => r.noradId === noradId);

  return { now, positions, positionMap, records, getRecord };
}
