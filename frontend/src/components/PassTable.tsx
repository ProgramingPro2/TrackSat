import type { SatellitePass } from '../types';
import { formatDateTime, formatDuration } from '../utils/format';

interface PassTableProps {
  passes: SatellitePass[];
  loading?: boolean;
}

export function PassTable({ passes, loading }: PassTableProps) {
  if (loading) {
    return <p className="text-xs text-slate-400">Computing passes...</p>;
  }

  if (passes.length === 0) {
    return <p className="text-xs text-slate-400">No passes above 10 degrees in the next 2 days.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-slate-700 text-[11px] text-slate-400">
            <th className="py-1 pr-1.5">AOS</th>
            <th className="hidden py-1 pr-1.5 sm:table-cell">LOS</th>
            <th className="py-1 pr-1.5">Max El</th>
            <th className="hidden py-1 md:table-cell">Dur</th>
          </tr>
        </thead>
        <tbody>
          {passes.map((pass, idx) => (
            <tr key={idx} className="border-b border-slate-800">
              <td className="py-1 pr-1.5 font-mono text-[11px]">{formatDateTime(pass.aos)}</td>
              <td className="hidden py-1 pr-1.5 font-mono text-[11px] sm:table-cell">
                {formatDateTime(pass.los)}
              </td>
              <td className="py-1 pr-1.5 text-[11px]">
                {pass.maxElevation.toFixed(1)}&deg; @{pass.maxElevationAzimuth.toFixed(0)}&deg;
              </td>
              <td className="hidden py-1 text-[11px] md:table-cell">
                {formatDuration(pass.durationMinutes)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
