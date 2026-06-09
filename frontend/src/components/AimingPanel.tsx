import { useMemo } from 'react';
import type { ObserverLocation, SatellitePass } from '../types';
import { computeLookAngles } from '../services/propagation';
import { computePassTrack, computeRangeRate } from '../services/observation';
import type { SatelliteRecord } from '../services/propagation';
import { azimuthToCompass, formatCountdown, formatRangeRate } from '../utils/format';
import { colorForNoradId } from '../utils/satelliteColors';
import { SkyPlot } from './SkyPlot';

interface AimingPanelProps {
  noradId: string;
  satelliteName: string;
  getRecord: (noradId: string) => SatelliteRecord | undefined;
  observer: ObserverLocation;
  now: Date;
  passes: SatellitePass[];
  compact?: boolean;
  showPlot?: boolean;
}

export function AimingPanel({
  noradId,
  satelliteName,
  getRecord,
  observer,
  now,
  passes,
  compact = false,
  showPlot = true,
}: AimingPanelProps) {
  const record = getRecord(noradId);

  const look = useMemo(() => {
    if (!record) return null;
    return computeLookAngles(record.satrec, observer, now);
  }, [record, observer, now]);

  const rangeRate = useMemo(() => {
    if (!record) return 0;
    return computeRangeRate(record.satrec, observer, now);
  }, [record, observer, now]);

  const nextPass = useMemo(
    () => passes.find((p) => p.los.getTime() > now.getTime()) ?? null,
    [passes, now],
  );

  const passTrack = useMemo(() => {
    if (!record || !nextPass) return [];
    return computePassTrack(record.satrec, observer, nextPass.aos, nextPass.los, 20);
  }, [record, observer, nextPass]);

  if (!record || !look) {
    return <p className="text-xs text-slate-400">Unable to compute look angles for this satellite.</p>;
  }

  const aboveHorizon = look.elevation >= 0;
  const plotSize = compact ? 160 : 200;
  const valueClass = compact ? 'text-base font-semibold' : 'text-xl font-semibold';
  const cardClass = compact ? 'rounded bg-slate-950 p-1.5' : 'rounded-lg bg-slate-950 p-2.5';
  const labelClass = 'text-[10px] uppercase tracking-wide text-slate-500';
  const subClass = 'text-[11px] leading-tight text-slate-400';

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      <div
        className={`grid gap-1.5 ${
          compact ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-4'
        }`}
      >
        <div className={cardClass}>
          <p className={labelClass}>Azimuth</p>
          <p className={`${valueClass} text-sky-300`}>{look.azimuth.toFixed(1)}&deg;</p>
          <p className={subClass}>{azimuthToCompass(look.azimuth)}</p>
        </div>
        <div className={cardClass}>
          <p className={labelClass}>Elevation</p>
          <p className={`${valueClass} text-emerald-300`}>{look.elevation.toFixed(1)}&deg;</p>
          <p className={subClass}>{aboveHorizon ? 'Above horizon' : 'Below horizon'}</p>
        </div>
        <div className={cardClass}>
          <p className={labelClass}>Range</p>
          <p className={`${valueClass} text-slate-200`}>{look.rangeKm.toFixed(0)} km</p>
          <p className={subClass}>{formatRangeRate(rangeRate)}</p>
        </div>
        <div className={cardClass}>
          <p className={labelClass}>Next pass</p>
          {nextPass ? (
            <>
              <p className={`${compact ? 'text-sm' : 'text-base'} font-semibold text-amber-300`}>
                {aboveHorizon ? 'In progress' : formatCountdown(nextPass.aos, now)}
              </p>
              <p className={subClass}>
                Max {nextPass.maxElevation.toFixed(0)}&deg; @ {nextPass.maxElevationAzimuth.toFixed(0)}&deg;
              </p>
            </>
          ) : (
            <p className={subClass}>No upcoming pass</p>
          )}
        </div>
      </div>

      <p className={`${labelClass} text-slate-500`}>
        Point antenna: {azimuthToCompass(look.azimuth)} at {look.elevation.toFixed(1)}&deg;
      </p>

      {showPlot && (
        <div className={`mx-auto w-full ${compact ? 'max-w-[160px]' : 'max-w-[200px]'}`}>
          <SkyPlot
            size={plotSize}
            points={[
              {
                noradId,
                label: satelliteName,
                azimuth: look.azimuth,
                elevation: Math.max(look.elevation, 0),
                color: colorForNoradId(noradId),
                selected: true,
              },
            ]}
            tracks={
              passTrack.length > 1
                ? [
                    {
                      noradId,
                      color: colorForNoradId(noradId),
                      points: passTrack,
                      selected: true,
                    },
                  ]
                : []
            }
            currentPoint={
              aboveHorizon ? { azimuth: look.azimuth, elevation: look.elevation } : undefined
            }
          />
        </div>
      )}
    </div>
  );
}
