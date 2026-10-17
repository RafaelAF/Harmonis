'use client';

import React from 'react';
import { Mic, MicOff, AlertCircle } from 'lucide-react';
import { PitchDetectionResult } from '@/types/music';

interface PitchGaugeProps {
  isListening: boolean;
  pitchResult: PitchDetectionResult | null;
  volume: number;
  a4Ref: number;
  onA4RefChange: (hz: number) => void;
  onToggleListening: () => void;
  error: string | null;
}

export function PitchGauge({
  isListening,
  pitchResult,
  volume,
  a4Ref,
  onA4RefChange,
  onToggleListening,
  error,
}: PitchGaugeProps) {
  // Cents clamped between -50 e +50
  const cents = pitchResult ? pitchResult.cents : 0;
  const inTune = pitchResult?.inTune ?? false;

  // Converte cents (-50 a +50) para porcentagem do ponteiro (0% a 100%)
  const needlePercent = Math.max(0, Math.min(100, ((cents + 50) / 100) * 100));

  let statusText = 'Aguardando som...';
  let statusColor = 'text-zinc-500 bg-zinc-900/60 border-zinc-800';

  if (!isListening) {
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

  return (
    <div className="bg-zinc-900/80 rounded-2xl border border-zinc-800 p-6 sm:p-8 flex flex-col items-center relative overflow-hidden backdrop-blur-sm shadow-xl">
      {/* Luz ambiente de fundo reativa quando afinado */}
      <div
        className={`absolute inset-0 pointer-events-none transition-opacity duration-300 blur-3xl opacity-20 ${
          inTune ? 'bg-emerald-500' : isListening && pitchResult ? 'bg-cyan-500' : 'bg-transparent'
        }`}
      />

      {/* Top Bar: A4 Calibration & Status */}
      <div className="w-full flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-zinc-800/80">
        <div className="flex items-center gap-2">
          <div
            className={`w-2.5 h-2.5 rounded-full transition-all ${
              isListening
                ? inTune
                  ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]'
                  : 'bg-cyan-400 animate-pulse'
                : 'bg-zinc-600'
            }`}
          />
          <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
            {isListening ? 'Captação Ativa' : 'Afinador em Espera'}
          </span>
        </div>

        {/* Calibração de Referência A4 (padrão 440Hz, 432Hz a 446Hz) */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-zinc-400">Ref. A4:</span>
          <div className="flex items-center bg-zinc-950 rounded-lg border border-zinc-800 p-0.5">
            {[432, 440, 442].map((hz) => (
              <button
                key={hz}
                onClick={() => onA4RefChange(hz)}
                className={`px-2.5 py-1 rounded-md font-mono text-xs transition-colors ${
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

      {/* Banner de Erro de Microfone se houver */}
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
              inTune
                ? 'text-emerald-400 drop-shadow-[0_0_35px_rgba(52,211,153,0.4)]'
                : pitchResult
                ? 'text-zinc-100'
                : 'text-zinc-700'
            }`}
          >
            {pitchResult ? pitchResult.note : '--'}
          </span>
          {pitchResult && (
            <span className="text-3xl sm:text-4xl font-bold text-zinc-500 ml-1 font-mono">
              {pitchResult.octave}
            </span>
          )}
        </div>

        {/* Frequência em Hz */}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-sm font-mono text-zinc-400">
            {pitchResult ? `${pitchResult.frequency.toFixed(1)} Hz` : '0.0 Hz'}
          </span>
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${statusColor}`}
          >
            {statusText}
          </span>
        </div>
      </div>

      {/* Medidor Analógico de Cents (-50 a +50) */}
      <div className="w-full max-w-lg mt-2 mb-6">
        {/* Marcadores de escala */}
        <div className="flex justify-between text-[11px] font-mono text-zinc-500 px-1 mb-1.5">
          <span>-50</span>
          <span>-25</span>
          <span className="text-emerald-400 font-bold">0</span>
          <span>+25</span>
          <span>+50</span>
        </div>

        {/* Trilho de medição */}
        <div className="relative h-6 bg-zinc-950 rounded-xl border border-zinc-800 p-1 flex items-center overflow-hidden">
          {/* Zona central de afinação (±5 cents) */}
          <div className="absolute left-[45%] right-[45%] top-0 bottom-0 bg-emerald-500/20 border-x border-emerald-500/40" />

          {/* Marcador central */}
          <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-0.5 bg-emerald-400/80 z-10" />

          {/* Ponteiro dinâmico */}
          {isListening && pitchResult && (
            <div
              className="absolute top-1 bottom-1 w-2 rounded-full transition-all duration-75 -translate-x-1/2 z-20 shadow-md"
              style={{
                left: `${needlePercent}%`,
                backgroundColor: inTune
                  ? '#34d399'
                  : cents < 0
                  ? '#fbbf24'
                  : '#fb7185',
                boxShadow: inTune
                  ? '0 0 10px #34d399'
                  : cents < 0
                  ? '0 0 8px #fbbf24'
                  : '0 0 8px #fb7185',
              }}
            />
          )}
        </div>

        {/* Indicador de desvio numérico */}
        <div className="flex justify-between items-center text-xs text-zinc-500 mt-2 px-1">
          <span className="text-amber-400/80">♭ Bemol</span>
          <span className="font-mono text-zinc-400">
            {pitchResult ? (
              cents === 0 ? (
                '0 cents'
              ) : cents > 0 ? (
                `+${cents} cents`
              ) : (
                `${cents} cents`
              )
            ) : (
              '-- cents'
            )}
          </span>
          <span className="text-rose-400/80">♯ Sustenido</span>
        </div>
      </div>

      {/* Barra de volume de entrada (VU meter) */}
      <div className="w-full max-w-lg mb-6 flex items-center gap-3">
        <span className="text-xs text-zinc-500 shrink-0 font-medium">Sinal:</span>
        <div className="flex-1 h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-rose-500 transition-all duration-75"
            style={{ width: `${Math.min(100, volume * 100)}%` }}
          />
        </div>
      </div>

      {/* Botão de Controle Principal (Iniciar / Parar Microfone) */}
      <button
        onClick={onToggleListening}
        className={`flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl font-semibold text-sm transition-all shadow-lg active:scale-95 ${
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
    </div>
  );
}
