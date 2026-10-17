'use client';

import React, { useState } from 'react';
import { useTuner } from '@/hooks/useTuner';
import { PitchGauge } from './PitchGauge';
import { HarmonicFieldVisualizer } from './HarmonicFieldVisualizer';
import { NoteName, ScaleMode } from '@/types/music';

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
  } = useTuner({ initialA4Ref: 440 });

  const [selectedTonic, setSelectedTonic] = useState<NoteName>('C');
  const [selectedMode, setSelectedMode] = useState<ScaleMode>('major');

  const handleToggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

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
      />

      {/* 2. Campo Harmônico Dinâmico Integrado com Destaque de Nota */}
      <HarmonicFieldVisualizer
        detectedPitch={pitchResult}
        selectedTonic={selectedTonic}
        selectedMode={selectedMode}
        onTonicChange={setSelectedTonic}
        onModeChange={setSelectedMode}
        a4Ref={a4Ref}
      />
    </div>
  );
}
