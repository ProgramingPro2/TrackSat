import type { SatelliteSummary, UpcomingPass } from '../types';
import { formatCountdown, formatDateTime, formatDuration } from '../utils/format';

interface UpcomingPassesProps {
  passes: UpcomingPass[];
  satellites: SatelliteSummary[];
  computing?: boolean;
  progress?: { processed: number; total: number } | null;
  error?: string | null;
  now?: Date;
  onSelect?: (noradId: string) => void;
  selectedNoradId?: string | null;
}

function ScanProgressBar({
  progress,
  label,
}: {
  progress: { processed: number; total: number };
  label?: string;
}) {
  const pct = Math.min(100, Math.round((progress.processed / progress.total) * 100));

  return (
    <div className="space-y-1">
      <div
        className="h-1 w-full overflow-hidden rounded-full bg-slate-800"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Pass scan progress"
      >
        <div
          className="h-full rounded-full bg-sky-500 transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[11px] text-slate-500">
        {label ?? `Scanning satellites (${progress.processed}/${progress.total})`}
      </p>
    </div>
  );
}

export function UpcomingPasses({
  passes,
  satellites,
  computing,
  progress,
  error,
  now = new Date(),
  onSelect,
  selectedNoradId,
}: UpcomingPassesProps) {
  const nameMap = new Map(satellites.map((s) => [s.noradId, s.name]));

  if (computing && passes.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-slate-400">Computing upcoming passes...</p>
        {progress && progress.total > 0 && <ScanProgressBar progress={progress} />}
      </div>
    );
  }

  if (error) {
    return <p className="text-xs text-red-400">{error}</p>;
  }

  if (passes.length === 0) {
    return (
      <p className="text-xs text-slate-400">
        No passes above the minimum elevation in the next 12 hours for the filtered catalog.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      {computing && (
        <div className="mb-2">
          {progress && progress.total > 0 ? (
            <ScanProgressBar progress={progress} />
          ) : (
            <p className="text-[11px] text-slate-500">Refreshing pass schedule...</p>
          )}
        </div>
      )}
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-slate-700 text-[11px] text-slate-400">
            <th className="py-1 pr-1.5">Satellite</th>
            <th className="hidden py-1 pr-1.5 md:table-cell">AOS</th>
            <th className="py-1 pr-1.5">Max El</th>
            <th className="hidden py-1 pr-1.5 lg:table-cell">Track</th>
            <th className="hidden py-1 sm:table-cell">Dur</th>
          </tr>
        </thead>
        <tbody>
          {passes.map((pass, idx) => {
            const selected = pass.noradId === selectedNoradId;
            const inProgress =
              pass.aos.getTime() <= now.getTime() && pass.los.getTime() > now.getTime();
            const trackText =
              pass.aosAzimuth !== undefined && pass.losAzimuth !== undefined
                ? `${pass.aosAzimuth.toFixed(0)}°–${pass.losAzimuth.toFixed(0)}°`
                : '--';
            const name = nameMap.get(pass.noradId) ?? pass.noradId;

            return (
              <tr
                key={`${pass.noradId}-${idx}`}
                className={`border-b border-slate-800 ${
                  onSelect ? 'cursor-pointer hover:bg-slate-800/50' : ''
                } ${selected ? 'bg-sky-900/30' : ''}`}
                onClick={() => onSelect?.(pass.noradId)}
              >
                <td className="max-w-[130px] py-1 pr-1.5">
                  <p className="truncate font-medium text-slate-100">{name}</p>
                  <p className="text-[11px] text-slate-500">
                    {inProgress ? 'Now' : formatCountdown(pass.aos, now)}
                  </p>
                </td>
                <td className="hidden py-1 pr-1.5 font-mono text-[11px] md:table-cell">
                  {formatDateTime(pass.aos)}
                </td>
                <td className="whitespace-nowrap py-1 pr-1.5 text-[11px]">
                  {pass.maxElevation.toFixed(0)}&deg; @{pass.maxElevationAzimuth.toFixed(0)}&deg;
                </td>
                <td className="hidden py-1 pr-1.5 font-mono text-[11px] lg:table-cell">
                  {trackText}
                </td>
                <td className="hidden py-1 text-[11px] sm:table-cell">
                  {formatDuration(pass.durationMinutes)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
