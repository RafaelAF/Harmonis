export type NoteName =
  | 'C'
  | 'C#'
  | 'D'
  | 'D#'
  | 'E'
  | 'F'
  | 'F#'
  | 'G'
  | 'G#'
  | 'A'
  | 'A#'
  | 'B';

export type ScaleMode =
  | 'major'
  | 'natural_minor'
  | 'harmonic_minor'
  | 'melodic_minor';

export type HarmonicFunction = 'tonic' | 'subdominant' | 'dominant';

export interface ChordDegree {
  degreeNumber: number; // 1 to 7
  roman: string;        // "I", "ii", "vii°", etc.
  rootNote: NoteName;   // "C", "D#", etc.
  triadSymbol: string;  // "C", "Dm", "Bdim", etc.
  tetradSymbol: string; // "Cmaj7", "Dm7", "Bm7(b5)", etc.
  triadNotes: NoteName[];
  tetradNotes: NoteName[];
  harmonicFunction: HarmonicFunction;
  functionLabel: 'Tônica' | 'Subdominante' | 'Dominante';
}

export interface HarmonicField {
  tonic: NoteName;
  mode: ScaleMode;
  modeLabel: string;
  scaleNotes: NoteName[];
  degrees: ChordDegree[];
}

export interface PitchDetectionResult {
  frequency: number;          // em Hz (ex: 440.3)
  note: NoteName;             // ex: "A"
  octave: number;             // ex: 4
  scientificNotation: string; // ex: "A4"
  cents: number;              // desvio de -50 a +50
  inTune: boolean;            // |cents| <= 5
  clarity: number;            // 0.0 a 1.0 (confiança da correlação)
  volume: number;             // 0.0 a 1.0 (RMS / amplitude normalizada)
}

export interface DegreeMatch {
  degree: ChordDegree;
  isRoot: boolean;
  isThird: boolean;
  isFifth: boolean;
  isSeventh: boolean;
}

// Tipos do Metrônomo
export type TimeSignature = '2/4' | '3/4' | '4/4' | '6/8';
export type Subdivision = 1 | 2 | 3 | 4; // 1 = Semínima, 2 = Colcheia, 3 = Tercina, 4 = Semicolcheia

// Tipos do Tom Vocal
export type WaveformType = 'sine' | 'triangle';

export interface VocalClassification {
  voiceType: 'Baixo' | 'Barítono' | 'Tenor' | 'Contralto' | 'Mezzo-Soprano' | 'Soprano';
  gender: 'Masculino' | 'Feminino';
  rangeLabel: string;
  color: string;
}
