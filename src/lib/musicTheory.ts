import {
  NoteName,
  ScaleMode,
  HarmonicField,
  ChordDegree,
  HarmonicFunction,
  PitchDetectionResult,
  VocalClassification,
  VocalRangeTestResult,
} from '@/types/music';

export const NOTES: readonly NoteName[] = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
] as const;

// Mapeamento de notas com bemol para sustenido correspondente
const ENHARMONIC_MAP: Record<string, NoteName> = {
  Db: 'C#',
  Eb: 'D#',
  Gb: 'F#',
  Ab: 'G#',
  Bb: 'A#',
  'C#': 'C#',
  'D#': 'D#',
  'F#': 'F#',
  'G#': 'G#',
  'A#': 'A#',
};

// Intervalos em semitons para cada modo de escala
export const SCALE_INTERVALS: Record<ScaleMode, readonly number[]> = {
  major: [2, 2, 1, 2, 2, 2, 1],
  natural_minor: [2, 1, 2, 2, 1, 2, 2],
  harmonic_minor: [2, 1, 2, 2, 1, 3, 1],
  melodic_minor: [2, 1, 2, 2, 2, 2, 1],
};

export const SCALE_MODE_LABELS: Record<ScaleMode, string> = {
  major: 'Maior',
  natural_minor: 'Menor Natural',
  harmonic_minor: 'Menor Harmônica',
  melodic_minor: 'Menor Melódica',
};

// Funções harmônicas padrão por modo e grau (índice 0 a 6)
const HARMONIC_FUNCTIONS: Record<ScaleMode, readonly HarmonicFunction[]> = {
  major: [
    'tonic',
    'subdominant',
    'tonic',
    'subdominant',
    'dominant',
    'tonic',
    'dominant',
  ],
  natural_minor: [
    'tonic',
    'subdominant',
    'tonic',
    'subdominant',
    'dominant',
    'subdominant',
    'subdominant',
  ],
  harmonic_minor: [
    'tonic',
    'subdominant',
    'tonic',
    'subdominant',
    'dominant',
    'subdominant',
    'dominant',
  ],
  melodic_minor: [
    'tonic',
    'subdominant',
    'tonic',
    'subdominant',
    'dominant',
    'subdominant',
    'dominant',
  ],
};

const FUNCTION_LABELS: Record<HarmonicFunction, 'Tônica' | 'Subdominante' | 'Dominante'> = {
  tonic: 'Tônica',
  subdominant: 'Subdominante',
  dominant: 'Dominante',
};

/**
 * Normaliza qualquer notação de nota (ex: "Db", "bb", etc.) para a convenção em sustenidos.
 */
export function normalizeNoteName(name: string): NoteName {
  const clean = name.trim().replace('♭', 'b').replace('♯', '#');
  const firstLetter = clean.charAt(0).toUpperCase();
  const accidental = clean.slice(1);
  const formatted = `${firstLetter}${accidental}`;

  if (ENHARMONIC_MAP[formatted]) {
    return ENHARMONIC_MAP[formatted];
  }

  if (NOTES.includes(formatted as NoteName)) {
    return formatted as NoteName;
  }

  return 'C';
}

/**
 * Retorna o índice semitonal da nota (0 = C até 11 = B).
 */
export function getNoteIndex(note: NoteName): number {
  return NOTES.indexOf(note);
}

/**
 * Calcula a distância em semitons ascendentes de noteA até noteB.
 */
export function getSemitoneDistance(noteA: NoteName, noteB: NoteName): number {
  const indexA = getNoteIndex(noteA);
  const indexB = getNoteIndex(noteB);
  return (indexB - indexA + 12) % 12;
}

/**
 * Converte Nota e Oitava em frequência (Hz), tendo A4 como referência configurável (padrão 440Hz).
 * MIDI de A4 = 69.
 */
export function noteToFrequency(
  note: NoteName | string,
  octave: number = 4,
  a4Ref: number = 440
): number {
  const normalized = normalizeNoteName(note);
  const noteIdx = getNoteIndex(normalized);
  const midi = (octave + 1) * 12 + noteIdx;
  return a4Ref * Math.pow(2, (midi - 69) / 12);
}

/**
 * Converte frequência em Hz para o resultado completo de afinação:
 * Nota mais próxima, oitava, desvio em cents (-50 a +50) e indicador de afinação.
 */
