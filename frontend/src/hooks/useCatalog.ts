import { useCallback, useEffect, useState } from 'react';
import { fetchCatalog, fetchGroups } from '../services/api';
import type { FilterState, SatelliteSummary } from '../types';

export function useCatalog(filters: FilterState) {
  const [satellites, setSatellites] = useState<SatelliteSummary[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchGroups()
      .then((data) => setGroups(data.groups))
      .catch(() => {
        // groups endpoint optional fallback
      });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const catalog = await fetchCatalog({
        group: filters.group || undefined,
        hasRadio: filters.hasRadioOnly || undefined,
        search: filters.search || undefined,
      });

      setSatellites(catalog.satellites);
      setUpdatedAt(catalog.updatedAt);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load catalog');
    } finally {
      setLoading(false);
    }
  }, [filters.group, filters.hasRadioOnly, filters.search]);

  useEffect(() => {
    void load();
  }, [load]);

  return { satellites, groups, updatedAt, loading, error, reload: load };
}
