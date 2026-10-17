'use client';

import React, { useState, useRef } from 'react';
import { useMetronome } from '@/hooks/useMetronome';
import { useCajonSequencer } from '@/hooks/useCajonSequencer';
import { CajonSequencerGrid } from '@/components/Cajon/CajonSequencerGrid';
import {
  Play,
  Pause,
  Volume2,
  Plus,
  Minus,
  Touchpad,
  Timer,
  Drum,
} from 'lucide-react';
import { TimeSignature, Subdivision } from '@/types/music';
import { GroovePreset } from '@/types/sequencer';

const TEMPO_MARKINGS: Array<{ maxBpm: number; label: string }> = [
  { maxBpm: 59, label: 'Largo' },
  { maxBpm: 75, label: 'Adagio' },
  { maxBpm: 107, label: 'Andante' },
  { maxBpm: 120, label: 'Moderato' },
  { maxBpm: 167, label: 'Allegro' },
  { maxBpm: 200, label: 'Presto' },
  { maxBpm: 280, label: 'Prestissimo' },
];

function getTempoLabel(bpm: number): string {
  const match = TEMPO_MARKINGS.find((m) => bpm <= m.maxBpm);
  return match ? match.label : 'Moderato';
}

const TIME_SIGNATURES: TimeSignature[] = ['2/4', '3/4', '4/4', '6/8'];

const SUBDIVISIONS: Array<{ value: Subdivision; label: string; icon: string }> = [
  { value: 1, label: 'Semínima', icon: '♩' },
  { value: 2, label: 'Colcheia', icon: '♪♪' },
  { value: 3, label: 'Tercina', icon: '3' },
  { value: 4, label: 'Semicolcheia', icon: '♬' },
];

interface MetronomeScreenProps {
  initialMode?: 'simple' | 'cajon';
}

