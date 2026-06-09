import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GlobeMethods } from 'react-globe.gl';
import type { PropagatedPosition } from '../types';
import { isValidCoordinate } from '../services/propagation';

const Globe = lazy(() => import('react-globe.gl'));

interface Globe3DProps {
  positions: PropagatedPosition[];
  selectedNoradId: string | null;
  onSelect: (noradId: string) => void;
}

function TrackToggleButton({
  isTracking,
  onToggle,
}: {
  isTracking: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`absolute bottom-4 right-4 z-[1000] rounded-md px-3 py-1.5 text-sm font-medium backdrop-blur-sm transition-colors ${
        isTracking
          ? 'border border-sky-400 bg-sky-500/20 text-sky-300'
          : 'border border-slate-500 bg-slate-800/80 text-slate-300 hover:bg-slate-700/80'
      }`}
    >
      {isTracking ? 'Tracking' : 'Track'}
    </button>
  );
}

export function Globe3D({ positions, selectedNoradId, onSelect }: Globe3DProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const [isTracking, setIsTracking] = useState(false);

  useEffect(() => {
    setIsTracking(false);
  }, [selectedNoradId]);

  const stopTracking = useCallback(() => setIsTracking(false), []);

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

  const flyToSelected = useCallback(() => {
    if (!selectedNoradId || !globeRef.current) return;
    const selected = positions.find((p) => p.noradId === selectedNoradId);
    if (selected) {
      globeRef.current.pointOfView(
        { lat: selected.latitude, lng: selected.longitude, altitude: 2.5 },
        1000,
      );
    }
  }, [selectedNoradId, positions]);

  useEffect(() => {
    if (!selectedNoradId || !globeRef.current) return;
    const selected = positions.find((p) => p.noradId === selectedNoradId);
    if (selected) {
      globeRef.current.pointOfView(
        { lat: selected.latitude, lng: selected.longitude, altitude: 2.5 },
        1000,
      );
    }
    // Fly once when selection changes; positions are read from the current render.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: only re-center on new selection
  }, [selectedNoradId]);

  useEffect(() => {
    if (!isTracking || !selectedNoradId) return;
    flyToSelected();
  }, [positions, isTracking, selectedNoradId, flyToSelected]);

  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center bg-slate-900 text-slate-400">
          Loading 3D globe...
        </div>
      }
    >
      <div className="relative h-full w-full">
        <div
          className="h-full w-full"
          onMouseDown={() => {
            if (isTracking) stopTracking();
          }}
        >
          <Globe
            ref={globeRef}
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

        {selectedNoradId && (
          <TrackToggleButton
            isTracking={isTracking}
            onToggle={() => setIsTracking((tracking) => !tracking)}
          />
        )}
      </div>
    </Suspense>
  );
}
