const API_BASE = import.meta.env.VITE_API_URL ?? '';

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    throw new Error(`API error ${response.status}: ${path}`);
  }
  return response.json() as Promise<T>;
}

export async function fetchCatalog(params?: {
  group?: string;
  hasRadio?: boolean;
  search?: string;
  bands?: string[];
}) {
  const query = new URLSearchParams();
  if (params?.group) query.set('group', params.group);
  if (params?.hasRadio) query.set('hasRadio', 'true');
  if (params?.search) query.set('search', params.search);
  if (params?.bands?.length) query.set('bands', params.bands.join(','));
  const qs = query.toString();
  return fetchJson<import('../types').CatalogResponse>(
    `/api/satellites${qs ? `?${qs}` : ''}`,
  );
}

export async function fetchSatelliteDetail(noradId: string) {
  return fetchJson<import('../types').SatelliteDetail>(`/api/satellites/${noradId}`);
}

export async function fetchGroups() {
  return fetchJson<{ groups: string[] }>('/api/groups');
}

export async function fetchTleText(noradId: string): Promise<string> {
  const response = await fetch(`${API_BASE}/api/satellites/${noradId}/tle`);
  if (!response.ok) throw new Error('Failed to fetch TLE');
  return response.text();
}

export async function fetchHealth() {
  return fetchJson<{
    status: string;
    catalogLoaded: boolean;
    satelliteCount: number;
    updatedAt: string | null;
  }>('/api/health');
}