export function MetronomeScreen({ initialMode = 'simple' }: MetronomeScreenProps) {
  const [mode, setMode] = useState<'simple' | 'cajon'>(initialMode);
  const [sharedBpm, setSharedBpm] = useState<number>(110);
  const [sharedVolume, setSharedVolume] = useState<number>(0.85);

  // 1. Motor do Metrônomo Tradicional
  const metronome = useMetronome({ initialBpm: sharedBpm });

  // 2. Motor do Sequenciador de Ritmos do Cajón
  const cajon = useCajonSequencer({ initialBpm: sharedBpm });

  // Sincroniza BPM compartilhado entre ambos os motores
  const updateBpm = (val: number | ((prev: number) => number)) => {
    const nextBpm = typeof val === 'function' ? val(sharedBpm) : val;
    const clamped = Math.max(30, Math.min(280, Math.round(nextBpm)));
    setSharedBpm(clamped);
    metronome.setBpm(clamped);
    cajon.setBpm(clamped);
  };

  const updateVolume = (vol: number) => {
    setSharedVolume(vol);
    metronome.setVolume(vol);
    cajon.setVolume(vol);
  };

  // Se trocar de modo enquanto estiver tocando, para o anterior para evitar sobreposição
  const handleModeSwitch = (newMode: 'simple' | 'cajon') => {
    if (newMode === mode) return;

    if (mode === 'simple' && metronome.isPlaying) {
      metronome.stop();
    } else if (mode === 'cajon' && cajon.isPlaying) {
      cajon.stop();
    }
    setMode(newMode);
  };

  // Controle de Play/Pause unificado dependendo do modo ativo
  const isCurrentPlaying = mode === 'simple' ? metronome.isPlaying : cajon.isPlaying;

  const handleTogglePlay = async () => {
    if (mode === 'simple') {
      await metronome.togglePlay();
    } else {
      await cajon.togglePlay();
    }
  };

  // Tap Tempo compartilhado com cálculo direto
  const tapTimesRef = useRef<number[]>([]);

  const handleTap = () => {
    const now = performance.now();
    const taps = tapTimesRef.current;

    if (taps.length > 0 && now - taps[taps.length - 1] > 2500) {
      tapTimesRef.current = [now];
      return;
    }

    taps.push(now);
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
      updateBpm(calculatedBpm);
    }
  };

  const handleLoadPreset = (preset: GroovePreset) => {
    cajon.loadPreset(preset);
    updateBpm(preset.defaultBpm);
  };

  const beatsCount =
    metronome.timeSignature === '2/4'
      ? 2
      : metronome.timeSignature === '3/4'
      ? 3
      : metronome.timeSignature === '4/4'
      ? 4
      : 6;

  const tempoLabel = getTempoLabel(sharedBpm);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Seletor de Modo: Metrônomo Simples vs Sequenciador de Cajón */}
      <div className="flex justify-center">
        <div className="inline-flex bg-zinc-900/90 border border-zinc-800 p-1 rounded-2xl shadow-lg">
          <button
            onClick={() => handleModeSwitch('simple')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              mode === 'simple'
                ? 'bg-zinc-800 text-white shadow-md border border-zinc-700/60'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Timer className={`w-4 h-4 ${mode === 'simple' ? 'text-emerald-400' : ''}`} />
            <span>Metrônomo Simples (Cliques)</span>
          </button>

          <button
            onClick={() => handleModeSwitch('cajon')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              mode === 'cajon'
                ? 'bg-zinc-800 text-white shadow-md border border-zinc-700/60'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Drum className={`w-4 h-4 ${mode === 'cajon' ? 'text-cyan-400' : ''}`} />
            <span>Sequenciador de Ritmo (Cajón)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              Novo
            </span>
          </button>
        </div>
      </div>

      {/* Painel Central de Transporte e BPM (Compartilhado) */}
      <div className="bg-zinc-900/80 rounded-2xl border border-zinc-800 p-6 sm:p-8 backdrop-blur-sm shadow-xl flex flex-col items-center relative overflow-hidden">
        {/* Glow de fundo reativo */}
        <div
          className={`absolute inset-0 pointer-events-none transition-opacity duration-150 blur-3xl opacity-20 ${
            isCurrentPlaying
              ? mode === 'simple' && metronome.currentBeat === 0
                ? 'bg-emerald-500'
                : mode === 'cajon' && cajon.currentStep % 4 === 0
                ? 'bg-cyan-500'
                : 'bg-transparent'
              : 'bg-transparent'
          }`}
        />

        {/* LED Pulse Visualizer quando no Modo Metrônomo Simples */}
        {mode === 'simple' && (
          <div className="w-full flex items-center justify-center gap-3 sm:gap-4 my-2">
            {Array.from({ length: beatsCount }).map((_, index) => {
              const isActive = metronome.isPlaying && metronome.currentBeat === index;
              const isAccent = index === 0;

              return (
                <div
                  key={index}
                  className="flex flex-col items-center gap-1.5 transition-transform duration-75"
                >
                  <div
                    className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center font-mono font-bold text-xs transition-all duration-75 border ${
                      isActive
                        ? isAccent
                          ? 'bg-emerald-400 text-zinc-950 border-emerald-300 shadow-[0_0_20px_rgba(52,211,153,0.8)] scale-110'
                          : 'bg-cyan-400 text-zinc-950 border-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.7)] scale-105'
                        : isAccent
                        ? 'bg-zinc-950 text-emerald-500/80 border-emerald-500/30'
                        : 'bg-zinc-950 text-zinc-600 border-zinc-800'
                    }`}
                  >
                    {index + 1}
                  </div>
                  {isAccent && (
                    <span className="text-[10px] font-semibold text-emerald-400/80 uppercase tracking-tighter">
                      Acento
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Mostrador Principal de BPM */}
        <div className="flex flex-col items-center justify-center my-4">
          <div className="flex items-baseline gap-2">
            <span className="text-7xl sm:text-8xl font-black font-mono tracking-tight text-white">
              {sharedBpm}
            </span>
            <span className="text-base font-semibold text-zinc-400 uppercase tracking-wider">
              BPM
            </span>
          </div>

          <span className="text-sm font-medium text-emerald-400 mt-1 px-3 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            {tempoLabel}
          </span>
        </div>

        {/* Controles de Ajuste de BPM (+ / - e Slider) */}
        <div className="w-full max-w-md space-y-4 mb-5">
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => updateBpm((prev) => prev - 5)}
              className="px-3 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-mono text-xs font-semibold transition-all active:scale-95"
            >
              -5
            </button>
            <button
              onClick={() => updateBpm((prev) => prev - 1)}
              className="p-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition-all active:scale-95"
            >
              <Minus className="w-4 h-4" />
            </button>

            <input
              type="range"
              min={30}
              max={280}
              value={sharedBpm}
              onChange={(e) => updateBpm(Number(e.target.value))}
              className="flex-1 h-2 bg-zinc-950 rounded-lg appearance-none cursor-pointer accent-emerald-500 border border-zinc-800"
            />

            <button
              onClick={() => updateBpm((prev) => prev + 1)}
              className="p-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => updateBpm((prev) => prev + 5)}
              className="px-3 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-mono text-xs font-semibold transition-all active:scale-95"
            >
              +5
            </button>
          </div>

          {/* Botão de Tap Tempo */}
          <div className="flex justify-center">
            <button
              onClick={handleTap}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800/80 border border-zinc-800 text-zinc-300 text-xs font-semibold transition-all active:scale-90 active:border-emerald-500"
            >
              <Touchpad className="w-4 h-4 text-emerald-400" />
              <span>Tap Tempo</span>
            </button>
          </div>
        </div>

        {/* Fórmulas de Compasso & Subdivisões (exibidas no Modo Simples) */}
        {mode === 'simple' && (
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-zinc-800/80 mb-6">
            <div>
              <label className="text-xs font-medium text-zinc-400 block mb-2">
                Fórmula de Compasso:
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {TIME_SIGNATURES.map((ts) => (
                  <button
                    key={ts}
                    onClick={() => metronome.setTimeSignature(ts)}
                    className={`py-2 rounded-xl text-xs font-mono font-bold transition-all ${
                      metronome.timeSignature === ts
                        ? 'bg-zinc-800 text-emerald-400 border border-emerald-500/40 shadow-sm'
                        : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                    }`}
                  >
                    {ts}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-400 block mb-2">
                Subdivisão:
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {SUBDIVISIONS.map((sub) => (
                  <button
                    key={sub.value}
                    onClick={() => metronome.setSubdivision(sub.value)}
                    title={sub.label}
                    className={`py-2 rounded-xl text-xs font-mono transition-all flex flex-col items-center justify-center ${
                      metronome.subdivision === sub.value
                        ? 'bg-zinc-800 text-cyan-400 border border-cyan-500/40 shadow-sm'
                        : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                    }`}
                  >
                    <span className="text-sm">{sub.icon}</span>
                    <span className="text-[9px] mt-0.5">{sub.label.slice(0, 3)}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Volume Compartilhado */}
        <div className="w-full max-w-xs flex items-center gap-3 mb-6">
          <Volume2 className="w-4 h-4 text-zinc-500 shrink-0" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={sharedVolume}
            onChange={(e) => updateVolume(Number(e.target.value))}
            className="flex-1 h-1.5 bg-zinc-950 rounded-lg appearance-none cursor-pointer accent-emerald-500 border border-zinc-800"
          />
          <span className="text-xs font-mono text-zinc-400 w-8 text-right">
            {Math.round(sharedVolume * 100)}%
          </span>
        </div>

        {/* Botão de Transporte (Iniciar / Pausar) */}
        <button
          onClick={handleTogglePlay}
          className={`flex items-center justify-center gap-3 px-10 py-4 rounded-2xl font-bold text-base transition-all shadow-xl active:scale-95 ${
            isCurrentPlaying
              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 shadow-rose-500/10'
              : mode === 'simple'
              ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-zinc-950 hover:opacity-95 shadow-emerald-500/20'
              : 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-zinc-950 hover:opacity-95 shadow-cyan-500/20'
          }`}
        >
          {isCurrentPlaying ? (
            <>
              <Pause className="w-5 h-5 fill-current" />
              <span>
                {mode === 'simple' ? 'Pausar Metrônomo' : 'Pausar Ritmo do Cajón'}
              </span>
            </>
          ) : (
            <>
              <Play className="w-5 h-5 fill-current" />
              <span>
                {mode === 'simple' ? 'Iniciar Metrônomo' : 'Iniciar Ritmo do Cajón'}
              </span>
            </>
          )}
        </button>
      </div>

      {/* Grid do Sequenciador de Ritmo para Cajón (quando no Modo Cajón) */}
      {mode === 'cajon' && (
        <CajonSequencerGrid
          isPlaying={cajon.isPlaying}
          stepCount={cajon.stepCount}
          currentStep={cajon.currentStep}
          grid={cajon.grid}
          activePresetId={cajon.activePresetId}
          onToggleStep={cajon.toggleStep}
          onStepCountChange={cajon.setStepCount}
          onClearGrid={cajon.clearGrid}
          onLoadPreset={handleLoadPreset}
          onAuditionSound={cajon.auditionSound}
        />
      )}
    </div>
  );
}
