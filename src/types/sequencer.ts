import { TimeSignature } from './music';

export type CajonSoundType = 'bass' | 'snare' | 'ghost';

export type StepCount = 8 | 12 | 16;

export type StepGrid = Record<CajonSoundType, boolean[]>;

export interface GroovePreset {
  id: string;
  name: string;
  genre: string;
  defaultBpm: number;
  timeSignature: TimeSignature;
  stepCount: StepCount;
  grid: StepGrid;
  description: string;
}

export interface CajonSoundInfo {
  type: CajonSoundType;
  label: string;
  sublabel: string;
  color: string;
  activeColor: string;
}
