import type {
  CatalogSnapshot,
  SatelliteDetail,
  SatelliteSummary,
  TransmitterInfo,
} from '../utils/types.js';
import type { CelestrakOmm, SatnogsTransmitter } from '../utils/types.js';
import { ommToKeplerian, ommToTleLines, formatFrequencyRange, normalizeNoradId } from '../utils/tle.js';
import type { GroupFetchResult } from './celestrak.js';
import { fetchAllGroups } from './celestrak.js';
import { fetchAllTransmitters, groupTransmittersByNorad } from './satnogs.js';

function mapTransmitter(tx: SatnogsTransmitter): TransmitterInfo {
  return {
    uuid: tx.uuid,
    description: tx.description ?? null,
    status: tx.status,
    type: tx.type,
    uplinkLow: tx.uplink_low ?? null,
    uplinkHigh: tx.uplink_high ?? null,
    downlinkLow: tx.downlink_low ?? null,
    downlinkHigh: tx.downlink_high ?? null,
    mode: tx.mode ?? null,
    baud: tx.baud ?? null,
    invert: tx.invert ?? false,
  };
}

function buildFrequencySummary(transmitters: TransmitterInfo[]): string | null {
  const parts: string[] = [];

  for (const tx of transmitters) {
    const uplink = formatFrequencyRange(tx.uplinkLow, tx.uplinkHigh);
    const downlink = formatFrequencyRange(tx.downlinkLow, tx.downlinkHigh);
    if (downlink) parts.push(`DN: ${downlink}`);
    if (uplink) parts.push(`UP: ${uplink}`);
  }

  const unique = [...new Set(parts)];
  return unique.length > 0 ? unique.slice(0, 3).join('; ') : null;
}

function mergeGroupResults(
  groupResults: GroupFetchResult[],
  transmitterMap: Map<number, SatnogsTransmitter[]>,
): SatelliteDetail[] {
  const satelliteMap = new Map<string, SatelliteDetail>();

  for (const { group, satellites, tleMap } of groupResults) {
    for (const omm of satellites) {
      const noradId = normalizeNoradId(omm.NORAD_CAT_ID);
      const noradNum = Number(noradId);
      const tleFromFile = tleMap.get(noradId);
      const tle = tleFromFile ?? ommToTleLines(omm);
      const txList = transmitterMap.get(noradNum) ?? [];
      const transmitters = txList.map(mapTransmitter);

      const existing = satelliteMap.get(noradId);

      if (existing) {
        if (!existing.groups.includes(group)) {
          existing.groups.push(group);
        }
        if (transmitters.length > 0) {
          existing.transmitters = transmitters;
          existing.hasRadio = true;
          existing.frequencySummary = buildFrequencySummary(transmitters);
        }
        continue;
      }

      satelliteMap.set(noradId, {
        noradId,
        name: omm.OBJECT_NAME.trim(),
        groups: [group],
        hasRadio: transmitters.length > 0,
        line1: tle.line1,
        line2: tle.line2,
        frequencySummary: buildFrequencySummary(transmitters),
        tle: {
          name: tle.name || omm.OBJECT_NAME.trim(),
          line1: tle.line1,
          line2: tle.line2,
        },
        keplerian: ommToKeplerian(omm),
        transmitters,
        objectId: omm.OBJECT_ID,
      });
    }
  }

  return [...satelliteMap.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function buildCatalog(groups: string[]): Promise<CatalogSnapshot> {
  const [groupResults, transmitters] = await Promise.all([
    fetchAllGroups(groups),
    fetchAllTransmitters().catch((err) => {
      console.error('SatNOGS fetch failed, continuing without frequencies:', err);
      return [] as SatnogsTransmitter[];
    }),
  ]);

  const transmitterMap = groupTransmittersByNorad(transmitters);
  const satellites = mergeGroupResults(groupResults, transmitterMap);

  return {
    updatedAt: new Date().toISOString(),
    satellites,
  };
}

export function toSummary(sat: SatelliteDetail): SatelliteSummary {
  return {
    noradId: sat.noradId,
    name: sat.name,
    groups: sat.groups,
    hasRadio: sat.hasRadio,
    line1: sat.line1,
    line2: sat.line2,
    frequencySummary: sat.frequencySummary,
  };
}

export function filterSatellites(
  satellites: SatelliteDetail[],
  options: {
    group?: string;
    hasRadio?: boolean;
    search?: string;
  },
): SatelliteDetail[] {
  let result = satellites;

  if (options.group) {
    result = result.filter((s) => s.groups.includes(options.group!));
  }

  if (options.hasRadio === true) {
    result = result.filter((s) => s.hasRadio);
  }

  if (options.search) {
    const q = options.search.toLowerCase();
    result = result.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.noradId.includes(q) ||
        (s.frequencySummary?.toLowerCase().includes(q) ?? false),
    );
  }

  return result;
}
