import { lazy, Suspense, useEffect, useState } from 'react';
import { useCatalog } from './hooks/useCatalog';
import { usePropagation } from './hooks/usePropagation';
import { useObserver } from './hooks/useObserver';
import { SatList } from './components/SatList';
import { DetailPanel } from './components/DetailPanel';
import { SkyView } from './components/SkyView';
import { HAM_FREQUENCY_BANDS } from './utils/frequencyBands';
import type { AppPage, FilterState, FrequencyBandId, ViewMode } from './types';

const Map2D = lazy(() => import('./components/Map2D').then((m) => ({ default: m.Map2D })));
const Globe3D = lazy(() => import('./components/Globe3D').then((m) => ({ default: m.Globe3D })));

function App() {
  const [page, setPage] = useState<AppPage>('tracker');
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    group: '',
    hasRadioOnly: false,
    bands: [],
  });

  const toggleBand = (bandId: FrequencyBandId) => {
    setFilters((current) => ({
      ...current,
      bands: current.bands.includes(bandId)
        ? current.bands.filter((id) => id !== bandId)
        : [...current.bands, bandId],
    }));
  };
  const [selectedNoradId, setSelectedNoradId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('map2d');
  const [showList, setShowList] = useState(true);
  const [manualLat, setManualLat] = useState('');
  const [manualLon, setManualLon] = useState('');

  const { satellites, groups, updatedAt, loading, error, reload } = useCatalog(filters);
  const { now, positions, records, getRecord } = usePropagation(satellites);
  const { observer, locationLabel, geoError, geoLoading, requestGeolocation, setManualLocation } =
    useObserver();

  useEffect(() => {
    setManualLat(String(observer.latitude));
    setManualLon(String(observer.longitude));
  }, [observer.latitude, observer.longitude]);

  const applyManualLocation = () => {
    const lat = parseFloat(manualLat);
    const lon = parseFloat(manualLon);
    if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
      setManualLocation(lat, lon);
    }
  };

  return (
    <div className="flex h-full flex-col bg-slate-950 text-slate-100">
      <header className="flex flex-wrap items-center gap-2 border-b border-slate-800 px-2 py-2 sm:gap-3 sm:px-4 sm:py-2.5">
        <div className="min-w-0">
          <h1 className="text-base font-bold tracking-tight sm:text-lg">TrackSat</h1>
          <p className="hidden truncate text-[11px] text-slate-400 sm:block">
            Satellite tracker with radio frequencies
            {updatedAt && ` - updated ${new Date(updatedAt).toLocaleString()}`}
          </p>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => setPage('tracker')}
            className={`rounded px-2 py-1 text-xs sm:rounded-md sm:px-3 sm:py-1.5 sm:text-sm ${
              page === 'tracker' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-300'
            }`}
          >
            Tracker
          </button>
          <button
            type="button"
            onClick={() => setPage('sky')}
            className={`rounded px-2 py-1 text-xs sm:rounded-md sm:px-3 sm:py-1.5 sm:text-sm ${
              page === 'sky' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-300'
            }`}
          >
            Sky
          </button>
          {page === 'tracker' && (
            <>
              <button
                type="button"
                onClick={() => setViewMode('map2d')}
                className={`rounded px-2 py-1 text-xs sm:rounded-md sm:px-3 sm:py-1.5 sm:text-sm ${
                  viewMode === 'map2d' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-300'
                }`}
              >
                2D
              </button>
              <button
                type="button"
                onClick={() => setViewMode('globe3d')}
                className={`rounded px-2 py-1 text-xs sm:rounded-md sm:px-3 sm:py-1.5 sm:text-sm ${
                  viewMode === 'globe3d' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-300'
                }`}
              >
                3D
              </button>
              <button
                type="button"
                onClick={() => setShowList((v) => !v)}
                className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-300 md:hidden"
              >
                {showList ? 'Map' : 'List'}
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => void reload()}
            className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-300 hover:bg-slate-700 sm:rounded-md sm:px-3 sm:py-1.5 sm:text-sm"
          >
            Refresh
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-800 px-2 py-1.5 sm:gap-2 sm:px-4 sm:py-2">
        <input
          type="search"
          placeholder="Search..."
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          className="min-w-0 flex-1 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs sm:min-w-[180px] sm:px-3 sm:py-1.5 sm:text-sm"
        />
        <select
          value={filters.group}
          onChange={(e) => setFilters((f) => ({ ...f, group: e.target.value }))}
          className="max-w-[120px] rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs sm:max-w-none sm:px-3 sm:py-1.5 sm:text-sm"
        >
          <option value="">All groups</option>
          {groups.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <label className="flex shrink-0 items-center gap-1 text-xs text-slate-300 sm:gap-2 sm:text-sm">
          <input
            type="checkbox"
            checked={filters.hasRadioOnly}
            onChange={(e) => setFilters((f) => ({ ...f, hasRadioOnly: e.target.checked }))}
          />
          <span className="sm:hidden">Radio</span>
          <span className="hidden sm:inline">Radio only</span>
        </label>
        <div className="flex shrink-0 items-center gap-1">
          {HAM_FREQUENCY_BANDS.map((band) => {
            const active = filters.bands.includes(band.id);
            return (
              <button
                key={band.id}
                type="button"
                title={band.label}
                aria-pressed={active}
                onClick={() => toggleBand(band.id)}
                className={`rounded px-2 py-1 text-xs sm:rounded-md sm:px-3 sm:py-1.5 sm:text-sm ${
                  active ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <span className="sm:hidden">{band.shortLabel}</span>
                <span className="hidden sm:inline">{band.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-800 px-2 py-1.5 text-[11px] text-slate-400 sm:gap-2 sm:px-4 sm:py-2 sm:text-xs">
        <span className="max-w-[140px] truncate sm:max-w-none">Observer: {locationLabel}</span>
        <button
          type="button"
          onClick={() => requestGeolocation()}
          disabled={geoLoading}
          className="rounded bg-slate-800 px-2 py-1 text-slate-300 hover:bg-slate-700 disabled:cursor-wait disabled:opacity-60"
        >
          {geoLoading ? 'Locating...' : 'Use GPS'}
        </button>
        <input
          type="number"
          step="0.0001"
          placeholder="Lat"
          value={manualLat}
          onChange={(e) => setManualLat(e.target.value)}
          className="w-[4.5rem] rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 sm:w-24 sm:px-2 sm:py-1"
        />
        <input
          type="number"
          step="0.0001"
          placeholder="Lon"
          value={manualLon}
          onChange={(e) => setManualLon(e.target.value)}
          className="w-[4.5rem] rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 sm:w-24 sm:px-2 sm:py-1"
        />
        <button
          type="button"
          onClick={applyManualLocation}
          className="rounded bg-slate-800 px-2 py-1 text-slate-300 hover:bg-slate-700"
        >
          Set
        </button>
        {geoError && <span className="text-red-400">{geoError}</span>}
      </div>

      {error && (
        <div className="bg-red-900/40 px-4 py-2 text-sm text-red-200">{error}</div>
      )}

      {page === 'sky' ? (
        <SkyView
          satellites={satellites}
          records={records}
          observer={observer}
          now={now}
          selectedNoradId={selectedNoradId}
          onSelect={setSelectedNoradId}
          getRecord={getRecord}
        />
      ) : (
        <>
          <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[minmax(0,280px)_1fr_minmax(0,300px)]">
            <aside
              className={`panel-scroll border-r border-slate-800 bg-slate-900/50 ${
                showList ? 'block' : 'hidden md:block'
              }`}
            >
              <SatList
                satellites={satellites}
                selectedNoradId={selectedNoradId}
                onSelect={setSelectedNoradId}
                loading={loading}
              />
            </aside>

            <main className={`relative min-h-[300px] ${showList ? 'hidden md:block' : 'block'}`}>
              <Suspense
                fallback={
                  <div className="flex h-full items-center justify-center text-slate-400">
                    Loading map...
                  </div>
                }
              >
                {viewMode === 'map2d' ? (
                  <Map2D
                    satellites={satellites}
                    positions={positions}
                    selectedNoradId={selectedNoradId}
                    onSelect={setSelectedNoradId}
                    getRecord={getRecord}
                    observer={observer}
                    now={now}
                  />
                ) : (
                  <Globe3D
                    positions={positions}
                    selectedNoradId={selectedNoradId}
                    onSelect={setSelectedNoradId}
                  />
                )}
              </Suspense>
            </main>

            <aside className="panel-scroll hidden border-l border-slate-800 bg-slate-900/50 md:block">
              <DetailPanel
                noradId={selectedNoradId}
                getRecord={getRecord}
                observer={observer}
                now={now}
              />
            </aside>
          </div>

          {selectedNoradId && (
            <div className="mobile-drawer block border-t border-slate-800 bg-slate-900 md:hidden">
              <DetailPanel
                noradId={selectedNoradId}
                getRecord={getRecord}
                observer={observer}
                now={now}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;
