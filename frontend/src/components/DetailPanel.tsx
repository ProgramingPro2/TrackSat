import { useEffect, useMemo, useState } from 'react';
import { fetchSatelliteDetail } from '../services/api';
import { predictPasses } from '../services/passes';
import type { ObserverLocation, SatelliteDetail } from '../types';
import { formatKeplerianBlock, formatTleBlock } from '../utils/format';
import { CopyButton } from './CopyButton';
import { FrequencyBadge } from './FrequencyBadge';
import { PassTable } from './PassTable';
import { AimingPanel } from './AimingPanel';
import type { SatelliteRecord } from '../services/propagation';

interface DetailPanelProps {
  noradId: string | null;
  getRecord: (noradId: string) => SatelliteRecord | undefined;
  observer: ObserverLocation;
  now: Date;
}

export function DetailPanel({ noradId, getRecord, observer, now }: DetailPanelProps) {
  const [detail, setDetail] = useState<SatelliteDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!noradId) {
      setDetail(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchSatelliteDetail(noradId)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load detail');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [noradId]);

  const passes = useMemo(() => {
    if (!noradId) return [];
    const record = getRecord(noradId);
    if (!record) return [];
    return predictPasses(record.satrec, observer, now, 2, 5, { refine: true });
  }, [noradId, getRecord, observer, now]);

  if (!noradId) {
    return (
      <div className="p-3 text-xs text-slate-400">
        Select a satellite to view frequencies, orbital elements, and upcoming passes.
      </div>
    );
  }

  if (loading && !detail) {
    return <div className="p-3 text-xs text-slate-400">Loading satellite details...</div>;
  }

  if (error) {
    return <div className="p-3 text-xs text-red-400">{error}</div>;
  }

  if (!detail) return null;

  const tleText = formatTleBlock(detail.tle);
  const keplerianText = formatKeplerianBlock(detail.name, detail.noradId, detail.keplerian);

  return (
    <div className="panel-scroll space-y-3 p-2.5 sm:p-3">
      <div>
        <h2 className="text-base font-semibold text-slate-100">{detail.name}</h2>
        <p className="text-xs text-slate-400">NORAD {detail.noradId}</p>
        <p className="text-[11px] text-slate-500">{detail.groups.join(', ')}</p>
      </div>

      {detail.transmitters.length > 0 ? (
        <section>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-300">
            Radio Frequencies
          </h3>
          <div className="space-y-1.5">
            {detail.transmitters.map((tx) => (
              <FrequencyBadge key={tx.uuid} transmitter={tx} />
            ))}
          </div>
        </section>
      ) : (
        <p className="text-xs text-slate-400">No active transmitter data in SatNOGS for this satellite.</p>
      )}

      <section>
        <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-300">
          Orbital Data
        </h3>
        <div className="flex flex-wrap gap-1.5">
          <CopyButton label="Copy TLE" text={tleText} />
          <CopyButton label="Copy Keplerian" text={keplerianText} />
        </div>
        <pre className="mt-2 overflow-x-auto rounded bg-slate-950 p-2 text-[11px] leading-relaxed text-slate-300">
          {tleText}
        </pre>
        <pre className="mt-1.5 overflow-x-auto rounded bg-slate-950 p-2 text-[11px] leading-relaxed text-slate-300">
          {keplerianText}
        </pre>
      </section>

      <section>
        <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-300">
          Antenna Aiming
        </h3>
        <AimingPanel
          noradId={detail.noradId}
          satelliteName={detail.name}
          getRecord={getRecord}
          observer={observer}
          now={now}
          passes={passes}
          compact
        />
      </section>

      <section>
        <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-300">
          Upcoming Passes (10 deg min)
        </h3>
        <PassTable passes={passes} />
      </section>
    </div>
  );
}
