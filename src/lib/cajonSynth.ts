import { CajonSoundType } from '@/types/sequencer';

/**
 * Cria um buffer de ruído branco de 1 segundo reutilizável para economizar memória e CPU.
 */
let sharedNoiseBuffer: AudioBuffer | null = null;

function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (!sharedNoiseBuffer || sharedNoiseBuffer.sampleRate !== ctx.sampleRate) {
    const bufferSize = ctx.sampleRate; // 1 segundo
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      // Distribuição uniforme de ruído branco (-1.0 a 1.0)
      data[i] = Math.random() * 2 - 1;
    }
    sharedNoiseBuffer = buffer;
  }
  return sharedNoiseBuffer;
}

/**
 * Síntese do Bumbo de Cajón (Bass / Centro):
 * Frequência grave rápida com pitch bend descendente e corpo de madeira encorpado.
 */
export function playCajonBass(
  ctx: AudioContext,
  time: number,
  masterVolume: number = 1.0
): void {
  const now = Math.max(time, ctx.currentTime);
  const duration = 0.22;

  // Oscilador de onda senoidal pura para o corpo grave
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();

  // Filtro passa-baixa para aquecer o som e simular a ressonância da caixa de madeira
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(260, now);

  // Pitch bend descendente (140Hz -> 45Hz) característico do golpe no centro da tapa
  osc.type = 'sine';
  osc.frequency.setValueAtTime(140, now);
  osc.frequency.exponentialRampToValueAtTime(45, now + 0.12);

  // Envelope de volume com ataque imediato e caimento suave sem estalo
  const peakVolume = 0.95 * masterVolume;
  oscGain.gain.setValueAtTime(0.001, now);
  oscGain.gain.linearRampToValueAtTime(peakVolume, now + 0.006);
  oscGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(filter);
  filter.connect(oscGain);
  oscGain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + duration + 0.02);

  setTimeout(() => {
    try {
      osc.disconnect();
      filter.disconnect();
      oscGain.disconnect();
    } catch {}
  }, (duration + 0.1) * 1000);
}

/**
 * Síntese da Caixa/Estalo de Cajón (Snare / Slap / Borda):
 * Ruído branco filtrado com passa-banda + ataque percussivo rápido (esteira do cajón).
 */
export function playCajonSnare(
  ctx: AudioContext,
  time: number,
  masterVolume: number = 1.0
): void {
  const now = Math.max(time, ctx.currentTime);
  const duration = 0.11;

  // 1. Camada de Ruído Branco (esteira metálica e estalo de madeira)
  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = getNoiseBuffer(ctx);

  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.setValueAtTime(2400, now);
  noiseFilter.Q.setValueAtTime(1.4, now);

  const noiseGain = ctx.createGain();
  const noisePeak = 0.7 * masterVolume;
  noiseGain.gain.setValueAtTime(0.001, now);
  noiseGain.gain.linearRampToValueAtTime(noisePeak, now + 0.003);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  noiseSource.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(ctx.destination);

  // 2. Camada de Impacto da Madeira (Wood snap transient)
  const snapOsc = ctx.createOscillator();
  const snapGain = ctx.createGain();

  snapOsc.type = 'triangle';
  snapOsc.frequency.setValueAtTime(280, now);
  snapOsc.frequency.exponentialRampToValueAtTime(110, now + 0.025);

  const snapPeak = 0.5 * masterVolume;
  snapGain.gain.setValueAtTime(snapPeak, now);
  snapGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);

  snapOsc.connect(snapGain);
  snapGain.connect(ctx.destination);

  noiseSource.start(now);
  noiseSource.stop(now + duration + 0.02);
  snapOsc.start(now);
  snapOsc.stop(now + 0.035);

  setTimeout(() => {
    try {
      noiseSource.disconnect();
      noiseFilter.disconnect();
      noiseGain.disconnect();
      snapOsc.disconnect();
      snapGain.disconnect();
    } catch {}
  }, (duration + 0.1) * 1000);
}

/**
 * Síntese da Ghost Note de Cajón (Toque Suave / Leve dinâmica):
 * Toque de preenchimento rítmico com ganho atenuado e caimento curto.
 */
export function playCajonGhost(
  ctx: AudioContext,
  time: number,
  masterVolume: number = 1.0
): void {
  const now = Math.max(time, ctx.currentTime);
  const duration = 0.06;

  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = getNoiseBuffer(ctx);

  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'highpass';
  noiseFilter.frequency.setValueAtTime(3200, now);

  const noiseGain = ctx.createGain();
  const ghostPeak = 0.25 * masterVolume; // Volume atenuado para toque de fundo
  noiseGain.gain.setValueAtTime(0.001, now);
  noiseGain.gain.linearRampToValueAtTime(ghostPeak, now + 0.002);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  noiseSource.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(ctx.destination);

  noiseSource.start(now);
  noiseSource.stop(now + duration + 0.015);

  setTimeout(() => {
    try {
      noiseSource.disconnect();
      noiseFilter.disconnect();
      noiseGain.disconnect();
    } catch {}
  }, (duration + 0.1) * 1000);
}

/**
 * Despacha o disparo do som correspondente do cajón.
 */
export function playCajonSound(
  ctx: AudioContext,
  sound: CajonSoundType,
  time: number,
  volume: number = 1.0
): void {
  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  switch (sound) {
    case 'bass':
      playCajonBass(ctx, time, volume);
      break;
    case 'snare':
      playCajonSnare(ctx, time, volume);
      break;
    case 'ghost':
      playCajonGhost(ctx, time, volume);
      break;
  }
}
