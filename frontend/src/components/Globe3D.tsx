import { lazy, Suspense, useMemo } from 'react';
import type { PropagatedPosition } from '../types';
import { isValidCoordinate } from '../services/propagation';

const Globe = lazy(() => import('react-globe.gl'));

interface Globe3DProps {
  positions: PropagatedPosition[];
  selectedNoradId: string | null;
  onSelect: (noradId: string) => void;
}

export function Globe3D({ positions, selectedNoradId, onSelect }: Globe3DProps) {
  const points = useMemo(
    () =>
      positions
        .filter((p) => isValidCoordinate(p.latitude, p.longitude))
        .map((p) => ({
          lat: p.latitude,
          lng: p.longitude,
          alt: p.altitudeKm / 6371,
          noradId: p.noradId,
          size: p.noradId === selectedNoradId ? 0.6 : 0.3,
          color: p.noradId === selectedNoradId ? '#fbbf24' : '#38bdf8',
        })),
    [positions, selectedNoradId],
  );

  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center bg-slate-900 text-slate-400">
          Loading 3D globe...
        </div>
      }
    >
      <div className="h-full w-full">
        <Globe
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
          backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
          pointsData={points}
          pointLat="lat"
          pointLng="lng"
          pointAltitude="alt"
          pointRadius="size"
          pointColor="color"
          onPointClick={(point: { noradId?: string }) => {
            if (point.noradId) onSelect(point.noradId);
          }}
        />
      </div>
    </Suspense>
  );
}