export function frequencyToPitch(
  frequency: number,
  a4Ref: number = 440
): PitchDetectionResult | null {
  if (!frequency || frequency <= 0 || !Number.isFinite(frequency)) {
    return null;
  }

  // MIDI = 69 + 12 * log2(f / 440)
  const midi = 69 + 12 * (Math.log(frequency / a4Ref) / Math.LN2);
  const nearestMidi = Math.round(midi);
  const cents = Math.round((midi - nearestMidi) * 100);

  const noteIdx = ((nearestMidi % 12) + 12) % 12;
  const octave = Math.floor(nearestMidi / 12) - 1;
  const note = NOTES[noteIdx];

  return {
    frequency: Math.round(frequency * 10) / 10,
    note,
    octave,
    scientificNotation: `${note}${octave}`,
    cents: Math.max(-50, Math.min(50, cents)),
    inTune: Math.abs(cents) <= 5,
    clarity: 1,
    volume: 1,
  };
}

/**
 * Gera as notas de uma escala a partir da tônica e do modo selecionado.
 */
export function generateScale(tonic: NoteName, mode: ScaleMode): NoteName[] {
  const startIndex = getNoteIndex(tonic);
  const intervals = SCALE_INTERVALS[mode];
  const scale: NoteName[] = [tonic];

  let currentIdx = startIndex;
  // Os primeiros 6 intervalos geram as notas 2 até 7
  for (let i = 0; i < 6; i++) {
    currentIdx = (currentIdx + intervals[i]) % 12;
    scale.push(NOTES[currentIdx]);
  }

  return scale;
}

/**
 * Determina a qualidade do acorde triádico e tetrádico com base nos intervalos
 * a partir da tônica (terça, quinta e sétima da escala).
 */
function analyzeChordQuality(
  root: NoteName,
  third: NoteName,
  fifth: NoteName,
  seventh: NoteName,
  degreeNumber: number
): {
  roman: string;
  triadSymbol: string;
  tetradSymbol: string;
} {
  const dist3 = getSemitoneDistance(root, third);
  const dist5 = getSemitoneDistance(root, fifth);
  const dist7 = getSemitoneDistance(root, seventh);

  const ROMAN_UPPER = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  const ROMAN_LOWER = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii'];
  const baseUpper = ROMAN_UPPER[degreeNumber - 1];
  const baseLower = ROMAN_LOWER[degreeNumber - 1];

  let triadQuality: 'maj' | 'min' | 'dim' | 'aug' = 'maj';

  if (dist3 === 4 && dist5 === 7) {
    triadQuality = 'maj';
  } else if (dist3 === 3 && dist5 === 7) {
    triadQuality = 'min';
  } else if (dist3 === 3 && dist5 === 6) {
    triadQuality = 'dim';
  } else if (dist3 === 4 && dist5 === 8) {
    triadQuality = 'aug';
  }

  let triadSymbol: string = root;
  let tetradSymbol: string = root;
  let roman: string = baseUpper;

  switch (triadQuality) {
    case 'maj':
      triadSymbol = `${root}`;
      if (dist7 === 11) {
        tetradSymbol = `${root}maj7`;
        roman = `${baseUpper}maj7`;
      } else if (dist7 === 10) {
        tetradSymbol = `${root}7`;
        roman = `${baseUpper}7`;
      } else {
        tetradSymbol = `${root}maj`;
        roman = baseUpper;
      }
      break;

    case 'min':
      triadSymbol = `${root}m`;
      if (dist7 === 10) {
        tetradSymbol = `${root}m7`;
        roman = `${baseLower}7`;
      } else if (dist7 === 11) {
        tetradSymbol = `${root}m(maj7)`;
        roman = `${baseLower}(maj7)`;
      } else {
        tetradSymbol = `${root}m`;
        roman = baseLower;
      }
      break;

    case 'dim':
      triadSymbol = `${root}dim`;
      if (dist7 === 10) {
        tetradSymbol = `${root}m7(b5)`;
        roman = `${baseLower}ø7`;
      } else if (dist7 === 9) {
        tetradSymbol = `${root}dim7`;
        roman = `${baseLower}°7`;
      } else {
        tetradSymbol = `${root}dim`;
        roman = `${baseLower}°`;
      }
      break;

    case 'aug':
      triadSymbol = `${root}aug`;
      if (dist7 === 11) {
        tetradSymbol = `${root}maj7(#5)`;
        roman = `${baseUpper}+maj7`;
      } else if (dist7 === 10) {
        tetradSymbol = `${root}7(#5)`;
        roman = `${baseUpper}+7`;
      } else {
        tetradSymbol = `${root}aug`;
        roman = `${baseUpper}+`;
      }
      break;
  }

  return {
    roman,
    triadSymbol,
    tetradSymbol,
  };
}

