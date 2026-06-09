import { describe, expect, it } from 'vitest';
import { ommToKeplerian, ommToTleLines, formatKeplerianBlock, normalizeNoradId, parseTleText } from '../backend/src/utils/tle.js';
import type { CelestrakOmm } from '../backend/src/utils/types.js';
import { filterSatellites, toSummary } from '../backend/src/services/catalog.js';
import type { SatelliteDetail, TransmitterInfo } from '../backend/src/utils/types.js';
import { satelliteMatchesBands, transmitterMatchesBand } from '../backend/src/utils/frequencyBands.js';

const sampleOmm: CelestrakOmm = {
  OBJECT_NAME: 'ISS (ZARYA)',
  OBJECT_ID: '1998-067A',
  NORAD_CAT_ID: '25544',
  EPOCH: '2024-01-01T12:00:00.000Z',
  MEAN_MOTION: 15.49,
  ECCENTRICITY: 0.0001234,
  INCLINATION: 51.6416,
  RA_OF_ASC_NODE: 123.4567,
  ARG_OF_PERICENTER: 234.5678,
  MEAN_ANOMALY: 345.6789,
  BSTAR: 0.00001234,
  REV_AT_EPOCH: 100,
};

describe('TLE utilities', () => {
  it('converts OMM to Keplerian elements', () => {
    const k = ommToKeplerian(sampleOmm);
    expect(k.inclination).toBe(51.6416);
    expect(k.meanMotion).toBe(15.49);
    expect(k.epoch).toBe('2024-01-01T12:00:00.000Z');
  });

  it('generates TLE lines from OMM', () => {
    const tle = ommToTleLines(sampleOmm);
    expect(tle.line1.startsWith('1 25544')).toBe(true);
    expect(tle.line2.startsWith('2 25544')).toBe(true);
    expect(tle.name).toBe('ISS (ZARYA)');
  });

  it('formats Keplerian block for copy-paste', () => {
    const block = formatKeplerianBlock('ISS', '25544', ommToKeplerian(sampleOmm));
    expect(block).toContain('NORAD 25544');
    expect(block).toContain('Inclination (deg): 51.6416');
  });

  it('normalizes NORAD IDs with and without leading zeros', () => {
    expect(normalizeNoradId('07530')).toBe('7530');
    expect(normalizeNoradId('7530')).toBe('7530');
    expect(normalizeNoradId(25544)).toBe('25544');
  });

  it('indexes TLE entries by normalized NORAD ID', () => {
    const tleText = `OSCAR 7 (AO-7)
1 07530U 74089B   26160.31226999 -.00000035  00000+0  69227-4 0  9997
2 07530 101.9901 173.4766 0012488 144.7701 229.1729 12.53697932359533`;
    const map = parseTleText(tleText);
    expect(map.has('7530')).toBe(true);
    expect(map.get('7530')?.line1.startsWith('1 07530')).toBe(true);
  });
});

describe('Catalog utilities', () => {
  const mockSat: SatelliteDetail = {
    noradId: '25544',
    name: 'ISS (ZARYA)',
    groups: ['stations'],
    hasRadio: true,
    line1: '1 25544U',
    line2: '2 25544',
    frequencySummary: 'DN: 145.800 MHz',
    tle: { name: 'ISS (ZARYA)', line1: '1 25544U', line2: '2 25544' },
    keplerian: ommToKeplerian(sampleOmm),
    transmitters: [],
  };

  it('filters by hasRadio', () => {
    const noRadio = { ...mockSat, noradId: '99999', hasRadio: false, name: 'NO RADIO' };
    const filtered = filterSatellites([mockSat, noRadio], { hasRadio: true });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].noradId).toBe('25544');
  });

  it('produces summary without full detail fields', () => {
    const summary = toSummary(mockSat);
    expect(summary.noradId).toBe('25544');
    expect(summary).not.toHaveProperty('keplerian');
    expect(summary).not.toHaveProperty('transmitters');
  });

  it('filters by VHF and UHF bands', () => {
    const vhfTx: TransmitterInfo = {
      uuid: 'vhf',
      description: null,
      status: 'active',
      type: 'Transmitter',
      uplinkLow: 145_850_000,
      uplinkHigh: null,
      downlinkLow: 145_800_000,
      downlinkHigh: null,
      mode: 'FM',
      baud: null,
      invert: false,
    };
    const uhfTx: TransmitterInfo = {
      uuid: 'uhf',
      description: null,
      status: 'active',
      type: 'Transmitter',
      uplinkLow: 435_300_000,
      uplinkHigh: null,
      downlinkLow: 436_795_000,
      downlinkHigh: null,
      mode: 'BPSK',
      baud: 9600,
      invert: false,
    };
    const otherTx: TransmitterInfo = {
      uuid: 's-band',
      description: null,
      status: 'active',
      type: 'Transmitter',
      uplinkLow: 2_200_000_000,
      uplinkHigh: null,
      downlinkLow: 2_240_000_000,
      downlinkHigh: null,
      mode: 'BPSK',
      baud: null,
      invert: false,
    };

    const vhfSat: SatelliteDetail = {
      ...mockSat,
      noradId: '10001',
      name: 'VHF SAT',
      transmitters: [vhfTx],
    };
    const uhfSat: SatelliteDetail = {
      ...mockSat,
      noradId: '10002',
      name: 'UHF SAT',
      transmitters: [uhfTx],
    };
    const dualSat: SatelliteDetail = {
      ...mockSat,
      noradId: '10003',
      name: 'DUAL SAT',
      transmitters: [vhfTx, uhfTx],
    };
    const otherSat: SatelliteDetail = {
      ...mockSat,
      noradId: '10004',
      name: 'S-BAND SAT',
      transmitters: [otherTx],
    };

    expect(transmitterMatchesBand(vhfTx, { id: 'vhf', label: 'VHF', minHz: 144_000_000, maxHz: 148_000_000 })).toBe(true);
    expect(satelliteMatchesBands([otherTx], ['vhf'])).toBe(false);
    expect(filterSatellites([vhfSat, uhfSat, dualSat, otherSat], { bands: ['vhf'] })).toEqual([
      vhfSat,
      dualSat,
    ]);
    expect(filterSatellites([vhfSat, uhfSat, dualSat, otherSat], { bands: ['vhf', 'uhf'] })).toEqual([
      vhfSat,
      uhfSat,
      dualSat,
    ]);
  });
});
