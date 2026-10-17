'use client';

import React, { useMemo } from 'react';
import {
  NoteName,
  ScaleMode,
  PitchDetectionResult,
} from '@/types/music';
import {
  NOTES,
  SCALE_MODE_LABELS,
  generateHarmonicField,
  mapNoteToHarmonicField,
} from '@/lib/musicTheory';
import { Volume2 } from 'lucide-react';
import { playChordArpeggio } from '@/lib/audioSynth';
import { useAudioContext } from '@/hooks/useAudioContext';

interface HarmonicFieldVisualizerProps {
  detectedPitch: PitchDetectionResult | null;
  selectedTonic: NoteName;
  selectedMode: ScaleMode;
  onTonicChange: (tonic: NoteName) => void;
  onModeChange: (mode: ScaleMode) => void;
  a4Ref: number;
}

export function HarmonicFieldVisualizer({
  detectedPitch,
  selectedTonic,
  selectedMode,
  onTonicChange,
  onModeChange,
  a4Ref,
}: HarmonicFieldVisualizerProps) {
  const { resumeContext } = useAudioContext();

  // Gera o campo harmônico dinâmico com base na tônica e modo
  const harmonicField = useMemo(() => {
    return generateHarmonicField(selectedTonic, selectedMode);
  }, [selectedTonic, selectedMode]);

  // Mapeia a nota do microfone em tempo real para o campo harmônico
  const noteMatch = useMemo(() => {
    return mapNoteToHarmonicField(detectedPitch?.note ?? null, harmonicField);
  }, [detectedPitch, harmonicField]);

  // Toca o acorde sintetizado ao clicar no card
  const handlePlayChord = async (notes: NoteName[]) => {
    const ctx = await resumeContext();
    if (ctx) {
      playChordArpeggio(ctx, notes, 4, a4Ref);
    }
  };

  const getFunctionBadgeStyle = (func: string) => {
    switch (func) {
      case 'Tônica':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Subdominante':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'Dominante':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default:
        return 'bg-zinc-800 text-zinc-400 border-zinc-700';
    }
  };

  return (
    <div className="bg-zinc-900/60 rounded-2xl border border-zinc-800 p-6 sm:p-8 backdrop-blur-sm shadow-xl flex flex-col gap-6">
      {/* Cabeçalho do Módulo e Seletores */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white tracking-tight">
              Campo Harmônico Reativo
            </h2>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Integrado ao Afinador
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            As notas cantadas ou tocadas destacam instantaneamente seu respectivo grau e acordes.
          </p>
        </div>

        {/* Seletores de Tonalidade & Modo */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Seletor de Tônica */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-medium text-zinc-400">Tom:</label>
            <select
              value={selectedTonic}
              onChange={(e) => onTonicChange(e.target.value as NoteName)}
              className="bg-zinc-950 border border-zinc-800 text-white text-xs rounded-xl px-3 py-2 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              {NOTES.map((note) => (
                <option key={note} value={note}>
                  {note}
                </option>
              ))}
            </select>
          </div>

          {/* Seletor de Modo */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-medium text-zinc-400">Modo:</label>
            <select
              value={selectedMode}
              onChange={(e) => onModeChange(e.target.value as ScaleMode)}
              className="bg-zinc-950 border border-zinc-800 text-white text-xs rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              {(Object.keys(SCALE_MODE_LABELS) as ScaleMode[]).map((mode) => (
                <option key={mode} value={mode}>
                  {SCALE_MODE_LABELS[mode]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Status da Nota Captada no Campo Harmônico */}
      <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-400">Nota no Microfone:</span>
          {detectedPitch ? (
            <div className="flex items-center gap-2">
              <span className="text-base font-bold font-mono text-white px-2.5 py-0.5 rounded-lg bg-zinc-800 border border-zinc-700">
                {detectedPitch.scientificNotation}
              </span>
              {noteMatch.isInScale ? (
                <span className="text-xs font-medium text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30">
                  ✓ Pertence à escala de {harmonicField.tonic} {harmonicField.modeLabel}
                  {noteMatch.exactDegreeRoot && (
                    <span className="font-bold">
                      ({noteMatch.exactDegreeRoot.roman} grau)
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-xs font-medium text-amber-400 flex items-center gap-1 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/30">
                  Nota de passagem / Fora da escala (Cromatismo)
                </span>
              )}
            </div>
          ) : (
            <span className="text-xs text-zinc-500 italic">
              Nenhuma nota detectada no momento (toque ou cante para testar)
            </span>
          )}
        </div>

        {/* Resumo das notas da escala */}
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <span className="text-zinc-500">Escala:</span>
          <div className="flex gap-1 font-mono">
            {harmonicField.scaleNotes.map((note, idx) => (
              <span
                key={idx}
                className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                  detectedPitch?.note === note
                    ? 'bg-emerald-400 text-zinc-950 shadow-sm'
                    : 'bg-zinc-800/60 text-zinc-300'
                }`}
              >
                {note}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Grid com os 7 Graus Harmônicos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {harmonicField.degrees.map((degree) => {
          const isTonicMatch = detectedPitch?.note === degree.rootNote;
          const isMemberMatch = !isTonicMatch && degree.tetradNotes.includes(detectedPitch?.note as NoteName);

          return (
            <div
              key={degree.degreeNumber}
              onClick={() => handlePlayChord(degree.tetradNotes)}
              className={`group relative rounded-xl p-4 transition-all duration-200 cursor-pointer flex flex-col justify-between border ${
                isTonicMatch
                  ? 'bg-gradient-to-b from-emerald-950/60 to-zinc-900 border-emerald-400 ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-500/20 scale-[1.02]'
                  : isMemberMatch
                  ? 'bg-gradient-to-b from-cyan-950/40 to-zinc-900 border-cyan-500/50 ring-1 ring-cyan-500/20'
                  : 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/60'
              }`}
            >
              {/* Badge superior: Grau Romano & Função Harmônica */}
              <div className="flex items-center justify-between gap-1 mb-2">
                <span
                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${
                    isTonicMatch
                      ? 'bg-emerald-400 text-zinc-950'
                      : 'bg-zinc-800 text-zinc-300'
                  }`}
                >
                  {degree.roman}
                </span>

                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${getFunctionBadgeStyle(
                    degree.functionLabel
                  )}`}
                >
                  {degree.functionLabel}
                </span>
              </div>

              {/* Destaque da Cifra (Triádica & Tetrádica) */}
              <div className="my-2">
                <div className="flex items-baseline gap-1.5">
                  <span
                    className={`text-2xl font-black font-mono tracking-tight transition-colors ${
                      isTonicMatch
                        ? 'text-emerald-300'
                        : isMemberMatch
                        ? 'text-cyan-300'
                        : 'text-zinc-100 group-hover:text-emerald-400'
                    }`}
                  >
                    {degree.tetradSymbol}
                  </span>
                  <span className="text-xs text-zinc-500 font-mono">
                    ({degree.triadSymbol})
                  </span>
                </div>
              </div>

              {/* Notas formadoras do acorde */}
              <div className="mt-3 pt-3 border-t border-zinc-800/60">
                <div className="text-[10px] text-zinc-500 mb-1">Formação:</div>
                <div className="flex flex-wrap gap-1 font-mono text-[11px]">
                  {degree.tetradNotes.map((note, nIdx) => {
                    const isNoteActive = detectedPitch?.note === note;
                    return (
                      <span
                        key={nIdx}
                        className={`px-1.5 py-0.5 rounded font-semibold ${
                          isNoteActive
                            ? 'bg-emerald-400 text-zinc-950 shadow-sm'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {note}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Ação de ouvir o acorde */}
              <div className="mt-3 pt-2 flex items-center justify-between text-[11px] text-zinc-500 group-hover:text-zinc-300">
                <span className="flex items-center gap-1">
                  <Volume2 className="w-3.5 h-3.5 text-zinc-400 group-hover:text-emerald-400" />
                  Ouvir acorde
                </span>
                {isTonicMatch && (
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider animate-pulse">
                    Tônica!
                  </span>
                )}
                {isMemberMatch && (
                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                    No acorde
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
