import { NoteName } from '@/types/music';
import { noteToFrequency } from './musicTheory';

/**
 * Toca uma nota simples de forma suave com curva ADSR para evitar clicks/pops.
 */
export function playTone(
  audioContext: AudioContext,
  note: NoteName | string,
  octave: number = 4,
  durationSeconds: number = 0.8,
  a4Ref: number = 440
): void {
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }

  const now = audioContext.currentTime;
  const freq = noteToFrequency(note, octave, a4Ref);

  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, now);

  // Envelope anti-click: Attack rápido e Decay/Release suave
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.25, now + 0.05); // Attack
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSeconds); // Decay / Release

  osc.connect(gain);
  gain.connect(audioContext.destination);

  osc.start(now);
  osc.stop(now + durationSeconds + 0.02);

  setTimeout(() => {
    try {
      osc.disconnect();
      gain.disconnect();
    } catch {
      // Ignora erro se já desconectado
    }
  }, (durationSeconds + 0.1) * 1000);
}

/**
 * Toca um acorde arpejado suavemente com as notas formadoras.
 */
export function playChordArpeggio(
  audioContext: AudioContext,
  notes: NoteName[],
  baseOctave: number = 4,
  a4Ref: number = 440
): void {
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }

  notes.forEach((note, index) => {
    // Se a nota for mais grave que a raiz ou ultrapassar o ciclo, ajusta oitava
    const noteOctave = baseOctave + Math.floor(index / 3);
    const delay = index * 0.12;

    setTimeout(() => {
      playTone(audioContext, note, noteOctave, 1.2, a4Ref);
    }, delay * 1000);
  });
}
