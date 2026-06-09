import type { SatelliteSummary } from '../types';

interface SatListProps {
  satellites: SatelliteSummary[];
  selectedNoradId: string | null;
  onSelect: (noradId: string) => void;
  loading?: boolean;
}

export function SatList({ satellites, selectedNoradId, onSelect, loading }: SatListProps) {
  if (loading) {
    return <p className="p-3 text-xs text-slate-400">Loading satellites...</p>;
  }

  if (satellites.length === 0) {
    return <p className="p-3 text-xs text-slate-400">No satellites match your filters.</p>;
  }

  return (
    <ul className="divide-y divide-slate-800">
      {satellites.map((sat) => {
        const selected = sat.noradId === selectedNoradId;
        return (
          <li key={sat.noradId}>
            <button
              type="button"
              onClick={() => onSelect(sat.noradId)}
              className={`w-full px-2.5 py-2 text-left transition sm:px-3 sm:py-2.5 ${
                selected ? 'bg-sky-900/40' : 'hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-start justify-between gap-1.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-100">{sat.name}</p>
                  <p className="text-[11px] text-slate-400">NORAD {sat.noradId}</p>
                </div>
                {sat.hasRadio && (
                  <span className="shrink-0 rounded bg-emerald-900/60 px-1.5 py-0.5 text-[10px] text-emerald-300">
                    Radio
                  </span>
                )}
              </div>
              {sat.frequencySummary && (
                <p className="mt-0.5 truncate text-[11px] text-sky-300">{sat.frequencySummary}</p>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
