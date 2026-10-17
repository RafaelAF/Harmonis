import { PitchDetectionResult } from '@/types/music';
import { frequencyToPitch } from './musicTheory';

export interface PitchDetectorOptions {
  sampleRate: number;
  a4Ref?: number;
  minVolume?: number; // RMS threshold (ex: 0.01)
  minFrequency?: number; // ex: 60 Hz (B1)
  maxFrequency?: number; // ex: 1200 Hz (D6)
  clarityThreshold?: number; // ex: 0.75
}

/**
 * Calcula o RMS (Root Mean Square) do sinal de áudio para medir volume/energia.
 */
export function calculateRMS(buffer: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) {
    sum += buffer[i] * buffer[i];
  }
  return Math.sqrt(sum / buffer.length);
}

/**
 * Algoritmo de Autocorrelação com interpolação parabólica e Noise Gate
 * para detecção de frequência fundamental em tempo real.
 */
export function detectPitch(
  buffer: Float32Array,
  options: PitchDetectorOptions
): PitchDetectionResult | null {
  const {
    sampleRate,
    a4Ref = 440,
    minVolume = 0.015,
    minFrequency = 60,
    maxFrequency = 1200,
    clarityThreshold = 0.75,
  } = options;

  const rms = calculateRMS(buffer);
  if (rms < minVolume) {
    return null; // Silêncio ou ruído de fundo fraco
  }

  const bufferSize = buffer.length;
  const minLag = Math.floor(sampleRate / maxFrequency);
  const maxLag = Math.floor(sampleRate / minFrequency);

  // Calcula autocorrelação em zero (energia base)
  let r0 = 0;
  for (let i = 0; i < bufferSize; i++) {
    r0 += buffer[i] * buffer[i];
  }

  if (r0 === 0) return null;

  // Busca do melhor lag com autocorrelação normalizada
  let bestLag = -1;
  let bestCorrelation = -1;
  let hasCrossedZero = false;

  for (let lag = minLag; lag <= maxLag && lag < bufferSize; lag++) {
    let sum = 0;
    for (let i = 0; i < bufferSize - lag; i++) {
      sum += buffer[i] * buffer[i + lag];
    }

    const normalizedCorr = sum / r0;

    // Detecta a primeira descida para evitar falsos harmônicos do lag zero
    if (!hasCrossedZero && normalizedCorr < 0.2) {
      hasCrossedZero = true;
    }

    // Após o primeiro vale, rastreia os picos
    if (hasCrossedZero) {
      if (normalizedCorr > bestCorrelation) {
        bestCorrelation = normalizedCorr;
        bestLag = lag;
      }
    }
  }

  if (bestLag === -1 || bestCorrelation < clarityThreshold) {
    return null;
  }

  // Refinamento sub-amostra por interpolação parabólica
  let refinedLag = bestLag;
  if (bestLag > 1 && bestLag < bufferSize - 1) {
    let prevSum = 0;
    let nextSum = 0;
    for (let i = 0; i < bufferSize - bestLag; i++) {
      prevSum += buffer[i] * buffer[i + (bestLag - 1)];
      nextSum += buffer[i] * buffer[i + (bestLag + 1)];
    }

    const y1 = prevSum / r0;
    const y2 = bestCorrelation;
    const y3 = nextSum / r0;

    const denominator = 2 * (2 * y2 - y1 - y3);
    if (Math.abs(denominator) > 1e-6) {
      const delta = (y3 - y1) / denominator;
      if (Math.abs(delta) < 1) {
        refinedLag = bestLag + delta;
      }
    }
  }

  const frequency = sampleRate / refinedLag;

  if (frequency < minFrequency || frequency > maxFrequency) {
    return null;
  }

  const pitch = frequencyToPitch(frequency, a4Ref);
  if (!pitch) return null;

  return {
    ...pitch,
    clarity: Math.min(1, Math.max(0, bestCorrelation)),
    volume: Math.min(1, rms * 5), // Normaliza escala de volume para exibição visual
  };
}
