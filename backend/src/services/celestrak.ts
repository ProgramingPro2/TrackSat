import { CelestrakOmmSchema } from '../utils/types.js';
import type { CelestrakOmm } from '../utils/types.js';
import { fetchCelestrakGroup, parseTleText } from '../utils/tle.js';

export interface GroupFetchResult {
  group: string;
  satellites: CelestrakOmm[];
  tleMap: Map<string, { name: string; line1: string; line2: string }>;
}

export async function fetchGroupData(group: string): Promise<GroupFetchResult> {
  const [jsonData, tleText] = await Promise.all([
    fetchCelestrakGroup(group, 'JSON') as Promise<CelestrakOmm[]>,
    fetchCelestrakGroup(group, 'TLE') as Promise<string>,
  ]);

  const satellites = jsonData
    .map((item) => {
      const parsed = CelestrakOmmSchema.safeParse(item);
      return parsed.success ? parsed.data : null;
    })
    .filter((item): item is CelestrakOmm => item !== null);

  const tleMap = parseTleText(tleText);

  return { group, satellites, tleMap };
}

export async function fetchAllGroups(groups: string[]): Promise<GroupFetchResult[]> {
  const results: GroupFetchResult[] = [];
  for (const group of groups) {
    try {
      const result = await fetchGroupData(group);
      results.push(result);
    } catch (error) {
      console.error(`Failed to fetch CelesTrak group "${group}":`, error);
    }
  }
  return results;
}
