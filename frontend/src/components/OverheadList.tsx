import type { OverheadSatellite, SatelliteSummary } from '../types';
import { azimuthToCompass } from '../utils/format';
import { colorForNoradId } from '../utils/satelliteColors';

interface OverheadListProps {
  overhead: OverheadSatellite[];
  satellites: SatelliteSummary[];
  selectedNoradId: string | null;
  onSelect: (noradId: string) => void;
}

export function OverheadList({
  overhead,
  satellites,
  selectedNoradId,
  onSelect,
}: OverheadListProps) {
  const nameMap = new Map(satellites.map((s) => [s.noradId, s.name]));

  if (overhead.length === 0) {
    return (
      <p className="text-xs text-slate-400">
        No satellites above the minimum elevation at your location right now.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-slate-700 text-[11px] text-slate-400">
            <th className="py-1 pr-1.5">Satellite</th>
            <th className="py-1 pr-1.5">Az</th>
            <th className="py-1 pr-1.5">El</th>
            <th className="hidden py-1 sm:table-cell">Range</th>
          </tr>
        </thead>
        <tbody>
          {overhead.map((sat) => {
            const selected = sat.noradId === selectedNoradId;
            const name = nameMap.get(sat.noradId) ?? sat.noradId;
            return (
              <tr
                key={sat.noradId}
                className={`cursor-pointer border-b border-slate-800 ${
                  selected ? 'bg-sky-900/30' : 'hover:bg-slate-800/50'
                }`}
                onClick={() => onSelect(sat.noradId)}
              >
                <td className="max-w-[120px] truncate py-1 pr-1.5">
                  <p className="flex items-center gap-1.5 truncate font-medium text-slate-100">
                    <span
                      className="inline-block h-2 w-2 shrink-0 rounded-full"
                      style={{ background: colorForNoradId(sat.noradId) }}
                    />
                    {name}
                  </p>
                </td>
                <td className="whitespace-nowrap py-1 pr-1.5 font-mono text-[11px]">
                  {sat.azimuth.toFixed(0)}&deg; {azimuthToCompass(sat.azimuth)}
                </td>
                <td className="py-1 pr-1.5 font-mono text-[11px] text-emerald-300">
                  {sat.elevation.toFixed(1)}&deg;
                </td>
                <td className="hidden py-1 font-mono text-[11px] sm:table-cell">
                  {sat.rangeKm.toFixed(0)} km
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
