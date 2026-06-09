import type { OverheadSatellite } from '../types';
import { colorForNoradId } from '../utils/satelliteColors';

export interface SkyPlotPoint {
  noradId: string;
  label?: string;
  azimuth: number;
  elevation: number;
  color?: string;
  selected?: boolean;
}

export interface SkyPlotTrackPoint {
  azimuth: number;
  elevation: number;
}

export interface SkyPlotSatelliteTrack {
  noradId: string;
  color: string;
  points: SkyPlotTrackPoint[];
  selected?: boolean;
}

interface SkyPlotProps {
  points: SkyPlotPoint[];
  tracks?: SkyPlotSatelliteTrack[];
  track?: SkyPlotTrackPoint[];
  currentPoint?: SkyPlotTrackPoint;
  size?: number;
  onSelect?: (noradId: string) => void;
  className?: string;
}

function polarToSvg(
  azimuthDeg: number,
  elevationDeg: number,
  cx: number,
  cy: number,
  radius: number,
): { x: number; y: number } {
  const r = radius * ((90 - elevationDeg) / 90);
  const azRad = (azimuthDeg * Math.PI) / 180;
  return {
    x: cx + r * Math.sin(azRad),
    y: cy - r * Math.cos(azRad),
  };
}

function trackToPolyline(
  track: SkyPlotTrackPoint[],
  cx: number,
  cy: number,
  radius: number,
): string {
  return track
    .map((p) => {
      const { x, y } = polarToSvg(p.azimuth, p.elevation, cx, cy, radius);
      return `${x},${y}`;
    })
    .join(' ');
}

export function SkyPlot({
  points,
  tracks = [],
  track = [],
  currentPoint,
  size = 240,
  onSelect,
  className = '',
}: SkyPlotProps) {
  const padding = Math.max(16, Math.round(size * 0.08));
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - padding;

  const elevationRings = [0, 30, 60];
  const compassLabels = [
    { label: 'N', az: 0 },
    { label: 'E', az: 90 },
    { label: 'S', az: 180 },
    { label: 'W', az: 270 },
  ];

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      preserveAspectRatio="xMidYMid meet"
      className={`mx-auto block h-auto w-full max-w-full ${className}`}
      role="img"
      aria-label="Polar sky plot"
    >
      <rect x={0} y={0} width={size} height={size} fill="#0f172a" rx={6} />

      {elevationRings.map((el) => {
        const r = radius * ((90 - el) / 90);
        return (
          <circle
            key={el}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="#334155"
            strokeWidth={1}
            strokeDasharray={el === 0 ? undefined : '4 4'}
          />
        );
      })}

      {[0, 45, 90, 135, 180, 225, 270, 315].map((az) => {
        const end = polarToSvg(az, 0, cx, cy, radius);
        return (
          <line
            key={az}
            x1={cx}
            y1={cy}
            x2={end.x}
            y2={end.y}
            stroke="#1e293b"
            strokeWidth={1}
          />
        );
      })}

      {compassLabels.map(({ label, az }) => {
        const pos = polarToSvg(az, -8, cx, cy, radius);
        return (
          <text
            key={label}
            x={pos.x}
            y={pos.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#94a3b8"
            fontSize={size < 220 ? 9 : 10}
            fontWeight={600}
          >
            {label}
          </text>
        );
      })}

      {tracks.map(({ noradId, color, points: trackPoints, selected }) =>
        trackPoints.length > 1 ? (
          <polyline
            key={`track-${noradId}`}
            points={trackToPolyline(trackPoints, cx, cy, radius)}
            fill="none"
            stroke={color}
            strokeWidth={selected ? 2 : 1.5}
            strokeOpacity={selected ? 0.9 : 0.55}
          />
        ) : null,
      )}

      {track.length > 1 && (
        <polyline
          points={trackToPolyline(track, cx, cy, radius)}
          fill="none"
          stroke="#38bdf8"
          strokeWidth={2}
          strokeOpacity={0.7}
        />
      )}

      {currentPoint && (
        <circle
          cx={polarToSvg(currentPoint.azimuth, currentPoint.elevation, cx, cy, radius).x}
          cy={polarToSvg(currentPoint.azimuth, currentPoint.elevation, cx, cy, radius).y}
          r={6}
          fill="#fbbf24"
          stroke="#fef3c7"
          strokeWidth={1.5}
        />
      )}

      {points.map((point) => {
        const { x, y } = polarToSvg(point.azimuth, point.elevation, cx, cy, radius);
        const fill = point.color ?? (point.selected ? '#38bdf8' : '#22c55e');
        const stroke = point.selected ? '#fff' : 'rgba(15,23,42,0.8)';
        return (
          <g key={point.noradId}>
            <circle
              cx={x}
              cy={y}
              r={point.selected ? 5 : 4}
              fill={fill}
              stroke={stroke}
              strokeWidth={point.selected ? 1.5 : 1}
              className={onSelect ? 'cursor-pointer' : undefined}
              onClick={() => onSelect?.(point.noradId)}
            />
            {point.label && point.selected && (
              <text
                x={x}
                y={y - 12}
                textAnchor="middle"
                fill="#e2e8f0"
                fontSize={9}
              >
                {point.label.length > 16 ? `${point.label.slice(0, 14)}...` : point.label}
              </text>
            )}
          </g>
        );
      })}

      <circle cx={cx} cy={cy} r={2} fill="#64748b" />
    </svg>
  );
}

export function overheadToSkyPoints(
  overhead: OverheadSatellite[],
  nameMap: Map<string, string>,
  selectedNoradId: string | null,
): SkyPlotPoint[] {
  return overhead.map((sat) => ({
    noradId: sat.noradId,
    label: nameMap.get(sat.noradId),
    azimuth: sat.azimuth,
    elevation: sat.elevation,
    color: colorForNoradId(sat.noradId),
    selected: sat.noradId === selectedNoradId,
  }));
}
