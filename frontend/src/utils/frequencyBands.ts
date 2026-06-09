export type FrequencyBandId = 'vhf' | 'uhf';

export interface FrequencyBandOption {
  id: FrequencyBandId;
  label: string;
  shortLabel: string;
}

export const HAM_FREQUENCY_BANDS: FrequencyBandOption[] = [
  { id: 'vhf', label: 'VHF (2m)', shortLabel: 'VHF' },
  { id: 'uhf', label: 'UHF (70cm)', shortLabel: 'UHF' },
];
