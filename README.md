# TrackSat

Satellite predictor and tracker with radio uplink/downlink frequencies. Outputs copy-paste-ready TLE and Keplerian elements for programs like B-Tech radios, CHIRP, and Gpredict.

## Features

- Live satellite tracking on a 2D map (Leaflet) and optional 3D globe
- Amateur radio and other satellites with SatNOGS frequency data
- Copy TLE or Keplerian elements for external programs
- Pass prediction for your location (AOS/LOS, max elevation)
- Mobile-friendly responsive layout
- Backend caches CelesTrak orbital data and SatNOGS transmitters

## Data Sources

- [CelesTrak](https://celestrak.org/) - TLE / OMM orbital elements
- [SatNOGS DB](https://db.satnogs.org/) - uplink/downlink frequencies

## Quick Start (Development)

```bash
# Install dependencies
npm install
cd backend && npm install && cd ../frontend && npm install && cd ..

# Copy environment file
cp .env.example .env

# Run both services
npm run dev
```

- Frontend: http://localhost:38472
- Backend API: http://localhost:38471

The Vite dev server proxies `/api` requests to the backend.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health and catalog status |
| GET | `/api/groups` | Configured CelesTrak groups |
| GET | `/api/satellites` | Satellite list (`?group=`, `?hasRadio=true`, `?search=`) |
| GET | `/api/satellites/:noradId` | Full detail with frequencies and Keplerian elements |
| GET | `/api/satellites/:noradId/tle` | Raw 3-line TLE (text/plain) |

## Docker

```bash
docker compose up --build
```

Frontend: http://localhost:38472

## Environment Variables

See [.env.example](.env.example).

## Project Structure

```
backend/     Express API, caching, CelesTrak + SatNOGS integration
frontend/    React + Vite + Tailwind UI
docs/        Architecture documentation
tests/       Integration tests
```

## License

MIT
