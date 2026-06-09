import { MapContainer, TileLayer, Circle, Polyline, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useEffect, useMemo, useRef } from 'react';
import type { ObserverLocation, PropagatedPosition, SatelliteSummary } from '../types';
import {
  computeLookAngles,
  computeOrbitTrack,
  estimateFootprintRadiusKm,
  isStationarySatellite,
  isValidCoordinate,
  type SatelliteRecord,
} from '../services/propagation';
import { colorForNoradId } from '../utils/satelliteColors';

interface Map2DProps {
  satellites: SatelliteSummary[];
  positions: PropagatedPosition[];
  selectedNoradId: string | null;
  onSelect: (noradId: string) => void;
  getRecord: (noradId: string) => SatelliteRecord | undefined;
  observer: ObserverLocation;
  now: Date;
}

interface SatelliteTrack {
  noradId: string;
  color: string;
  track: Array<[number, number]>;
  stationary: boolean;
}

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 100);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

function FlyToSelected({
  selectedNoradId,
  positionMap,
}: {
  selectedNoradId: string | null;
  positionMap: Map<string, PropagatedPosition>;
}) {
  const map = useMap();

  useEffect(() => {
    if (!selectedNoradId) return;
    const pos = positionMap.get(selectedNoradId);
    if (pos && isValidCoordinate(pos.latitude, pos.longitude)) {
      map.flyTo([pos.latitude, pos.longitude], Math.max(map.getZoom(), 3), { duration: 0.8 });
    }
  }, [selectedNoradId, positionMap, map]);

  return null;
}

function createSatelliteIcon(color: string, selected: boolean): L.DivIcon {
  const size = selected ? 12 : 8;
  const border = selected ? 2 : 1.5;
  return L.divIcon({
    className: '',
    html: `<div style="background:${color};border:${border}px solid #fff;border-radius:50%;width:${size}px;height:${size}px;box-shadow:0 0 0 ${selected ? 2 : 1}px rgba(255,255,255,0.35);"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export function Map2D({
  satellites,
  positions,
  selectedNoradId,
  onSelect,
  getRecord,
  observer,
  now,
}: Map2DProps) {
  const iconCacheRef = useRef(new Map<string, L.DivIcon>());

  const positionMap = useMemo(() => {
    const map = new Map<string, PropagatedPosition>();
    for (const pos of positions) map.set(pos.noradId, pos);
    return map;
  }, [positions]);

  const selectedPos = selectedNoradId ? positionMap.get(selectedNoradId) : undefined;

  const validPositions = useMemo(
    () => positions.filter((pos) => isValidCoordinate(pos.latitude, pos.longitude)),
    [positions],
  );

  const trackTimeBucket = Math.floor(now.getTime() / 60_000);

  const satelliteTracks = useMemo((): SatelliteTrack[] => {
    const trackDate = new Date(trackTimeBucket * 60_000);
    const tracks: SatelliteTrack[] = [];

    for (const pos of validPositions) {
      const record = getRecord(pos.noradId);
      if (!record) continue;

      const color = colorForNoradId(pos.noradId);
      const stationary = isStationarySatellite(record.satrec, trackDate);
      const isSelected = pos.noradId === selectedNoradId;
      const stepSeconds = isSelected ? 60 : 120;

      tracks.push({
        noradId: pos.noradId,
        color,
        stationary,
        track: stationary
          ? []
          : computeOrbitTrack(record.satrec, trackDate, 45, 45, stepSeconds),
      });
    }

    return tracks;
  }, [validPositions, getRecord, trackTimeBucket, selectedNoradId]);

  const azimuthLine = useMemo(() => {
    if (!selectedNoradId || !selectedPos) return [];
    const record = getRecord(selectedNoradId);
    if (!record) return [];
    if (!isValidCoordinate(observer.latitude, observer.longitude)) return [];
    if (!isValidCoordinate(selectedPos.latitude, selectedPos.longitude)) return [];

    const look = computeLookAngles(record.satrec, observer, now);
    if (!look || look.elevation < 0) return [];

    return [
      [observer.latitude, observer.longitude] as [number, number],
      [selectedPos.latitude, selectedPos.longitude] as [number, number],
    ];
  }, [selectedNoradId, selectedPos, getRecord, observer, now]);

  const getIcon = (noradId: string, selected: boolean): L.DivIcon => {
    const color = colorForNoradId(noradId);
    const key = `${noradId}-${selected ? 'sel' : 'norm'}`;
    const cache = iconCacheRef.current;
    const cached = cache.get(key);
    if (cached) return cached;

    const icon = createSatelliteIcon(color, selected);
    cache.set(key, icon);
    return icon;
  };

  const observerIcon = L.divIcon({
    className: '',
    html: '<div class="observer-marker"></div>',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

  return (
    <MapContainer
      center={[20, 0]}
      zoom={2}
      minZoom={2}
      worldCopyJump
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapResizer />
      <FlyToSelected selectedNoradId={selectedNoradId} positionMap={positionMap} />

      {satelliteTracks.map(({ noradId, color, track }) =>
        track.length > 1 ? (
          <Polyline
            key={`track-${noradId}`}
            positions={track}
            pathOptions={{
              color,
              weight: noradId === selectedNoradId ? 2.5 : 1.5,
              opacity: noradId === selectedNoradId ? 0.95 : 0.55,
            }}
          />
        ) : null,
      )}

      {isValidCoordinate(observer.latitude, observer.longitude) && (
        <Marker
          position={[observer.latitude, observer.longitude]}
          icon={observerIcon}
          zIndexOffset={1000}
        />
      )}

      {validPositions.map((pos) => {
        const sat = satellites.find((s) => s.noradId === pos.noradId);
        if (!sat) return null;
        const isSelected = pos.noradId === selectedNoradId;
        return (
          <Marker
            key={pos.noradId}
            position={[pos.latitude, pos.longitude]}
            icon={getIcon(pos.noradId, isSelected)}
            zIndexOffset={isSelected ? 500 : 0}
            eventHandlers={{ click: () => onSelect(pos.noradId) }}
          />
        );
      })}

      {selectedPos && isValidCoordinate(selectedPos.latitude, selectedPos.longitude) && (
        <Circle
          center={[selectedPos.latitude, selectedPos.longitude]}
          radius={estimateFootprintRadiusKm(selectedPos.altitudeKm) * 1000}
          pathOptions={{
            color: colorForNoradId(selectedNoradId ?? ''),
            fillColor: colorForNoradId(selectedNoradId ?? ''),
            fillOpacity: 0.08,
            weight: 1,
          }}
        />
      )}

      {azimuthLine.length === 2 && (
        <Polyline
          positions={azimuthLine}
          pathOptions={{ color: '#22c55e', weight: 2, opacity: 0.9, dashArray: '6 6' }}
        />
      )}
    </MapContainer>
  );
}
