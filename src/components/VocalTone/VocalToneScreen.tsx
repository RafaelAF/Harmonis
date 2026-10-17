'use client';

import React, { useState, useMemo } from 'react';
import { useToneGenerator } from '@/hooks/useToneGenerator';
import { NoteName, ScaleMode, WaveformType } from '@/types/music';
import {
  NOTES,
  SCALE_MODE_LABELS,
  generateHarmonicField,
  classifyVocalRange,
} from '@/lib/musicTheory';
import {
  Volume2,
  Play,
  Square,
  AudioWaveform as WaveformIcon,
  Sparkles,
  Music,
} from 'lucide-react';
import { playChordArpeggio } from '@/lib/audioSynth';
import { useAudioContext } from '@/hooks/useAudioContext';

const OCTAVES = [2, 3, 4, 5, 6];

export function VocalToneScreen() {
  const {
    isPlaying,
    currentNote,
    currentOctave,
    frequency,
    waveform,
    volume,
    isSustainMode,
    setNote,
    setOctave,
    setWaveform,
    setVolume,
    setIsSustainMode,
    toggleSustain,
    handlePressStart,
    handlePressEnd,
  } = useToneGenerator({
    initialNote: 'C',
    initialOctave: 4,
    initialWaveform: 'sine',
  });

  const [selectedMode, setSelectedMode] = useState<ScaleMode>('major');
  const { resumeContext } = useAudioContext();

  // Campo harmônico integrado na tonalidade selecionada
  const harmonicField = useMemo(() => {
    return generateHarmonicField(currentNote, selectedMode);
  }, [currentNote, selectedMode]);

  // Classificação vocal em tempo real para a frequência atual
  const vocalRanges = useMemo(() => {
    return classifyVocalRange(frequency);
  }, [frequency]);

  const handlePlayChord = async (notes: NoteName[]) => {
    const ctx = await resumeContext();
    if (ctx) {
      playChordArpeggio(ctx, notes, currentOctave, 440);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Painel Principal do Gerador de Tom Vocal */}
      <div className="bg-zinc-900/80 rounded-2xl border border-zinc-800 p-6 sm:p-8 backdrop-blur-sm shadow-xl flex flex-col items-center relative overflow-hidden">
        {/* Glow de fundo reativo ao som ativo */}
        <div
          className={`absolute inset-0 pointer-events-none transition-opacity duration-300 blur-3xl opacity-20 ${
            isPlaying ? 'bg-cyan-500' : 'bg-transparent'
          }`}
        />

        {/* Top Bar: Forma de Onda & Modo de Execução */}
        <div className="w-full flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-zinc-800/80">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-400">Modo de Tocar:</span>
            <div className="flex bg-zinc-950 rounded-xl border border-zinc-800 p-0.5">
              <button
                onClick={() => setIsSustainMode(true)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isSustainMode
                    ? 'bg-zinc-800 text-emerald-400 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Sustain (Contínuo)
              </button>
              <button
                onClick={() => setIsSustainMode(false)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  !isSustainMode
                    ? 'bg-zinc-800 text-cyan-400 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Segure para Tocar
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <WaveformIcon className="w-4 h-4 text-zinc-400" />
            <span className="text-xs font-medium text-zinc-400">Onda:</span>
            <div className="flex bg-zinc-950 rounded-xl border border-zinc-800 p-0.5">
              {(['sine', 'triangle'] as WaveformType[]).map((wf) => (
                <button
                  key={wf}
                  onClick={() => setWaveform(wf)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                    waveform === wf
                      ? 'bg-zinc-800 text-cyan-400 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {wf === 'sine' ? 'Senoidal (Pura)' : 'Triangular'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Display Central da Nota e Frequência */}
        <div className="flex flex-col items-center justify-center my-6">
          <div className="flex items-baseline justify-center">
            <span
              className={`text-8xl sm:text-9xl font-black tracking-tight font-mono transition-colors duration-150 ${
                isPlaying
                  ? 'text-cyan-400 drop-shadow-[0_0_35px_rgba(34,211,238,0.4)]'
                  : 'text-zinc-100'
              }`}
            >
              {currentNote}
            </span>
            <span className="text-3xl sm:text-4xl font-bold text-zinc-500 ml-1 font-mono">
              {currentOctave}
            </span>
          </div>

          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm font-mono text-zinc-400">
              {frequency.toFixed(1)} Hz
            </span>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${
                isPlaying
                  ? 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30'
                  : 'text-zinc-500 bg-zinc-900 border-zinc-800'
              }`}
            >
              {isPlaying ? 'Emitindo Tom de Referência' : 'Tom Silenciado'}
            </span>
          </div>

          {/* Tessituras Vocais Compatíveis */}
          <div className="mt-4 flex flex-wrap justify-center gap-1.5">
            {vocalRanges.length > 0 ? (
              vocalRanges.map((vr) => (
                <span
                  key={vr.voiceType}
                  className={`text-[11px] px-2.5 py-0.5 rounded-full border font-medium ${vr.color}`}
                >
                  {vr.voiceType} ({vr.gender})
                </span>
              ))
            ) : (
              <span className="text-xs text-zinc-500">
                Faixa extrema (fora dos naipes vocais convencionais)
              </span>
            )}
          </div>
        </div>

        {/* Teclado Seletor de Notas (C a B) */}
        <div className="w-full max-w-xl mb-6">
          <div className="text-xs font-medium text-zinc-400 mb-2 text-center">
            Selecione a Nota:
          </div>
          <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
            {NOTES.map((note) => {
              const isSelected = currentNote === note;
              const isAccidental = note.includes('#');

              return (
                <button
                  key={note}
                  onClick={() => setNote(note)}
                  className={`py-3 rounded-xl font-mono text-xs font-bold transition-all active:scale-95 ${
                    isSelected
                      ? 'bg-cyan-500 text-zinc-950 shadow-md shadow-cyan-500/20 scale-105'
                      : isAccidental
                      ? 'bg-zinc-950 text-zinc-300 hover:bg-zinc-800 border border-zinc-800/80'
                      : 'bg-zinc-800/80 text-white hover:bg-zinc-700 border border-zinc-700/60'
                  }`}
                >
                  {note}
                </button>
              );
            })}
          </div>
        </div>

        {/* Seletor de Oitavas (2 a 6) */}
        <div className="w-full max-w-md mb-6">
          <div className="text-xs font-medium text-zinc-400 mb-2 text-center">
            Oitava (Tessitura Vocal):
          </div>
          <div className="grid grid-cols-5 gap-2">
            {OCTAVES.map((oct) => (
              <button
                key={oct}
                onClick={() => setOctave(oct)}
                className={`py-2 rounded-xl font-mono text-xs font-bold transition-all ${
                  currentOctave === oct
                    ? 'bg-zinc-800 text-cyan-400 border border-cyan-500/40 shadow-sm'
                    : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                Oitava {oct}
              </button>
            ))}
          </div>
        </div>

        {/* Volume do Tom */}
        <div className="w-full max-w-xs flex items-center gap-3 mb-6">
          <Volume2 className="w-4 h-4 text-zinc-500 shrink-0" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="flex-1 h-1.5 bg-zinc-950 rounded-lg appearance-none cursor-pointer accent-cyan-500 border border-zinc-800"
          />
          <span className="text-xs font-mono text-zinc-400 w-8 text-right">
            {Math.round(volume * 100)}%
          </span>
        </div>

        {/* Botão de Controle Sonoro */}
        {isSustainMode ? (
          <button
            onClick={toggleSustain}
            className={`flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl font-semibold text-sm transition-all shadow-lg active:scale-95 ${
              isPlaying
                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 shadow-rose-500/10'
                : 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-zinc-950 hover:opacity-95 shadow-cyan-500/20'
            }`}
          >
            {isPlaying ? (
              <>
                <Square className="w-4 h-4 fill-current" />
                <span>Interromper Tom</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Emitir Tom Contínuo</span>
              </>
            )}
          </button>
        ) : (
          <button
            onMouseDown={() => handlePressStart()}
            onMouseUp={handlePressEnd}
            onTouchStart={() => handlePressStart()}
            onTouchEnd={handlePressEnd}
            className="flex items-center justify-center gap-2.5 px-10 py-4 rounded-2xl font-bold text-sm bg-gradient-to-r from-cyan-500 to-emerald-500 text-zinc-950 hover:opacity-95 shadow-cyan-500/20 transition-all select-none active:scale-95"
          >
            <Music className="w-4 h-4" />
            <span>Pressione e Segure para Tocar</span>
          </button>
        )}
      </div>

      {/* 2. Campo Harmônico Integrado na Sessão Vocal (AGENTS.md #3.3) */}
      <div className="bg-zinc-900/60 rounded-2xl border border-zinc-800 p-6 sm:p-8 backdrop-blur-sm shadow-xl flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800/80">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white tracking-tight">
                Campo Harmônico para Treino Vocal
              </h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Tonalidade: {currentNote}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Clique em qualquer acorde para emitir o arpejo de referência e treinar sua afinação relativa.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-400">Modo:</span>
            <select
              value={selectedMode}
              onChange={(e) => setSelectedMode(e.target.value as ScaleMode)}
              className="bg-zinc-950 border border-zinc-800 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer"
            >
              {(Object.keys(SCALE_MODE_LABELS) as ScaleMode[]).map((m) => (
                <option key={m} value={m}>
                  {SCALE_MODE_LABELS[m]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Grid de Graus para Aquecimento e Treino */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          {harmonicField.degrees.map((degree) => (
            <div
              key={degree.degreeNumber}
              onClick={() => handlePlayChord(degree.tetradNotes)}
              className="group bg-zinc-950/60 border border-zinc-800/80 hover:border-cyan-500/50 hover:bg-zinc-900/60 rounded-xl p-4 transition-all duration-200 cursor-pointer flex flex-col justify-between"
            >
              <div className="flex items-center justify-between gap-1 mb-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300">
                  {degree.roman}
                </span>
                <span className="text-[10px] text-zinc-500">
                  {degree.functionLabel}
                </span>
              </div>

              <div className="my-2">
                <div className="text-2xl font-black font-mono text-zinc-100 group-hover:text-cyan-300 transition-colors">
                  {degree.tetradSymbol}
                </div>
                <div className="text-xs text-zinc-500 font-mono">
                  {degree.triadSymbol}
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-500 group-hover:text-zinc-300">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  Ouvir acorde
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
