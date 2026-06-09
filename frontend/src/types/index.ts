export interface KeplerianElements {
  epoch: string;
  inclination: number;
  raan: number;
  eccentricity: number;
  argOfPerigee: number;
  meanAnomaly: number;
  meanMotion: number;
  bstar?: number;
  revAtEpoch?: number;
}

export interface TransmitterInfo {
  uuid: string;
  description: string | null;
  status: string;
  type: string;
  uplinkLow: number | null;
  uplinkHigh: number | null;
  downlinkLow: number | null;
  downlinkHigh: number | null;
  mode: string | null;
  baud: number | null;
  invert: boolean;
}

export interface SatelliteSummary {
  noradId: string;
  name: string;
  groups: string[];
  hasRadio: boolean;
  line1: string;
  line2: string;
  frequencySummary: string | null;
}

export interface SatelliteDetail extends SatelliteSummary {
  tle: {
    name: string;
    line1: string;
    line2: string;
  };
  keplerian: KeplerianElements;
  transmitters: TransmitterInfo[];
  objectId?: string;
}

export interface CatalogResponse {
  updatedAt: string;
  count: number;
  satellites: SatelliteSummary[];
}

export interface PropagatedPosition {
  noradId: string;
  latitude: number;
  longitude: number;
  altitudeKm: number;
}

export interface ObserverLocation {
  latitude: number;
  longitude: number;
  altitudeKm: number;
}

export interface SatellitePass {
  aos: Date;
  los: Date;
  maxElevation: number;
  maxElevationAzimuth: number;
  durationMinutes: number;
  aosAzimuth?: number;
  losAzimuth?: number;
}

export interface LiveLookAngle {
  noradId: string;
  azimuth: number;
  elevation: number;
  rangeKm: number;
  rangeRateKmS: number;
}

export interface OverheadSatellite extends LiveLookAngle {}

export interface UpcomingPass extends SatellitePass {
  noradId: string;
}

export type ViewMode = 'map2d' | 'globe3d';
export type AppPage = 'tracker' | 'sky';

export interface FilterState {
  search: string;
  group: string;
  hasRadioOnly: boolean;
}
