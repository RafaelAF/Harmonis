'use client';

import React, { useState, useMemo } from 'react';
import { NoteName, ScaleMode } from '@/types/music';
import {
  NOTES,
  SCALE_MODE_LABELS,
  generateHarmonicField,
} from '@/lib/musicTheory';
import { Volume2, Music, Sparkles } from 'lucide-react';
import { playChordArpeggio, playTone } from '@/lib/audioSynth';
import { useAudioContext } from '@/hooks/useAudioContext';

export function DetailedHarmonicField() {
  const [tonic, setTonic] = useState<NoteName>('C');
  const [mode, setMode] = useState<ScaleMode>('major');
  const [a4Ref] = useState<number>(440);

  const { resumeContext } = useAudioContext();

  const harmonicField = useMemo(() => {
    return generateHarmonicField(tonic, mode);
  }, [tonic, mode]);

  const handlePlayChord = async (notes: NoteName[]) => {
    const ctx = await resumeContext();
    if (ctx) {
      playChordArpeggio(ctx, notes, 4, a4Ref);
    }
  };

  const handlePlayRoot = async (note: NoteName) => {
    const ctx = await resumeContext();
    if (ctx) {
      playTone(ctx, note, 4, 1.0, a4Ref);
    }
  };

  const getFunctionColor = (func: string) => {
    switch (func) {
      case 'Tônica':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'Subdominante':
        return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
      case 'Dominante':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      default:
        return 'text-zinc-400 bg-zinc-800 border-zinc-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Controles de Tonalidade & Modo */}
      <div className="bg-zinc-900/80 rounded-2xl border border-zinc-800 p-6 backdrop-blur-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              Explorador de Campo Harmônico
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Visualize graus, cifras, funções harmônicas e as notas formadoras de tríades e tétrades.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-zinc-400">Tônica:</span>
              <div className="flex gap-1 overflow-x-auto max-w-xs sm:max-w-none pb-1 scrollbar-none">
                {NOTES.map((note) => (
                  <button
                    key={note}
                    onClick={() => setTonic(note)}
                    className={`px-2.5 py-1.5 rounded-lg font-mono text-xs font-semibold transition-all ${
                      tonic === note
                        ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
                        : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
                    }`}
                  >
                    {note}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-zinc-400">Modo:</span>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as ScaleMode)}
                className="bg-zinc-950 border border-zinc-800 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                {(Object.keys(SCALE_MODE_LABELS) as ScaleMode[]).map((m) => (
                  <option key={m} value={m}>
                    {SCALE_MODE_LABELS[m]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Resumo da Tonalidade Ativa */}
        <div className="mt-6 pt-4 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-400">Escala de</span>
            <span className="text-lg font-bold text-emerald-400 font-mono">
              {harmonicField.tonic} {harmonicField.modeLabel}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-zinc-500">Notas:</span>
            <div className="flex gap-1.5 font-mono">
              {harmonicField.scaleNotes.map((note, idx) => (
                <button
                  key={idx}
                  onClick={() => handlePlayRoot(note)}
                  title={`Tocar nota ${note}`}
                  className="px-2.5 py-1 rounded-md text-xs font-semibold bg-zinc-800 hover:bg-emerald-500 hover:text-zinc-950 text-zinc-200 transition-colors flex items-center gap-1"
                >
                  <Music className="w-3 h-3 opacity-60" />
                  {note}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Grid de Acordes e Graus */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {harmonicField.degrees.map((degree) => (
          <div
            key={degree.degreeNumber}
            className="bg-zinc-900/70 border border-zinc-800/90 rounded-2xl p-5 hover:border-zinc-700 transition-all flex flex-col justify-between"
          >
            <div>
              {/* Header do Card */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold px-2 py-1 rounded-md bg-zinc-800 text-zinc-200">
                    Grau {degree.roman}
                  </span>
                  <span className="text-xs text-zinc-500">#{degree.degreeNumber}</span>
                </div>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${getFunctionColor(
                    degree.functionLabel
                  )}`}
                >
                  {degree.functionLabel}
                </span>
              </div>

              {/* Cifras */}
              <div className="my-4">
                <div className="text-3xl font-black font-mono text-white tracking-tight">
                  {degree.tetradSymbol}
                </div>
                <div className="text-xs text-zinc-400 font-mono mt-0.5">
                  Tríade: <span className="text-zinc-200 font-semibold">{degree.triadSymbol}</span>
                </div>
              </div>

              {/* Tabela de Notas Formadoras */}
              <div className="bg-zinc-950/60 rounded-xl p-3 border border-zinc-800/60 text-xs font-mono mb-4">
                <div className="grid grid-cols-4 gap-1 text-[10px] text-zinc-500 text-center mb-1">
                  <span>Tônica</span>
                  <span>3ª</span>
                  <span>5ª</span>
                  <span>7ª</span>
                </div>
                <div className="grid grid-cols-4 gap-1 text-center font-bold">
                  {degree.tetradNotes.map((note, nIdx) => (
                    <button
                      key={nIdx}
                      onClick={() => handlePlayRoot(note)}
                      className="py-1 rounded bg-zinc-900 text-zinc-300 hover:bg-emerald-500 hover:text-zinc-950 transition-colors"
                      title={`Tocar nota ${note}`}
                    >
                      {note}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Ação de Sintetizar o Acorde */}
            <button
              onClick={() => handlePlayChord(degree.tetradNotes)}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-zinc-800/70 hover:bg-zinc-700/80 text-zinc-200 text-xs font-semibold transition-all border border-zinc-700/50"
            >
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
              Ouvir Acorde Sintetizado
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
