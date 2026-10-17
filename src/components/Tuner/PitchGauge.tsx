'use client';

import React from 'react';
import { Mic, MicOff, AlertCircle, Snowflake, Play, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { PitchDetectionResult } from '@/types/music';

interface PitchGaugeProps {
  isListening: boolean;
  pitchResult: PitchDetectionResult | null;
  volume: number;
  a4Ref: number;
  onA4RefChange: (hz: number) => void;
  onToggleListening: () => void;
  error: string | null;
  // Freeze Mode
  isFrozen: boolean;
  frozenResult: PitchDetectionResult | null;
  frozenCentsOffset: number;
  onFreeze: () => void;
  onPlayFrozenNote: () => void;
  onAdjustFrozenCents: (delta: number) => void;
}

export function PitchGauge({
  isListening,
  pitchResult,
  volume,
  a4Ref,
  onA4RefChange,
  onToggleListening,
  error,
  isFrozen,
  frozenResult,
  frozenCentsOffset,
  onFreeze,
  onPlayFrozenNote,
  onAdjustFrozenCents,
}: PitchGaugeProps) {
  // Em modo congelado, usa o resultado frozen; caso contrário usa o em tempo real
  const displayResult = isFrozen ? frozenResult : pitchResult;

  // Cents exibidos: nota congelada + offset manual
  const rawCents = isFrozen
    ? (frozenResult ? frozenResult.cents + frozenCentsOffset : 0)
    : (pitchResult ? pitchResult.cents : 0);
  const cents = Math.max(-50, Math.min(50, rawCents));
  const inTune = displayResult ? Math.abs(cents) <= 5 : false;

  // Converte cents (-50 a +50) para porcentagem do ponteiro (0% a 100%)
  const needlePercent = Math.max(0, Math.min(100, ((cents + 50) / 100) * 100));

  let statusText = 'Aguardando som...';
  let statusColor = 'text-zinc-500 bg-zinc-900/60 border-zinc-800';

  if (isFrozen) {
    statusText = '❄ Nota Congelada';
    statusColor = 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
  } else if (!isListening) {
    statusText = 'Afinador desligado';
    statusColor = 'text-zinc-500 bg-zinc-900 border-zinc-800';
  } else if (pitchResult) {
    if (inTune) {
      statusText = 'Perfeito (Afinado)';
      statusColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    } else if (cents < 0) {
      statusText = `Abaixo (${cents} cents)`;
      statusColor = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    } else {
      statusText = `Acima (+${cents} cents)`;
      statusColor = 'text-rose-400 bg-rose-500/10 border-rose-500/30';
    }
  }

  const displayNote = displayResult ? displayResult.note : '--';
  const displayOctave = displayResult ? displayResult.octave : null;
  const displayFrequency = displayResult
    ? displayResult.frequency * Math.pow(2, frozenCentsOffset / 1200)
    : null;

  return (
    <div className={`bg-zinc-900/80 rounded-2xl border p-6 sm:p-8 flex flex-col items-center relative overflow-hidden backdrop-blur-sm shadow-xl transition-all duration-300 ${isFrozen ? 'border-cyan-500/40 shadow-cyan-500/10' : 'border-zinc-800'}`}>
      {/* Luz ambiente de fundo reativa */}
      <div
        className={`absolute inset-0 pointer-events-none transition-opacity duration-300 blur-3xl opacity-20 ${
          isFrozen ? 'bg-cyan-400' : inTune ? 'bg-emerald-500' : isListening && pitchResult ? 'bg-cyan-500' : 'bg-transparent'
        }`}
      />

      {/* Top Bar: A4 Calibration & Status */}
      <div className="w-full flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-zinc-800/80">
        <div className="flex items-center gap-2">
          <div
            className={`w-2.5 h-2.5 rounded-full transition-all ${
              isFrozen
                ? 'bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)]'
                : isListening
                ? inTune
                  ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]'
                  : 'bg-cyan-400 animate-pulse'
                : 'bg-zinc-600'
            }`}
          />
          <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
            {isFrozen ? '❄ Modo Congelado' : isListening ? 'Captação Ativa' : 'Afinador em Espera'}
          </span>
        </div>

        {/* Calibração de Referência A4 */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-zinc-400">Ref. A4:</span>
          <div className="flex items-center bg-zinc-950 rounded-lg border border-zinc-800 p-0.5">
            {[432, 440, 442].map((hz) => (
              <button
                key={hz}
                onClick={() => onA4RefChange(hz)}
                disabled={isFrozen}
                className={`px-2.5 py-1 rounded-md font-mono text-xs transition-colors disabled:opacity-50 ${
                  a4Ref === hz
                    ? 'bg-zinc-800 text-emerald-400 font-semibold shadow'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {hz}Hz
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Banner de Erro de Microfone */}
      {error && (
        <div className="w-full mt-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Visor Central de Nota e Frequência */}
      <div className="flex flex-col items-center justify-center my-6">
        <div className="relative flex items-baseline justify-center">
          <span
            className={`text-8xl sm:text-9xl font-black tracking-tight font-mono transition-colors duration-150 ${
              isFrozen
                ? 'text-cyan-300 drop-shadow-[0_0_35px_rgba(34,211,238,0.3)]'
                : inTune
                ? 'text-emerald-400 drop-shadow-[0_0_35px_rgba(52,211,153,0.4)]'
                : displayResult
                ? 'text-zinc-100'
                : 'text-zinc-700'
            }`}
          >
            {displayNote}
          </span>
          {displayOctave !== null && (
            <span className="text-3xl sm:text-4xl font-bold text-zinc-500 ml-1 font-mono">
              {displayOctave}
            </span>
          )}
          {isFrozen && (
            <span className="absolute -top-3 -right-5 text-cyan-400 animate-pulse">
              <Snowflake className="w-5 h-5" />
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 mt-2">
          <span className="text-sm font-mono text-zinc-400">
            {displayFrequency ? `${displayFrequency.toFixed(1)} Hz` : '0.0 Hz'}
          </span>
          <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${statusColor}`}>
            {statusText}
          </span>
        </div>

        {/* Desvio de cents manual quando congelado */}
        {isFrozen && frozenCentsOffset !== 0 && (
          <span className="mt-1 text-xs font-mono text-cyan-400/80">
            Ajuste manual: {frozenCentsOffset > 0 ? '+' : ''}{frozenCentsOffset} cents
          </span>
        )}
      </div>

      {/* Medidor Analógico de Cents (-50 a +50) */}
      <div className="w-full max-w-lg mt-2 mb-4">
        <div className="flex justify-between text-[11px] font-mono text-zinc-500 px-1 mb-1.5">
          <span>-50</span>
          <span>-25</span>
          <span className="text-emerald-400 font-bold">0</span>
          <span>+25</span>
          <span>+50</span>
        </div>

        <div className="relative h-6 bg-zinc-950 rounded-xl border border-zinc-800 p-1 flex items-center overflow-hidden">
          <div className="absolute left-[45%] right-[45%] top-0 bottom-0 bg-emerald-500/20 border-x border-emerald-500/40" />
          <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-0.5 bg-emerald-400/80 z-10" />

          {(isListening || isFrozen) && displayResult && (
            <div
              className="absolute top-1 bottom-1 w-2 rounded-full transition-all duration-75 -translate-x-1/2 z-20 shadow-md"
              style={{
                left: `${needlePercent}%`,
                backgroundColor: inTune ? '#34d399' : cents < 0 ? '#fbbf24' : '#fb7185',
                boxShadow: inTune
                  ? '0 0 10px #34d399'
                  : cents < 0
                  ? '0 0 8px #fbbf24'
                  : '0 0 8px #fb7185',
              }}
            />
          )}
        </div>

        <div className="flex justify-between items-center text-xs text-zinc-500 mt-2 px-1">
          <span className="text-amber-400/80">♭ Bemol</span>
          <span className="font-mono text-zinc-400">
            {displayResult
              ? cents === 0 ? '0 cents' : cents > 0 ? `+${cents} cents` : `${cents} cents`
              : '-- cents'}
          </span>
          <span className="text-rose-400/80">♯ Sustenido</span>
        </div>
      </div>

      {/* Barra de volume (VU meter) */}
      {!isFrozen && (
        <div className="w-full max-w-lg mb-4 flex items-center gap-3">
          <span className="text-xs text-zinc-500 shrink-0 font-medium">Sinal:</span>
          <div className="flex-1 h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-rose-500 transition-all duration-75"
              style={{ width: `${Math.min(100, volume * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Controles de Freeze Mode (visíveis quando congelado) */}
      {isFrozen && frozenResult && (
        <div className="w-full max-w-lg mb-4 p-4 rounded-xl bg-cyan-950/40 border border-cyan-500/20 flex flex-col gap-3">
          <div className="text-xs text-cyan-400 font-medium flex items-center gap-1.5">
            <Snowflake className="w-3.5 h-3.5" />
            Controles da Nota Congelada — {frozenResult.scientificNotation}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Ouvir nota congelada */}
            <button
              onClick={onPlayFrozenNote}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-semibold hover:bg-cyan-500/25 active:scale-95 transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Ouvir Nota
            </button>

            {/* Ajuste fino ±10 cents */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => onAdjustFrozenCents(-10)}
                className="flex items-center gap-0.5 px-2.5 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-amber-400 text-xs font-bold hover:bg-zinc-700 active:scale-95 transition-all"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                −10 cents
              </button>
              <button
                onClick={() => onAdjustFrozenCents(10)}
                className="flex items-center gap-0.5 px-2.5 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-rose-400 text-xs font-bold hover:bg-zinc-700 active:scale-95 transition-all"
              >
                +10 cents
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              {frozenCentsOffset !== 0 && (
                <button
                  onClick={() => onAdjustFrozenCents(-frozenCentsOffset)}
                  className="flex items-center gap-0.5 px-2 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 text-xs hover:bg-zinc-700 active:scale-95 transition-all"
                  title="Resetar ajuste"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Botões de Controle: Microfone + Congelar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Botão Microfone */}
        <button
          onClick={onToggleListening}
          disabled={isFrozen}
          className={`flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl font-semibold text-sm transition-all shadow-lg active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
            isListening
              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 shadow-rose-500/10'
              : 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-zinc-950 hover:opacity-95 shadow-emerald-500/20'
          }`}
        >
          {isListening ? (
            <>
              <MicOff className="w-4 h-4" />
              <span>Pausar Afinador</span>
            </>
          ) : (
            <>
              <Mic className="w-4 h-4" />
              <span>Ativar Microfone & Afinar</span>
            </>
          )}
        </button>

        {/* Botão Congelar */}
        <button
          onClick={onFreeze}
          disabled={!isFrozen && !pitchResult}
          className={`flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-semibold text-sm transition-all shadow-lg active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed ${
            isFrozen
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 shadow-cyan-500/10'
              : 'bg-zinc-800/80 text-zinc-300 border border-zinc-700 hover:bg-zinc-700 hover:text-white'
          }`}
          title="Congelar / Descongelar (Espaço)"
        >
          <Snowflake className={`w-4 h-4 ${isFrozen ? 'animate-pulse' : ''}`} />
          <span>{isFrozen ? 'Descongelar' : 'Congelar'}</span>
          <kbd className="ml-1 text-[10px] opacity-50 px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-700 font-mono">Spc</kbd>
        </button>
      </div>
    </div>
  );
}
