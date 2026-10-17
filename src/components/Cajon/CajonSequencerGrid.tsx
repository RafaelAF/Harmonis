'use client';

import React, { useState, useMemo } from 'react';
import {
  CajonSoundType,
  StepCount,
  StepGrid,
  CajonSoundInfo,
  GroovePreset,
} from '@/types/sequencer';
import { GROOVE_PRESETS } from '@/lib/groovePresets';
import { Volume2, Trash2, Sparkles, Disc, Music } from 'lucide-react';

interface CajonSequencerGridProps {
  isPlaying: boolean;
  stepCount: StepCount;
  currentStep: number;
  grid: StepGrid;
  activePresetId: string | null;
  onToggleStep: (sound: CajonSoundType, stepIndex: number) => void;
  onStepCountChange: (count: StepCount) => void;
  onClearGrid: () => void;
  onLoadPreset: (preset: GroovePreset) => void;
  onAuditionSound: (sound: CajonSoundType) => void;
}

const SOUND_TRACKS: CajonSoundInfo[] = [
  {
    type: 'bass',
    label: 'Bass (Bumbo)',
    sublabel: 'Centro / Grave',
    color: 'border-amber-500/40 text-amber-400 bg-amber-500/10',
    activeColor: 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/40 border-amber-400',
  },
  {
    type: 'snare',
    label: 'Snare (Caixa)',
    sublabel: 'Borda / Estalo',
    color: 'border-cyan-500/40 text-cyan-400 bg-cyan-500/10',
    activeColor: 'bg-cyan-400 text-zinc-950 shadow-md shadow-cyan-500/40 border-cyan-300',
  },
  {
    type: 'ghost',
    label: 'Ghost Note',
    sublabel: 'Toque Leve',
    color: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10',
    activeColor: 'bg-emerald-400 text-zinc-950 shadow-md shadow-emerald-500/40 border-emerald-300',
  },
];

