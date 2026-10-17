'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { TimeSignature, Subdivision } from '@/types/music';
import { useAudioContext } from './useAudioContext';

export interface UseMetronomeOptions {
  initialBpm?: number;
  initialTimeSignature?: TimeSignature;
  initialSubdivision?: Subdivision;
}

export interface UseMetronomeReturn {
  isPlaying: boolean;
  bpm: number;
  timeSignature: TimeSignature;
  subdivision: Subdivision;
  currentBeat: number; // 0 a (beatsPerBar - 1)
  volume: number;      // 0 a 1
  setBpm: (bpm: number | ((prev: number) => number)) => void;
  setTimeSignature: (ts: TimeSignature) => void;
  setSubdivision: (sub: Subdivision) => void;
  setVolume: (vol: number) => void;
  start: () => Promise<void>;
  stop: () => void;
  togglePlay: () => Promise<void>;
  handleTapTempo: () => void;
}

const TIME_SIGNATURE_BEATS: Record<TimeSignature, number> = {
  '2/4': 2,
  '3/4': 3,
  '4/4': 4,
  '6/8': 6,
};

export function useMetronome(options: UseMetronomeOptions = {}): UseMetronomeReturn {
  const {
    initialBpm = 120,
    initialTimeSignature = '4/4',
    initialSubdivision = 1,
  } = options;

  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpmState] = useState(initialBpm);
  const [timeSignature, setTimeSignatureState] = useState<TimeSignature>(initialTimeSignature);
  const [subdivision, setSubdivisionState] = useState<Subdivision>(initialSubdivision);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [volume, setVolumeState] = useState(0.8);

  const { resumeContext } = useAudioContext();

  // Refs de controle para o Lookahead Scheduler
  const audioContextRef = useRef<AudioContext | null>(null);
  const bpmRef = useRef(bpm);
  const timeSignatureRef = useRef(timeSignature);
  const subdivisionRef = useRef(subdivision);
  const volumeRef = useRef(volume);

  const nextNoteTimeRef = useRef(0);
  const currentSubdivisionRef = useRef(0); // 0 a (subdivision - 1)
  const currentBeatInBarRef = useRef(0);
  const timerIdRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Fila de notas agendadas para sincronização visual precisa
  const notesInQueueRef = useRef<
    Array<{ beat: number; isSubdivision: boolean; time: number }>
  >([]);

  // Histórico de Tap Tempo
  const tapTimesRef = useRef<number[]>([]);
  const updateVisualPulseRef = useRef<() => void>(() => {});

  // Sincronização de refs via useEffect para React 19
  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);

  useEffect(() => {
    timeSignatureRef.current = timeSignature;
  }, [timeSignature]);

  useEffect(() => {
    subdivisionRef.current = subdivision;
  }, [subdivision]);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  const setBpm = useCallback((value: number | ((prev: number) => number)) => {
    setBpmState((prev) => {
      const next = typeof value === 'function' ? value(prev) : value;
      return Math.max(30, Math.min(280, Math.round(next)));
    });
  }, []);

  const setTimeSignature = useCallback((ts: TimeSignature) => {
    setTimeSignatureState(ts);
    currentBeatInBarRef.current = 0;
    currentSubdivisionRef.current = 0;
    setCurrentBeat(0);
  }, []);

  const setSubdivision = useCallback((sub: Subdivision) => {
    setSubdivisionState(sub);
    currentSubdivisionRef.current = 0;
  }, []);

  const setVolume = useCallback((vol: number) => {
    setVolumeState(Math.max(0, Math.min(1, vol)));
  }, []);

  // Toca um clique sintetizado com Web Audio API sem estalos
  const scheduleClick = useCallback(
    (time: number, isAccent: boolean, isSub: boolean) => {
      const ctx = audioContextRef.current;
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';

      let freq = 800; // Tempo regular
      let gainLevel = 0.5 * volumeRef.current;
      let decayTime = 0.04;

      if (isAccent) {
        freq = 1250; // Tempo 1 (Acento forte)
        gainLevel = 0.85 * volumeRef.current;
        decayTime = 0.06;
      } else if (isSub) {
        freq = 550; // Subdivisões suaves
        gainLevel = 0.25 * volumeRef.current;
        decayTime = 0.025;
      }

      osc.frequency.setValueAtTime(freq, time);

      // Envelope com attack imediato e rampa exponencial anti-pop
      gain.gain.setValueAtTime(gainLevel, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + decayTime);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(time);
      osc.stop(time + decayTime + 0.01);

      setTimeout(() => {
        try {
          osc.disconnect();
          gain.disconnect();
        } catch {}
      }, (decayTime + 0.1) * 1000);
    },
    []
  );

  // Avança para o próximo pulso/subdivisão no tempo
  const advanceNote = useCallback(() => {
    const secondsPerBeat = 60.0 / bpmRef.current;
    const sub = subdivisionRef.current;
    const beatsPerBar = TIME_SIGNATURE_BEATS[timeSignatureRef.current];

    // Avança o tempo de acordo com a fração da subdivisão
    nextNoteTimeRef.current += secondsPerBeat / sub;

    currentSubdivisionRef.current += 1;
    if (currentSubdivisionRef.current >= sub) {
      currentSubdivisionRef.current = 0;
      currentBeatInBarRef.current =
        (currentBeatInBarRef.current + 1) % beatsPerBar;
    }
  }, []);

  // Lookahead Scheduler: agenda notas antecipadamente na janela de 100ms
  const scheduler = useCallback(() => {
    const ctx = audioContextRef.current;
    if (!ctx) return;

    const scheduleAheadTime = 0.1; // 100ms à frente

    while (nextNoteTimeRef.current < ctx.currentTime + scheduleAheadTime) {
      const isSub = currentSubdivisionRef.current !== 0;
      const isAccent = !isSub && currentBeatInBarRef.current === 0;

      scheduleClick(nextNoteTimeRef.current, isAccent, isSub);

      notesInQueueRef.current.push({
        beat: currentBeatInBarRef.current,
        isSubdivision: isSub,
        time: nextNoteTimeRef.current,
      });

      advanceNote();
    }
  }, [scheduleClick, advanceNote]);

  // Loop de atualização visual com requestAnimationFrame
  const updateVisualPulse = useCallback(() => {
    const ctx = audioContextRef.current;
    if (ctx) {
      const currentTime = ctx.currentTime;
      while (
        notesInQueueRef.current.length > 0 &&
        notesInQueueRef.current[0].time <= currentTime
      ) {
        const currentNote = notesInQueueRef.current[0];
        if (!currentNote.isSubdivision) {
          setCurrentBeat(currentNote.beat);
        }
        notesInQueueRef.current.shift();
      }
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      updateVisualPulseRef.current();
    });
  }, []);

  useEffect(() => {
    updateVisualPulseRef.current = updateVisualPulse;
  }, [updateVisualPulse]);

  const stop = useCallback(() => {
    if (timerIdRef.current) {
      clearInterval(timerIdRef.current);
      timerIdRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    notesInQueueRef.current = [];
    currentBeatInBarRef.current = 0;
    currentSubdivisionRef.current = 0;
    setCurrentBeat(0);
    setIsPlaying(false);
  }, []);

  const start = useCallback(async () => {
    const ctx = await resumeContext();
    if (!ctx) return;

    audioContextRef.current = ctx;

    currentBeatInBarRef.current = 0;
    currentSubdivisionRef.current = 0;
    setCurrentBeat(0);
    notesInQueueRef.current = [];

    // Agenda o primeiro pulso imediatamente no currentTime + 50ms
    nextNoteTimeRef.current = ctx.currentTime + 0.05;

    setIsPlaying(true);

    // Lookahead loop disparado a cada 25ms
    timerIdRef.current = setInterval(scheduler, 25);
    animationFrameRef.current = requestAnimationFrame(updateVisualPulse);
  }, [resumeContext, scheduler, updateVisualPulse]);

  const togglePlay = useCallback(async () => {
    if (isPlaying) {
      stop();
    } else {
      await start();
    }
  }, [isPlaying, start, stop]);

  // Tap Tempo: calcula a média de intervalos recentes
  const handleTapTempo = useCallback(() => {
    const now = performance.now();
    const taps = tapTimesRef.current;

    // Se o último tap foi há mais de 2.5s, reseta a contagem
    if (taps.length > 0 && now - taps[taps.length - 1] > 2500) {
      tapTimesRef.current = [now];
      return;
    }

    taps.push(now);

    // Mantém no máximo os 4 últimos taps
    if (taps.length > 4) {
      taps.shift();
    }

    if (taps.length >= 2) {
      let totalDiff = 0;
      for (let i = 1; i < taps.length; i++) {
        totalDiff += taps[i] - taps[i - 1];
      }
      const avgInterval = totalDiff / (taps.length - 1);
      const calculatedBpm = Math.round(60000 / avgInterval);

      setBpm(calculatedBpm);
    }
  }, [setBpm]);

  // Limpeza ao desmontar
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    isPlaying,
    bpm,
    timeSignature,
    subdivision,
    currentBeat,
    volume,
    setBpm,
    setTimeSignature,
    setSubdivision,
    setVolume,
    start,
    stop,
    togglePlay,
    handleTapTempo,
  };
}
