'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { NoteName, WaveformType } from '@/types/music';
import { noteToFrequency } from '@/lib/musicTheory';
import { useAudioContext } from './useAudioContext';

export interface UseToneGeneratorOptions {
  initialNote?: NoteName;
  initialOctave?: number;
  initialWaveform?: WaveformType;
  initialVolume?: number;
  a4Ref?: number;
}

export interface UseToneGeneratorReturn {
  isPlaying: boolean;
  currentNote: NoteName;
  currentOctave: number;
  frequency: number;
  waveform: WaveformType;
  volume: number;
  isSustainMode: boolean;
  setNote: (note: NoteName) => void;
  setOctave: (octave: number) => void;
  setWaveform: (wf: WaveformType) => void;
  setVolume: (vol: number) => void;
  setIsSustainMode: (sustain: boolean) => void;
  startTone: (overrideNote?: NoteName, overrideOctave?: number) => Promise<void>;
  stopTone: () => void;
  toggleSustain: () => Promise<void>;
  handlePressStart: (note?: NoteName, octave?: number) => Promise<void>;
  handlePressEnd: () => void;
}

export function useToneGenerator(
  options: UseToneGeneratorOptions = {}
): UseToneGeneratorReturn {
  const {
    initialNote = 'C',
    initialOctave = 4,
    initialWaveform = 'sine',
    initialVolume = 0.5,
    a4Ref = 440,
  } = options;

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentNote, setCurrentNote] = useState<NoteName>(initialNote);
  const [currentOctave, setCurrentOctave] = useState<number>(initialOctave);
  const [waveform, setWaveformState] = useState<WaveformType>(initialWaveform);
  const [volume, setVolumeState] = useState<number>(initialVolume);
  const [isSustainMode, setIsSustainMode] = useState<boolean>(true);

  const { resumeContext } = useAudioContext();

  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  const noteRef = useRef(currentNote);
  const octaveRef = useRef(currentOctave);
  const waveformRef = useRef(waveform);
  const volumeRef = useRef(volume);

  useEffect(() => {
    noteRef.current = currentNote;
  }, [currentNote]);

  useEffect(() => {
    octaveRef.current = currentOctave;
  }, [currentOctave]);

  useEffect(() => {
    waveformRef.current = waveform;
    if (oscillatorRef.current) {
      oscillatorRef.current.type = waveform;
    }
  }, [waveform]);

  useEffect(() => {
    volumeRef.current = volume;
    if (gainNodeRef.current && audioContextRef.current && isPlaying) {
      const now = audioContextRef.current.currentTime;
      gainNodeRef.current.gain.linearRampToValueAtTime(volume, now + 0.05);
    }
  }, [volume, isPlaying]);

  const frequency = noteToFrequency(currentNote, currentOctave, a4Ref);

  // Para o tom com fade-out suave para eliminar cliques
  const stopTone = useCallback(() => {
    const ctx = audioContextRef.current;
    const gain = gainNodeRef.current;
    const osc = oscillatorRef.current;

    if (gain && ctx) {
      const now = ctx.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      // Rampa suave de atenuação (fade out de 40ms)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

      setTimeout(() => {
        try {
          if (osc) {
            osc.stop();
            osc.disconnect();
          }
          gain.disconnect();
        } catch {}
        oscillatorRef.current = null;
        gainNodeRef.current = null;
      }, 50);
    }

    setIsPlaying(false);
  }, []);

  // Inicia o tom com fade-in suave
  const startTone = useCallback(
    async (overrideNote?: NoteName, overrideOctave?: number) => {
      const ctx = await resumeContext();
      if (!ctx) return;

      audioContextRef.current = ctx;

      const targetNote = overrideNote ?? noteRef.current;
      const targetOctave = overrideOctave ?? octaveRef.current;
      const freq = noteToFrequency(targetNote, targetOctave, a4Ref);

      // Se já estava tocando, atualiza a frequência suavemente sem reiniciar
      if (oscillatorRef.current && gainNodeRef.current) {
        const now = ctx.currentTime;
        oscillatorRef.current.frequency.cancelScheduledValues(now);
        oscillatorRef.current.frequency.exponentialRampToValueAtTime(freq, now + 0.03);
        setIsPlaying(true);
        return;
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = waveformRef.current;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      // Envelope anti-click com attack suave
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(volumeRef.current, now + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);

      oscillatorRef.current = osc;
      gainNodeRef.current = gain;
      setIsPlaying(true);
    },
    [resumeContext, a4Ref]
  );

  const toggleSustain = useCallback(async () => {
    if (isPlaying) {
      stopTone();
    } else {
      await startTone();
    }
  }, [isPlaying, startTone, stopTone]);

  const handlePressStart = useCallback(
    async (note?: NoteName, octave?: number) => {
      if (note) setCurrentNote(note);
      if (octave) setCurrentOctave(octave);
      await startTone(note, octave);
    },
    [startTone]
  );

  const handlePressEnd = useCallback(() => {
    if (!isSustainMode) {
      stopTone();
    }
  }, [isSustainMode, stopTone]);

  const setNote = useCallback(
    (note: NoteName) => {
      setCurrentNote(note);
      if (isPlaying) {
        startTone(note, currentOctave);
      }
    },
    [isPlaying, currentOctave, startTone]
  );

  const setOctave = useCallback(
    (octave: number) => {
      const clamped = Math.max(2, Math.min(6, octave));
      setCurrentOctave(clamped);
      if (isPlaying) {
        startTone(currentNote, clamped);
      }
    },
    [isPlaying, currentNote, startTone]
  );

  const setWaveform = useCallback((wf: WaveformType) => {
    setWaveformState(wf);
  }, []);

  const setVolume = useCallback((vol: number) => {
    setVolumeState(Math.max(0, Math.min(1, vol)));
  }, []);

  useEffect(() => {
    return () => {
      stopTone();
    };
  }, [stopTone]);

  return {
    isPlaying,
    currentNote,
    currentOctave,
    frequency,
    waveform,
    volume,
    isSustainMode,
    setNote,
    setOctave,
    setWaveform,
    setVolume,
    setIsSustainMode,
    startTone,
    stopTone,
    toggleSustain,
    handlePressStart,
    handlePressEnd,
  };
}
