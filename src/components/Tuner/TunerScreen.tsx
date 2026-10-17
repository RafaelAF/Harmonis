'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTuner } from '@/hooks/useTuner';
import { PitchGauge } from './PitchGauge';
import { HarmonicFieldVisualizer } from './HarmonicFieldVisualizer';
import { NoteName, ScaleMode } from '@/types/music';
import { Snowflake, Mic } from 'lucide-react';
import { playToneWithCents } from '@/lib/audioSynth';
import { useAudioContext } from '@/hooks/useAudioContext';

export function TunerScreen() {
  const {
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
  } = useTuner({ initialA4Ref: 440 });

  const [selectedTonic, setSelectedTonic] = useState<NoteName>('C');
  const [selectedMode, setSelectedMode] = useState<ScaleMode>('major');
  const { resumeContext } = useAudioContext();

  const handleToggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleFreeze = useCallback(() => {
    if (isFrozen) {
      unfreeze();
    } else {
      freeze();
    }
  }, [isFrozen, freeze, unfreeze]);

  // Atalho de teclado: Espaço = Congelar / Descongelar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        handleFreeze();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleFreeze]);

  // Reproduz a nota congelada com desvio de cents
  const handlePlayFrozenNote = async () => {
    if (!frozenResult) return;
    const ctx = await resumeContext();
    if (ctx) {
      playToneWithCents(ctx, frozenResult.note, frozenResult.octave, frozenCentsOffset, 1.5, a4Ref);
    }
  };

  // A nota exibida no campo harmônico é: a nota congelada (freeze mode) ou a detectada em tempo real
  const displayedPitch = isFrozen ? frozenResult : pitchResult;

  return (
    <div className="space-y-6">
      {/* 1. Afinador Cromático em Tempo Real */}
      <PitchGauge
        isListening={isListening}
        pitchResult={pitchResult}
        volume={volume}
        a4Ref={a4Ref}
        onA4RefChange={setA4Ref}
        onToggleListening={handleToggleListening}
        error={error}
        isFrozen={isFrozen}
        frozenResult={frozenResult}
        frozenCentsOffset={frozenCentsOffset}
        onFreeze={handleFreeze}
        onPlayFrozenNote={handlePlayFrozenNote}
        onAdjustFrozenCents={adjustFrozenCents}
      />

      {/* 2. Campo Harmônico Dinâmico Integrado com Destaque de Nota */}
      <HarmonicFieldVisualizer
        detectedPitch={displayedPitch}
        selectedTonic={selectedTonic}
        selectedMode={selectedMode}
        onTonicChange={setSelectedTonic}
        onModeChange={setSelectedMode}
        a4Ref={a4Ref}
        isFrozen={isFrozen}
      />

      {/* Banner de Modo Congelado */}
      {isFrozen && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl bg-cyan-950/90 border border-cyan-500/40 shadow-xl shadow-cyan-500/10 backdrop-blur-md text-sm text-cyan-300 font-medium pointer-events-none">
          <Snowflake className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span>Modo Congelado — Pressione <kbd className="px-1.5 py-0.5 rounded bg-cyan-900/80 border border-cyan-600/50 text-xs font-mono">Espaço</kbd> ou o botão para retomar</span>
          <Mic className="w-4 h-4 text-cyan-500" />
        </div>
      )}
    </div>
  );
}
