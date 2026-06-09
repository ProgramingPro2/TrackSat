# TrackSat API

Base URL (development): `http://localhost:38471`

## GET /api/health

Returns service status and catalog metadata.

## GET /api/groups

Returns configured CelesTrak group names.

## GET /api/satellites

Query parameters:

- `group` - filter by CelesTrak group (e.g. `amateur`)
- `hasRadio=true` - only satellites with SatNOGS transmitter data
- `search` - search by name, NORAD ID, or frequency summary
- `bands` - comma-separated ham radio bands (`vhf`, `uhf`); matches satellites with uplink or downlink in that range

## GET /api/satellites/:noradId

Full satellite detail including Keplerian elements and transmitters.

## GET /api/satellites/:noradId/tle

Returns raw 3-line TLE as `text/plain` for copy-paste into tracking software.
