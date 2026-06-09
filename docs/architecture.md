# TrackSat Architecture

## Overview

TrackSat is a full-stack TypeScript application for tracking satellites with radio frequency data.

## Data Flow

1. Backend fetches CelesTrak GP data (JSON + TLE) for configured groups
2. Backend fetches SatNOGS transmitters and merges by NORAD catalog ID
3. Merged catalog is cached in memory and on disk (`backend/data/catalog.json`)
4. Frontend loads catalog via REST API
5. Frontend runs SGP4 propagation locally at ~1 Hz using `satellite.js`

## Components

### Backend (`backend/`)

- `services/celestrak.ts` - Fetches orbital data per group
- `services/satnogs.ts` - Fetches active transmitters
- `services/catalog.ts` - Merges orbital + frequency data
- `services/cache.ts` - In-memory/disk cache with cron refresh

### Frontend (`frontend/`)

- `hooks/useCatalog.ts` - Loads and filters satellite list
- `hooks/usePropagation.ts` - Real-time position propagation
- `hooks/useObserver.ts` - Geolocation / manual observer position
- `components/Map2D.tsx` - Leaflet map with tracks and footprints
- `components/Globe3D.tsx` - Lazy-loaded 3D globe
- `components/DetailPanel.tsx` - Frequencies, TLE/Keplerian copy, passes

## Refresh Schedule

Default cron schedules (configurable via env):

- TLE data: every 6 hours
- Transmitters: daily at 03:00 UTC (shares TLE refresh cycle in current implementation)

## Stale-on-Error

If CelesTrak or SatNOGS is unavailable, the backend serves the last cached catalog.
