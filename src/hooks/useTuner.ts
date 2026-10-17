'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { PitchDetectionResult } from '@/types/music';
import { detectPitch } from '@/lib/pitchDetection';
import { useAudioContext } from './useAudioContext';

export interface UseTunerOptions {
  initialA4Ref?: number;
  minVolume?: number;
}

export interface UseTunerReturn {
  isListening: boolean;
  pitchResult: PitchDetectionResult | null;
  volume: number; // 0 a 1
  a4Ref: number;
  setA4Ref: (hz: number) => void;
  error: string | null;
  startListening: () => Promise<void>;
  stopListening: () => void;
  // Freeze Mode
  isFrozen: boolean;
  frozenResult: PitchDetectionResult | null;
  frozenCentsOffset: number; // desvio manual em cents aplicado sobre a nota congelada
  freeze: () => void;
  unfreeze: () => void;
  adjustFrozenCents: (deltaCents: number) => void;
}

export function useTuner(options: UseTunerOptions = {}): UseTunerReturn {
  const { initialA4Ref = 440, minVolume = 0.012 } = options;

  const [isListening, setIsListening] = useState(false);
  const [pitchResult, setPitchResult] = useState<PitchDetectionResult | null>(null);
  const [volume, setVolume] = useState(0);
  const [a4Ref, setA4Ref] = useState(initialA4Ref);
  const [error, setError] = useState<string | null>(null);

  // Freeze Mode
  const [isFrozen, setIsFrozen] = useState(false);
  const [frozenResult, setFrozenResult] = useState<PitchDetectionResult | null>(null);
  const [frozenCentsOffset, setFrozenCentsOffset] = useState(0);
  const lastResultRef = useRef<PitchDetectionResult | null>(null);

  const { resumeContext } = useAudioContext();

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const timeDataRef = useRef<Float32Array<ArrayBuffer> | null>(null);
  const smoothedCentsRef = useRef<number>(0);
  const lastDetectedNoteRef = useRef<string | null>(null);
  const silenceCounterRef = useRef<number>(0);

  const a4RefCurrent = useRef(a4Ref);
  useEffect(() => {
    a4RefCurrent.current = a4Ref;
  }, [a4Ref]);

  const stopListening = useCallback(() => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }

    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.disconnect();
      } catch {}
      sourceNodeRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setIsListening(false);
    setPitchResult(null);
    setVolume(0);
    smoothedCentsRef.current = 0;
    lastDetectedNoteRef.current = null;
  }, []);

  const startListening = useCallback(async () => {
    try {
      setError(null);

      // Garante contexto ativo após interação do usuário
      const audioCtx = await resumeContext();
      if (!audioCtx) {
        throw new Error('Falha ao inicializar o AudioContext');
      }
      audioContextRef.current = audioCtx;

      // Solicita acesso ao microfone com processamento desativado para áudio cru e preciso
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          autoGainControl: false,
          noiseSuppression: false,
        },
      });

      streamRef.current = stream;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      analyserNodeRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceNodeRef.current = source;

      const buffer = new Float32Array(analyser.fftSize);
      timeDataRef.current = buffer;

      setIsListening(true);

      const analyzeLoop = () => {
        if (!analyserNodeRef.current || !timeDataRef.current) return;

        analyserNodeRef.current.getFloatTimeDomainData(timeDataRef.current);

        const detected = detectPitch(timeDataRef.current, {
          sampleRate: audioCtx.sampleRate,
          a4Ref: a4RefCurrent.current,
          minVolume,
        });

        if (detected) {
          silenceCounterRef.current = 0;
          setVolume(detected.volume);

          // Suavização do ponteiro para a mesma nota
          if (lastDetectedNoteRef.current === detected.scientificNotation) {
            smoothedCentsRef.current =
              smoothedCentsRef.current * 0.65 + detected.cents * 0.35;
          } else {
            smoothedCentsRef.current = detected.cents;
            lastDetectedNoteRef.current = detected.scientificNotation;
          }

          const result: PitchDetectionResult = {
            ...detected,
            cents: Math.round(smoothedCentsRef.current),
            inTune: Math.abs(Math.round(smoothedCentsRef.current)) <= 5,
          };
          lastResultRef.current = result;
          setPitchResult(result);
        } else {
          // Incrementa contador de silêncio para não limpar instantaneamente
          silenceCounterRef.current += 1;
          setVolume((prev) => Math.max(0, prev * 0.85));

          if (silenceCounterRef.current > 25) {
            setPitchResult(null);
            smoothedCentsRef.current = 0;
            lastDetectedNoteRef.current = null;
          }
        }

        animationFrameIdRef.current = requestAnimationFrame(analyzeLoop);
      };

      animationFrameIdRef.current = requestAnimationFrame(analyzeLoop);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Erro ao acessar o microfone';
      setError(
        message.includes('Permission') || message.includes('denied')
          ? 'Permissão de microfone negada. Por favor, autorize o microfone no navegador.'
          : `Erro de áudio: ${message}`
      );
      stopListening();
    }
  }, [resumeContext, minVolume, stopListening]);

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  // --- Freeze Mode actions ---
  const freeze = useCallback(() => {
    const snapshot = lastResultRef.current;
    if (snapshot) {
      setFrozenResult(snapshot);
      setFrozenCentsOffset(0);
      setIsFrozen(true);
      // Pausa microfone enquanto congelado
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
    }
  }, []);

  const unfreeze = useCallback(() => {
    setIsFrozen(false);
    setFrozenResult(null);
    setFrozenCentsOffset(0);
    // Reativa loop de análise se ainda estiver ouvindo
    if (analyserNodeRef.current && timeDataRef.current && audioContextRef.current) {
      const analyzeLoop = () => {
        if (!analyserNodeRef.current || !timeDataRef.current || !audioContextRef.current) return;
        analyserNodeRef.current.getFloatTimeDomainData(timeDataRef.current);
        const detected = detectPitch(timeDataRef.current, {
          sampleRate: audioContextRef.current.sampleRate,
          a4Ref: a4RefCurrent.current,
          minVolume,
        });
        if (detected) {
          silenceCounterRef.current = 0;
          setVolume(detected.volume);
          if (lastDetectedNoteRef.current === detected.scientificNotation) {
            smoothedCentsRef.current = smoothedCentsRef.current * 0.65 + detected.cents * 0.35;
          } else {
            smoothedCentsRef.current = detected.cents;
            lastDetectedNoteRef.current = detected.scientificNotation;
          }
          const result: PitchDetectionResult = {
            ...detected,
            cents: Math.round(smoothedCentsRef.current),
            inTune: Math.abs(Math.round(smoothedCentsRef.current)) <= 5,
          };
          lastResultRef.current = result;
          setPitchResult(result);
        } else {
          silenceCounterRef.current += 1;
          setVolume((prev) => Math.max(0, prev * 0.85));
          if (silenceCounterRef.current > 25) {
            setPitchResult(null);
            smoothedCentsRef.current = 0;
            lastDetectedNoteRef.current = null;
          }
        }
        animationFrameIdRef.current = requestAnimationFrame(analyzeLoop);
      };
      animationFrameIdRef.current = requestAnimationFrame(analyzeLoop);
    }
  }, [minVolume]);

  const adjustFrozenCents = useCallback((deltaCents: number) => {
    setFrozenCentsOffset((prev) => Math.max(-50, Math.min(50, prev + deltaCents)));
  }, []);

  return {
    isListening,
    pitchResult,
    volume,
    a4Ref,
    setA4Ref,
    error,
    startListening,
    stopListening,
    isFrozen,
    frozenResult,
    frozenCentsOffset,
    freeze,
    unfreeze,
    adjustFrozenCents,
  };
}