/**
 * Gera o campo harmônico completo (7 graus, cifras de tríades, tétrades,
 * notas formadoras e funções harmônicas) para uma tônica e modo.
 */
export function generateHarmonicField(
  tonic: NoteName,
  mode: ScaleMode
): HarmonicField {
  const normalizedTonic = normalizeNoteName(tonic);
  const scaleNotes = generateScale(normalizedTonic, mode);
  const functions = HARMONIC_FUNCTIONS[mode];

  const degrees: ChordDegree[] = scaleNotes.map((root, index) => {
    const degreeNumber = index + 1;
    // Empilhamento de terças dentro das 7 notas da escala
    const third = scaleNotes[(index + 2) % 7];
    const fifth = scaleNotes[(index + 4) % 7];
    const seventh = scaleNotes[(index + 6) % 7];

    const triadNotes: NoteName[] = [root, third, fifth];
    const tetradNotes: NoteName[] = [root, third, fifth, seventh];

    const { roman, triadSymbol, tetradSymbol } = analyzeChordQuality(
      root,
      third,
      fifth,
      seventh,
      degreeNumber
    );

    const harmonicFunction = functions[index];

    return {
      degreeNumber,
      roman,
      rootNote: root,
      triadSymbol,
      tetradSymbol,
      triadNotes,
      tetradNotes,
      harmonicFunction,
      functionLabel: FUNCTION_LABELS[harmonicFunction],
    };
  });

  return {
    tonic: normalizedTonic,
    mode,
    modeLabel: SCALE_MODE_LABELS[mode],
    scaleNotes,
    degrees,
  };
}

/**
 * Mapeia uma nota detectada em tempo real para o campo harmônico ativo:
 * Identifica se a nota é a tônica de algum grau, ou se atua como terça,
 * quinta ou sétima em outros acordes do campo.
 */
export function mapNoteToHarmonicField(
  detectedNote: NoteName | string | null,
  harmonicField: HarmonicField
): {
  exactDegreeRoot: ChordDegree | null;
  exactDegreeIndex: number;
  isInScale: boolean;
  memberOfDegrees: Array<{
    degree: ChordDegree;
    role: 'Tônica' | 'Terça' | 'Quinta' | 'Sétima';
  }>;
} {
  if (!detectedNote) {
    return {
      exactDegreeRoot: null,
      exactDegreeIndex: -1,
      isInScale: false,
      memberOfDegrees: [],
    };
  }

  const normalized = normalizeNoteName(detectedNote);
  const scaleIndex = harmonicField.scaleNotes.indexOf(normalized);
  const isInScale = scaleIndex !== -1;

  let exactDegreeRoot: ChordDegree | null = null;
  let exactDegreeIndex = -1;

  if (isInScale) {
    exactDegreeIndex = scaleIndex;
    exactDegreeRoot = harmonicField.degrees[scaleIndex];
  }

  const memberOfDegrees: Array<{
    degree: ChordDegree;
    role: 'Tônica' | 'Terça' | 'Quinta' | 'Sétima';
  }> = [];

  harmonicField.degrees.forEach((deg) => {
    if (deg.rootNote === normalized) {
      memberOfDegrees.push({ degree: deg, role: 'Tônica' });
    } else if (deg.tetradNotes[1] === normalized) {
      memberOfDegrees.push({ degree: deg, role: 'Terça' });
    } else if (deg.tetradNotes[2] === normalized) {
      memberOfDegrees.push({ degree: deg, role: 'Quinta' });
    } else if (deg.tetradNotes[3] === normalized) {
      memberOfDegrees.push({ degree: deg, role: 'Sétima' });
    }
  });

  return {
    exactDegreeRoot,
    exactDegreeIndex,
    isInScale,
    memberOfDegrees,
  };
}

/**
 * Classifica quais naipes/tessituras vocais englobam a frequência fornecida.
 */
