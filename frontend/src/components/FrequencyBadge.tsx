import { formatFrequencyRange } from '../utils/format';
import type { TransmitterInfo } from '../types';

interface FrequencyBadgeProps {
  transmitter: TransmitterInfo;
}

export function FrequencyBadge({ transmitter }: FrequencyBadgeProps) {
  const uplink = formatFrequencyRange(transmitter.uplinkLow, transmitter.uplinkHigh);
  const downlink = formatFrequencyRange(transmitter.downlinkLow, transmitter.downlinkHigh);

  return (
    <div className="rounded border border-slate-700 bg-slate-800/80 p-2 text-xs">
      <div className="mb-0.5 flex items-center justify-between gap-1.5">
        <span className="truncate font-medium text-slate-100">
          {transmitter.description || transmitter.type}
        </span>
        <span className="shrink-0 rounded bg-slate-700 px-1.5 py-0.5 text-[10px] uppercase text-slate-300">
          {transmitter.mode ?? 'unknown'}
        </span>
      </div>
      {downlink && (
        <p className="text-[11px] text-emerald-300">
          Down: <span className="font-mono">{downlink}</span>
        </p>
      )}
      {uplink && (
        <p className="text-[11px] text-amber-300">
          Up: <span className="font-mono">{uplink}</span>
        </p>
      )}
      {transmitter.baud && (
        <p className="text-[11px] text-slate-400">Baud: {transmitter.baud}</p>
      )}
    </div>
  );
}
