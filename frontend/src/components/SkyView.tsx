import { useMemo, useState } from 'react';
import type { ObserverLocation, SatelliteSummary } from '../types';
import type { SatelliteRecord } from '../services/propagation';
import { useOverhead } from '../hooks/useOverhead';
import { useUpcomingPasses } from '../hooks/useUpcomingPasses';
import { OverheadList } from './OverheadList';
import { SkyPlot, overheadToSkyPoints, type SkyPlotSatelliteTrack } from './SkyPlot';
import { UpcomingPasses } from './UpcomingPasses';
import { AimingPanel } from './AimingPanel';
import { predictPasses } from '../services/passes';
import { computeVisibleSkyTrack } from '../services/observation';
import { isStationarySatellite } from '../services/propagation';
import { colorForNoradId } from '../utils/satelliteColors';

interface SkyViewProps {
  satellites: SatelliteSummary[];
  records: SatelliteRecord[];
  observer: ObserverLocation;
  now: Date;
  selectedNoradId: string | null;
  onSelect: (noradId: string) => void;
  getRecord: (noradId: string) => SatelliteRecord | undefined;
}

export function SkyView({
  satellites,
  records,
  observer,
  now,
  selectedNoradId,
  onSelect,
  getRecord,
}: SkyViewProps) {
  const [minElevation, setMinElevation] = useState(0);
  const [passMinElevation, setPassMinElevation] = useState(10);

  const overhead = useOverhead(records, observer, now, minElevation);
  const { passes, computing, progress, error } = useUpcomingPasses(satellites, observer, {
    minElevationDeg: passMinElevation,
    hours: 12,
    maxResults: 50,
  });

  const nameMap = useMemo(
    () => new Map(satellites.map((s) => [s.noradId, s.name])),
    [satellites],
  );

  const skyPoints = useMemo(
    () => overheadToSkyPoints(overhead, nameMap, selectedNoradId),
    [overhead, nameMap, selectedNoradId],
  );

  const trackTimeBucket = Math.floor(now.getTime() / 30_000);

  const skyTracks = useMemo((): SkyPlotSatelliteTrack[] => {
    const trackDate = new Date(trackTimeBucket * 30_000);
    const tracks: SkyPlotSatelliteTrack[] = [];

    for (const sat of overhead) {
      const record = getRecord(sat.noradId);
      if (!record || isStationarySatellite(record.satrec, trackDate)) continue;

      const points = computeVisibleSkyTrack(record.satrec, observer, trackDate);
      if (points.length < 2) continue;

      tracks.push({
        noradId: sat.noradId,
        color: colorForNoradId(sat.noradId),
        points,
        selected: sat.noradId === selectedNoradId,
      });
    }

    return tracks;
  }, [overhead, getRecord, observer, trackTimeBucket, selectedNoradId]);

  const selectedPasses = useMemo(() => {
    if (!selectedNoradId) return [];
    const record = getRecord(selectedNoradId);
    if (!record) return [];
    return predictPasses(record.satrec, observer, now, 2, 5, {
      minElevationDeg: passMinElevation,
      refine: true,
    });
  }, [selectedNoradId, getRecord, observer, now, passMinElevation]);

  const selectedName = selectedNoradId
    ? (nameMap.get(selectedNoradId) ?? selectedNoradId)
    : null;

  const sectionClass =
    'space-y-2 rounded-md border border-slate-800 bg-slate-900/40 p-2.5 sm:space-y-2.5 sm:p-3';

  return (
    <div className="panel-scroll grid min-h-0 flex-1 grid-cols-1 gap-2 overflow-y-auto p-2 sm:gap-3 sm:p-3 xl:grid-cols-[minmax(0,280px)_minmax(0,1fr)_minmax(0,320px)]">
      <section className={sectionClass}>
        <div>
          <h2 className="text-sm font-semibold text-slate-100">Overhead Now</h2>
          <p className="text-[11px] text-slate-400">
            {overhead.length} above {minElevation}&deg;
          </p>
        </div>

        <label className="flex items-center gap-1.5 text-xs text-slate-300">
          <span className="shrink-0">Min el</span>
          <input
            type="range"
            min={0}
            max={30}
            step={1}
            value={minElevation}
            onChange={(e) => setMinElevation(Number(e.target.value))}
            className="min-w-0 flex-1"
          />
          <span className="w-8 shrink-0 text-right font-mono text-[11px]">{minElevation}&deg;</span>
        </label>

        <OverheadList
          overhead={overhead}
          satellites={satellites}
          selectedNoradId={selectedNoradId}
          onSelect={onSelect}
        />
      </section>

      <section className={`${sectionClass} flex flex-col items-center`}>
        <div className="w-full text-center">
          <h2 className="text-sm font-semibold text-slate-100">Sky Plot</h2>
          <p className="text-[11px] text-slate-400">Zenith center, north up</p>
        </div>

        <div className="mx-auto w-full max-w-[220px] sm:max-w-[260px] lg:max-w-[280px]">
          <SkyPlot size={280} points={skyPoints} tracks={skyTracks} onSelect={onSelect} />
        </div>

        {selectedNoradId && selectedName && (
          <div className="w-full border-t border-slate-800 pt-2">
            <h3 className="mb-1.5 truncate text-xs font-semibold uppercase tracking-wide text-slate-300">
              Aiming: {selectedName}
            </h3>
            <AimingPanel
              noradId={selectedNoradId}
              satelliteName={selectedName}
              getRecord={getRecord}
              observer={observer}
              now={now}
              passes={selectedPasses}
              compact
              showPlot={false}
            />
          </div>
        )}
      </section>

      <section className={sectionClass}>
        <div>
          <h2 className="text-sm font-semibold text-slate-100">Upcoming Passes</h2>
          <p className="text-[11px] text-slate-400">Next 12 hours</p>
        </div>

        <label className="flex items-center gap-1.5 text-xs text-slate-300">
          <span className="shrink-0">Min el</span>
          <input
            type="range"
            min={5}
            max={30}
            step={1}
            value={passMinElevation}
            onChange={(e) => setPassMinElevation(Number(e.target.value))}
            className="min-w-0 flex-1"
          />
          <span className="w-8 shrink-0 text-right font-mono text-[11px]">
            {passMinElevation}&deg;
          </span>
        </label>

        <UpcomingPasses
          passes={passes}
          satellites={satellites}
          computing={computing}
          progress={progress}
          error={error}
          now={now}
          onSelect={onSelect}
          selectedNoradId={selectedNoradId}
        />
      </section>
    </div>
  );
}