export function CajonSequencerGrid({
  isPlaying,
  stepCount,
  currentStep,
  grid,
  activePresetId,
  onToggleStep,
  onStepCountChange,
  onClearGrid,
  onLoadPreset,
  onAuditionSound,
}: CajonSequencerGridProps) {
  const [selectedGenre, setSelectedGenre] = useState<string>('Todos');

  // Gêneros disponíveis únicos
  const genres = useMemo(() => {
    const set = new Set(GROOVE_PRESETS.map((p) => p.genre));
    return ['Todos', ...Array.from(set)];
  }, []);

  // Presets filtrados pelo gênero selecionado
  const filteredPresets = useMemo(() => {
    if (selectedGenre === 'Todos') return GROOVE_PRESETS;
    return GROOVE_PRESETS.filter((p) => p.genre === selectedGenre);
  }, [selectedGenre]);

  const activePreset = useMemo(() => {
    return GROOVE_PRESETS.find((p) => p.id === activePresetId) || null;
  }, [activePresetId]);

  return (
    <div className="bg-zinc-900/80 rounded-2xl border border-zinc-800 p-5 sm:p-7 backdrop-blur-sm shadow-xl flex flex-col gap-6">
      {/* 1. Barra de Presets Rápidos e Filtros */}
      <div className="flex flex-col gap-4 pb-5 border-b border-zinc-800/80">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
              Ritmos Populares para Cajón ({GROOVE_PRESETS.length} Grooves)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">Passos:</span>
            <div className="flex bg-zinc-950 rounded-xl border border-zinc-800 p-0.5">
              {([8, 12, 16] as StepCount[]).map((count) => (
                <button
                  key={count}
                  onClick={() => onStepCountChange(count)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                    stepCount === count
                      ? 'bg-zinc-800 text-emerald-400 shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>

            <button
              onClick={onClearGrid}
              title="Limpar grid"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-rose-400 text-xs transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Limpar</span>
            </button>
          </div>
        </div>

        {/* Filtros de Categoria de Ritmo */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {genres.map((genre) => (
            <button
              key={genre}
              onClick={() => setSelectedGenre(genre)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                selectedGenre === genre
                  ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm'
                  : 'bg-zinc-950 text-zinc-500 hover:text-zinc-300 border border-zinc-900'
              }`}
            >
              {genre}
            </button>
          ))}
        </div>

        {/* Chips de Presets */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {filteredPresets.map((preset) => {
            const isSelected = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => onLoadPreset(preset)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all border ${
                  isSelected
                    ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300 shadow-sm shadow-emerald-500/10'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                }`}
              >
                <Disc
                  className={`w-3.5 h-3.5 ${
                    isSelected ? 'text-emerald-400 animate-spin' : 'text-zinc-600'
                  }`}
                  style={{ animationDuration: '4s' }}
                />
                <span className="font-semibold">{preset.name}</span>
                <span className="text-[10px] font-mono text-zinc-500 px-1 py-0.2 rounded bg-zinc-900 border border-zinc-800">
                  {preset.defaultBpm} BPM
                </span>
              </button>
            );
          })}
        </div>

        {/* Card Informativo do Ritmo Ativo */}
        {activePreset && (
          <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Music className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-zinc-300 leading-snug">
                <strong className="text-white">{activePreset.name}:</strong>{' '}
                {activePreset.description}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400 shrink-0">
              <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                {activePreset.timeSignature}
              </span>
              <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                {activePreset.stepCount} passos
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Grid Interativo do Step Sequencer */}
      <div className="overflow-x-auto pb-2 scrollbar-none">
        <div className="min-w-[620px] flex flex-col gap-2">
          {/* Cabeçalho dos Passos com Marcador de Playhead */}
          <div className="flex items-center gap-2 mb-1 pl-36 sm:pl-44 pr-1">
            {Array.from({ length: stepCount }).map((_, stepIdx) => {
              const isCurrent = isPlaying && currentStep === stepIdx;
              const isDownbeat = stepIdx % 4 === 0;

              return (
                <div
                  key={stepIdx}
                  className="flex-1 flex flex-col items-center justify-center transition-all duration-75"
                >
                  <div
                    className={`w-2 h-2 rounded-full mb-1 transition-all ${
                      isCurrent
                        ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,1)] scale-150'
                        : isDownbeat
                        ? 'bg-zinc-600'
                        : 'bg-zinc-800'
                    }`}
                  />
                  <span
                    className={`text-[10px] font-mono font-bold ${
                      isCurrent
                        ? 'text-emerald-400'
                        : isDownbeat
                        ? 'text-zinc-300'
                        : 'text-zinc-600'
                    }`}
                  >
                    {stepIdx + 1}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Linhas de Cada Instrumento do Cajón */}
          {SOUND_TRACKS.map((track) => (
            <div key={track.type} className="flex items-center gap-2">
              {/* Header da Pista com botão de audição */}
              <div
                onClick={() => onAuditionSound(track.type)}
                className={`w-36 sm:w-44 px-3 py-2.5 rounded-xl border flex items-center justify-between cursor-pointer group hover:brightness-110 transition-all select-none ${track.color}`}
                title="Clique para testar o som deste instrumento"
              >
                <div>
                  <div className="text-xs font-bold tracking-tight">{track.label}</div>
                  <div className="text-[10px] text-zinc-500 font-medium">
                    {track.sublabel}
                  </div>
                </div>
                <Volume2 className="w-4 h-4 opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all" />
              </div>

              {/* Botões dos Passos */}
              <div className="flex-1 flex items-center gap-1.5 sm:gap-2">
                {Array.from({ length: stepCount }).map((_, stepIdx) => {
                  const isActive = grid[track.type][stepIdx];
                  const isCurrent = isPlaying && currentStep === stepIdx;
                  const isBeatBoundary = stepIdx % 4 === 0 && stepIdx !== 0;

                  return (
                    <button
                      key={stepIdx}
                      onClick={() => onToggleStep(track.type, stepIdx)}
                      className={`flex-1 h-12 rounded-xl transition-all duration-75 flex items-center justify-center relative active:scale-90 ${
                        isBeatBoundary ? 'ml-1 sm:ml-1.5' : ''
                      } ${
                        isActive
                          ? track.activeColor
                          : 'bg-zinc-950 border border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/60'
                      } ${
                        isCurrent
                          ? 'ring-2 ring-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.6)] scale-[1.04]'
                          : ''
                      }`}
                    >
                      {isActive && (
                        <div className="w-2.5 h-2.5 rounded-full bg-zinc-950/80 shadow-inner" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
