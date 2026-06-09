import { z } from 'zod';

export const CelestrakOmmSchema = z.object({
  OBJECT_NAME: z.string(),
  OBJECT_ID: z.string().optional(),
  NORAD_CAT_ID: z.union([z.string(), z.number()]).transform(String),
  EPOCH: z.string(),
  MEAN_MOTION: z.union([z.string(), z.number()]).transform(Number),
  ECCENTRICITY: z.union([z.string(), z.number()]).transform(Number),
  INCLINATION: z.union([z.string(), z.number()]).transform(Number),
  RA_OF_ASC_NODE: z.union([z.string(), z.number()]).transform(Number),
  ARG_OF_PERICENTER: z.union([z.string(), z.number()]).transform(Number),
  MEAN_ANOMALY: z.union([z.string(), z.number()]).transform(Number),
  EPHEMERIS_TYPE: z.union([z.string(), z.number()]).optional(),
  CLASSIFICATION_TYPE: z.string().optional(),
  ELEMENT_SET_NO: z.union([z.string(), z.number()]).optional(),
  REV_AT_EPOCH: z.union([z.string(), z.number()]).optional(),
  BSTAR: z.union([z.string(), z.number()]).optional(),
  MEAN_MOTION_DOT: z.union([z.string(), z.number()]).optional(),
  MEAN_MOTION_DDOT: z.union([z.string(), z.number()]).optional(),
});

export type CelestrakOmm = z.infer<typeof CelestrakOmmSchema>;

export const SatnogsTransmitterSchema = z.object({
  uuid: z.string(),
  description: z.string().nullable().optional(),
  status: z.string(),
  type: z.string(),
  uplink_low: z.number().nullable().optional(),
  uplink_high: z.number().nullable().optional(),
  uplink_drift: z.number().nullable().optional(),
  downlink_low: z.number().nullable().optional(),
  downlink_high: z.number().nullable().optional(),
  downlink_drift: z.number().nullable().optional(),
  mode: z.string().nullable().optional(),
  baud: z.number().nullable().optional(),
  invert: z.boolean().optional(),
  norad_cat_id: z.number().nullable().optional(),
  sat_id: z.string().nullable().optional(),
});

export type SatnogsTransmitter = z.infer<typeof SatnogsTransmitterSchema>;

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

export interface CatalogSnapshot {
  updatedAt: string;
  satellites: SatelliteDetail[];
}

export const DEFAULT_CELESTRAK_GROUPS = [
  'amateur',
  'weather',
  'cubesat',
  'stations',
  'active',
] as const;

export type CelestrakGroup = (typeof DEFAULT_CELESTRAK_GROUPS)[number];
