'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseAudioContextReturn {
  audioContext: AudioContext | null;
  state: AudioContextState | 'uninitialized';
  resumeContext: () => Promise<AudioContext | null>;
  getOrCreateContext: () => AudioContext;
}

/**
 * Hook para gerenciamento seguro do ciclo de vida do AudioContext.
 * Trata as políticas de Autoplay dos navegadores, garantindo que
 * o contexto só seja inicializado ou resumido após ação do usuário.
 */
export function useAudioContext(): UseAudioContextReturn {
  const contextRef = useRef<AudioContext | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [state, setState] = useState<AudioContextState | 'uninitialized'>('uninitialized');

  const getOrCreateContext = useCallback((): AudioContext => {
    if (!contextRef.current || contextRef.current.state === 'closed') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

      const newCtx = new AudioCtx({
        latencyHint: 'interactive',
      });

      contextRef.current = newCtx;
      setAudioContext(newCtx);
      setState(newCtx.state);

      newCtx.onstatechange = () => {
        if (contextRef.current) {
          setState(contextRef.current.state);
        }
      };
    }
    return contextRef.current;
  }, []);

  const resumeContext = useCallback(async (): Promise<AudioContext | null> => {
    const ctx = getOrCreateContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    setState(ctx.state);
    return ctx;
  }, [getOrCreateContext]);

  useEffect(() => {
    return () => {
      if (contextRef.current && contextRef.current.state !== 'closed') {
        contextRef.current.close().catch(() => {});
        contextRef.current = null;
        setAudioContext(null);
      }
    };
  }, []);

  return {
    audioContext,
    state,
    resumeContext,
    getOrCreateContext,
  };
}
