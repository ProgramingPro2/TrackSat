import { MapContainer, TileLayer, Circle, Polyline, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useEffect, useMemo } from 'react';
import type { ObserverLocation, PropagatedPosition, SatelliteSummary } from '../types';
import {
  computeGroundTrack,
  computeLookAngles,
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

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 100);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
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
  const positionMap = useMemo(() => {
    const map = new Map<string, PropagatedPosition>();
    for (const pos of positions) map.set(pos.noradId, pos);
    return map;
  }, [positions]);

  const selectedRecord = selectedNoradId ? getRecord(selectedNoradId) : undefined;
  const selectedPos = selectedNoradId ? positionMap.get(selectedNoradId) : undefined;

  const validPositions = useMemo(
    () => positions.filter((pos) => isValidCoordinate(pos.latitude, pos.longitude)),
    [positions],
  );

  const selectedGroundTrack = useMemo(() => {
    if (!selectedRecord || isStationarySatellite(selectedRecord.satrec, now)) return [];
    const past = computeGroundTrack(
      selectedRecord.satrec,
      new Date(now.getTime() - 45 * 60000),
      45,
      60,
    );
    const future = computeGroundTrack(selectedRecord.satrec, now, 45, 60);
    return [...past, ...future].filter(([lat, lng]) => isValidCoordinate(lat, lng));
  }, [selectedRecord, now]);

  const selectedColor = selectedNoradId ? colorForNoradId(selectedNoradId) : '#fbbf24';

  const azimuthLine = useMemo(() => {
    if (!selectedRecord || !selectedPos) return [];
    if (!isValidCoordinate(observer.latitude, observer.longitude)) return [];
    if (!isValidCoordinate(selectedPos.latitude, selectedPos.longitude)) return [];

    const look = computeLookAngles(selectedRecord.satrec, observer, now);
    if (!look || look.elevation < 0) return [];

    return [
      [observer.latitude, observer.longitude] as [number, number],
      [selectedPos.latitude, selectedPos.longitude] as [number, number],
    ];
  }, [selectedRecord, selectedPos, observer, now]);

  const icon = L.divIcon({
    className: '',
    html: '<div class="sat-marker"></div>',
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  });

  const selectedIcon = L.divIcon({
    className: '',
    html: `<div style="background:${selectedColor};border:2px solid #fff;border-radius:50%;width:14px;height:14px;box-shadow:0 0 0 2px rgba(255,255,255,0.35);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

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
            icon={isSelected ? selectedIcon : icon}
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
            color: selectedColor,
            fillColor: selectedColor,
            fillOpacity: 0.08,
            weight: 1,
          }}
        />
      )}

      {selectedGroundTrack.length > 1 && (
        <Polyline
          positions={selectedGroundTrack}
          pathOptions={{ color: selectedColor, weight: 2, opacity: 0.85 }}
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