export function classifyVocalRange(frequency: number): VocalClassification[] {
  if (!frequency || frequency <= 0) return [];

  const ranges: Array<{
    type: VocalClassification['voiceType'];
    gender: VocalClassification['gender'];
    min: number;
    max: number;
    label: string;
    color: string;
  }> = [
    {
      type: 'Baixo',
      gender: 'Masculino',
      min: 82.4, // E2
      max: 329.6, // E4
      label: 'E2 a E4',
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    },
    {
      type: 'Barítono',
      gender: 'Masculino',
      min: 110.0, // A2
      max: 440.0, // A4
      label: 'A2 a A4',
      color: 'text-teal-400 bg-teal-500/10 border-teal-500/30',
    },
    {
      type: 'Tenor',
      gender: 'Masculino',
      min: 130.8, // C3
      max: 523.2, // C5
      label: 'C3 a C5',
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    },
    {
      type: 'Contralto',
      gender: 'Feminino',
      min: 174.6, // F3
      max: 698.5, // F5
      label: 'F3 a F5',
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    },
    {
      type: 'Mezzo-Soprano',
      gender: 'Feminino',
      min: 220.0, // A3
      max: 880.0, // A5
      label: 'A3 a A5',
      color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
    },
    {
      type: 'Soprano',
      gender: 'Feminino',
      min: 261.6, // C4
      max: 1046.5, // C6
      label: 'C4 a C6',
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    },
  ];

  return ranges
    .filter((r) => frequency >= r.min && frequency <= r.max)
    .map((r) => ({
      voiceType: r.type,
      gender: r.gender,
      rangeLabel: r.label,
      color: r.color,
    }));
}

/**
 * Analisa a extensão vocal completa registrada no teste (Passo 1 e 2)
 * e gera um diagnóstico completo com semitons, oitavas, classificação e tonalidades ideais.
 */
export function calculateVocalRangeDiagnosis(
  lowest: PitchDetectionResult,
  highest: PitchDetectionResult
): VocalRangeTestResult {
  const getMidi = (pitch: PitchDetectionResult) => {
    const noteIdx = NOTES.indexOf(pitch.note);
    return (pitch.octave + 1) * 12 + noteIdx;
  };

  let midiLow = getMidi(lowest);
  let midiHigh = getMidi(highest);
  let actualLowest = lowest;
  let actualHighest = highest;

  // Garante ordem correta caso o usuário tenha invertido
  if (midiLow > midiHigh) {
    const tempMidi = midiLow;
    midiLow = midiHigh;
    midiHigh = tempMidi;
    actualLowest = highest;
    actualHighest = lowest;
  }

  const semitonesTotal = Math.max(1, midiHigh - midiLow);
  const octavesSpan = Math.floor(semitonesTotal / 12);
  const semitonesRemainder = semitonesTotal % 12;

  // Nota central de conforto (ponto médio da tessitura)
  const centerMidi = Math.round((midiLow + midiHigh) / 2);
  const centerNoteIdx = ((centerMidi % 12) + 12) % 12;
  const centerNote = NOTES[centerNoteIdx];
  const centerOctave = Math.floor(centerMidi / 12) - 1;
  const centerFreq = 440 * Math.pow(2, (centerMidi - 69) / 12);

  // Classificação vocal baseada na frequência média e limites
  const avgFreq = (actualLowest.frequency + actualHighest.frequency) / 2;
  let classifications = classifyVocalRange(avgFreq);
  if (classifications.length === 0) {
    classifications = classifyVocalRange(actualLowest.frequency).concat(
      classifyVocalRange(actualHighest.frequency)
    );
  }

  // Deduplicação de classificações se houver
  const seen = new Set<string>();
  classifications = classifications.filter((c) => {
    if (seen.has(c.voiceType)) return false;
    seen.add(c.voiceType);
    return true;
  });

  // Tonalidades sugeridas em torno da nota de conforto
  const suggestedKeys: Array<{ tonic: NoteName; mode: ScaleMode; label: string }> = [
    {
      tonic: centerNote,
      mode: 'major',
      label: `${centerNote} Maior (Tônica na nota central de conforto)`,
    },
    {
      tonic: centerNote,
      mode: 'natural_minor',
      label: `${centerNote} Menor (Para canções intimistas/melancólicas)`,
    },
    {
      tonic: NOTES[(centerNoteIdx + 5) % 12],
      mode: 'major',
      label: `${NOTES[(centerNoteIdx + 5) % 12]} Maior (Nota central atua como 5ª dominante)`,
    },
  ];

  return {
    lowestPitch: actualLowest,
    highestPitch: actualHighest,
    semitonesTotal,
    octavesSpan,
    semitonesRemainder,
    classifications,
    comfortableCenterNote: {
      note: centerNote,
      octave: centerOctave,
      scientificNotation: `${centerNote}${centerOctave}`,
      frequency: Math.round(centerFreq * 10) / 10,
    },
    suggestedKeys,
  };
}

