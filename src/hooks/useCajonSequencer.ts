'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { CajonSoundType, StepCount, StepGrid, GroovePreset } from '@/types/sequencer';
import { playCajonSound } from '@/lib/cajonSynth';
import { GROOVE_PRESETS } from '@/lib/groovePresets';
import { useAudioContext } from './useAudioContext';

export interface UseCajonSequencerOptions {
  initialPresetId?: string;
  initialBpm?: number;
}

export interface UseCajonSequencerReturn {
  isPlaying: boolean;
  bpm: number;
  stepCount: StepCount;
  currentStep: number;
  grid: StepGrid;
  volume: number;
  activePresetId: string | null;
  setBpm: (bpm: number | ((prev: number) => number)) => void;
  setStepCount: (count: StepCount) => void;
  setVolume: (vol: number) => void;
  toggleStep: (sound: CajonSoundType, stepIndex: number) => void;
  clearGrid: () => void;
  loadPreset: (preset: GroovePreset) => void;
  start: () => Promise<void>;
  stop: () => void;
  togglePlay: () => Promise<void>;
  auditionSound: (sound: CajonSoundType) => Promise<void>;
}

export function useCajonSequencer(
  options: UseCajonSequencerOptions = {}
): UseCajonSequencerReturn {
  const defaultPreset = GROOVE_PRESETS[0]; // Pop/Rock Básico
  const {
    initialPresetId = defaultPreset.id,
    initialBpm = defaultPreset.defaultBpm,
  } = options;

  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpmState] = useState(initialBpm);
  const [stepCount, setStepCountState] = useState<StepCount>(defaultPreset.stepCount);
  const [grid, setGrid] = useState<StepGrid>(defaultPreset.grid);
  const [currentStep, setCurrentStep] = useState(0);
  const [volume, setVolumeState] = useState(0.85);
  const [activePresetId, setActivePresetId] = useState<string | null>(initialPresetId);

  const { resumeContext } = useAudioContext();

  const audioContextRef = useRef<AudioContext | null>(null);
  const bpmRef = useRef(bpm);
  const stepCountRef = useRef(stepCount);
  const gridRef = useRef(grid);
  const volumeRef = useRef(volume);

  const nextStepTimeRef = useRef(0);
  const currentStepRef = useRef(0);
  const timerIdRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const stepsInQueueRef = useRef<Array<{ step: number; time: number }>>([]);
  const updatePlayheadRef = useRef<() => void>(() => {});

  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);

  useEffect(() => {
    stepCountRef.current = stepCount;
  }, [stepCount]);

  useEffect(() => {
    gridRef.current = grid;
  }, [grid]);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  const setBpm = useCallback((value: number | ((prev: number) => number)) => {
    setBpmState((prev) => {
      const next = typeof value === 'function' ? value(prev) : value;
      return Math.max(30, Math.min(280, Math.round(next)));
    });
  }, []);

  const setStepCount = useCallback((count: StepCount) => {
    setStepCountState(count);
    setGrid((prev) => {
      const resizeRow = (arr: boolean[]) => {
        const result = Array(count).fill(false);
        for (let i = 0; i < Math.min(arr.length, count); i++) {
          result[i] = arr[i];
        }
        return result;
      };
      return {
        bass: resizeRow(prev.bass),
        snare: resizeRow(prev.snare),
        ghost: resizeRow(prev.ghost),
      };
    });
    currentStepRef.current = 0;
    setCurrentStep(0);
    setActivePresetId(null);
  }, []);

  const setVolume = useCallback((vol: number) => {
    setVolumeState(Math.max(0, Math.min(1, vol)));
  }, []);

  const toggleStep = useCallback(
    (sound: CajonSoundType, stepIndex: number) => {
      setGrid((prev) => {
        const row = [...prev[sound]];
        row[stepIndex] = !row[stepIndex];
        return {
          ...prev,
          [sound]: row,
        };
      });
      setActivePresetId(null); // Modificado manualmente pelo usuário
    },
    []
  );

  const clearGrid = useCallback(() => {
    setGrid({
      bass: Array(stepCountRef.current).fill(false),
      snare: Array(stepCountRef.current).fill(false),
      ghost: Array(stepCountRef.current).fill(false),
    });
    setActivePresetId(null);
  }, []);

  const loadPreset = useCallback((preset: GroovePreset) => {
    setStepCountState(preset.stepCount);
    setGrid(preset.grid);
    setBpmState(preset.defaultBpm);
    setActivePresetId(preset.id);
    currentStepRef.current = 0;
    setCurrentStep(0);
  }, []);

  // Testa um som individual do cajón
  const auditionSound = useCallback(
    async (sound: CajonSoundType) => {
      const ctx = await resumeContext();
      if (ctx) {
        audioContextRef.current = ctx;
        playCajonSound(ctx, sound, ctx.currentTime, volumeRef.current);
      }
    },
    [resumeContext]
  );

  // Calcula duração de cada passo em segundos
  const getSecondsPerStep = useCallback(() => {
    const secondsPerBeat = 60.0 / bpmRef.current;
    // Se o grid tem 16 ou 12 passos (subdivisão de semicolcheia = 4 por semínima)
    // Se tem 8 passos (subdivisão de colcheia = 2 por semínima)
    const subdivisionsPerBeat = stepCountRef.current === 8 ? 2 : 4;
    return secondsPerBeat / subdivisionsPerBeat;
  }, []);

  // Lookahead Scheduler
  const scheduler = useCallback(() => {
    const ctx = audioContextRef.current;
    if (!ctx) return;

    const scheduleAheadTime = 0.1; // Janela de 100ms
    const secondsPerStep = getSecondsPerStep();
    const totalSteps = stepCountRef.current;
    const currentGrid = gridRef.current;

    while (nextStepTimeRef.current < ctx.currentTime + scheduleAheadTime) {
      const step = currentStepRef.current;
      const stepTime = nextStepTimeRef.current;

      // Dispara os instrumentos ativados neste passo
      if (currentGrid.bass[step]) {
        playCajonSound(ctx, 'bass', stepTime, volumeRef.current);
      }
      if (currentGrid.snare[step]) {
        playCajonSound(ctx, 'snare', stepTime, volumeRef.current);
      }
      if (currentGrid.ghost[step]) {
        playCajonSound(ctx, 'ghost', stepTime, volumeRef.current);
      }

      stepsInQueueRef.current.push({
        step,
        time: stepTime,
      });

      // Avança o passo
      nextStepTimeRef.current += secondsPerStep;
      currentStepRef.current = (step + 1) % totalSteps;
    }
  }, [getSecondsPerStep]);

  // Atualização visual síncrona do playhead
  const updatePlayhead = useCallback(() => {
    const ctx = audioContextRef.current;
    if (ctx) {
      const currentTime = ctx.currentTime;
      while (
        stepsInQueueRef.current.length > 0 &&
        stepsInQueueRef.current[0].time <= currentTime
      ) {
        setCurrentStep(stepsInQueueRef.current[0].step);
        stepsInQueueRef.current.shift();
      }
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      updatePlayheadRef.current();
    });
  }, []);

  useEffect(() => {
    updatePlayheadRef.current = updatePlayhead;
  }, [updatePlayhead]);

  const stop = useCallback(() => {
    if (timerIdRef.current) {
      clearInterval(timerIdRef.current);
      timerIdRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    stepsInQueueRef.current = [];
    currentStepRef.current = 0;
    setCurrentStep(0);
    setIsPlaying(false);
  }, []);

  const start = useCallback(async () => {
    const ctx = await resumeContext();
    if (!ctx) return;

    audioContextRef.current = ctx;
    currentStepRef.current = 0;
    setCurrentStep(0);
    stepsInQueueRef.current = [];

    nextStepTimeRef.current = ctx.currentTime + 0.05;
    setIsPlaying(true);

    timerIdRef.current = setInterval(scheduler, 25);
    animationFrameRef.current = requestAnimationFrame(() => {
      updatePlayheadRef.current();
    });
  }, [resumeContext, scheduler]);

  const togglePlay = useCallback(async () => {
    if (isPlaying) {
      stop();
    } else {
      await start();
    }
  }, [isPlaying, start, stop]);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    isPlaying,
    bpm,
    stepCount,
    currentStep,
    grid,
    volume,
    activePresetId,
    setBpm,
    setStepCount,
    setVolume,
    toggleStep,
    clearGrid,
    loadPreset,
    start,
    stop,
    togglePlay,
    auditionSound,
  };
}
