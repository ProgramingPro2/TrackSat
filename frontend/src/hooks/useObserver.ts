import { useCallback, useEffect, useState } from 'react';
import { fetchApproximateLocation } from '../services/geolocation';
import type { ObserverLocation } from '../types';

const STORAGE_KEY = 'tracksat-observer';

const DEFAULT_OBSERVER: ObserverLocation = {
  latitude: 40.7128,
  longitude: -74.006,
  altitudeKm: 0.01,
};

function geolocationErrorMessage(code: number): string {
  switch (code) {
    case 1:
      return 'Location permission denied. Allow location in browser settings or use manual lat/lon.';
    case 2:
      return 'Location unavailable from GPS.';
    case 3:
      return 'GPS request timed out.';
    default:
      return 'Could not read GPS location.';
  }
}

function loadSavedObserver(): { observer: ObserverLocation; label: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { observer: DEFAULT_OBSERVER, label: 'Default (New York)' };
    }
    const parsed = JSON.parse(raw) as { observer: ObserverLocation; label: string };
    if (
      typeof parsed.observer?.latitude === 'number' &&
      typeof parsed.observer?.longitude === 'number'
    ) {
      return {
        observer: parsed.observer,
        label: typeof parsed.label === 'string' ? parsed.label : 'Saved location',
      };
    }
  } catch {
    // ignore corrupt storage
  }
  return { observer: DEFAULT_OBSERVER, label: 'Default (New York)' };
}

function saveObserver(observer: ObserverLocation, label: string): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ observer, label }));
}

export function useObserver() {
  const [saved] = useState(loadSavedObserver);
  const [observer, setObserver] = useState<ObserverLocation>(saved.observer);
  const [locationLabel, setLocationLabel] = useState(saved.label);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);

  useEffect(() => {
    saveObserver(observer, locationLabel);
  }, [observer, locationLabel]);

  const applyLocation = useCallback((next: ObserverLocation, label: string) => {
    setObserver(next);
    setLocationLabel(label);
    setGeoError(null);
  }, []);

  const requestApproximateLocation = useCallback(async () => {
    setGeoLoading(true);
    setGeoError(null);
    try {
      const approx = await fetchApproximateLocation();
      applyLocation(
        { latitude: approx.latitude, longitude: approx.longitude, altitudeKm: 0.01 },
        approx.city
          ? `Approximate (${approx.city}${approx.region ? `, ${approx.region}` : ''})`
          : 'Approximate location (IP)',
      );
    } catch (err) {
      setGeoError(err instanceof Error ? err.message : 'Approximate location failed');
    } finally {
      setGeoLoading(false);
    }
  }, [applyLocation]);

  const requestGeolocation = useCallback(() => {
    setGeoError(null);

    if (!navigator.geolocation) {
      void requestApproximateLocation();
      return;
    }

    if (!window.isSecureContext) {
      setGeoError('GPS needs HTTPS or localhost. Using approximate location instead.');
      void requestApproximateLocation();
      return;
    }

    setGeoLoading(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLoading(false);
        applyLocation(
          {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            altitudeKm: (pos.coords.altitude ?? 10) / 1000,
          },
          `GPS (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`,
        );
      },
      (err) => {
        setGeoLoading(false);
        setGeoError(`${geolocationErrorMessage(err.code)} Trying approximate location...`);
        void requestApproximateLocation();
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 300000 },
    );
  }, [applyLocation, requestApproximateLocation]);

  const setManualLocation = (latitude: number, longitude: number) => {
    applyLocation(
      { latitude, longitude, altitudeKm: 0.01 },
      `Manual (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
    );
  };

  return {
    observer,
    locationLabel,
    geoError,
    geoLoading,
    requestGeolocation,
    setManualLocation,
  };
}
