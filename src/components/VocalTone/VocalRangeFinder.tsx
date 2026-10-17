'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { PitchDetectionResult, VocalRangeTestResult, NoteName } from '@/types/music';
import { calculateVocalRangeDiagnosis } from '@/lib/musicTheory';
import { detectPitch } from '@/lib/pitchDetection';
import { useAudioContext } from '@/hooks/useAudioContext';
import { playVocalGlissando, playTone } from '@/lib/audioSynth';
import {
  Mic, ChevronDown, ChevronUp, Play, RotateCcw,
  Music, Star, Sparkles, ArrowRight, Check, AlertCircle,
} from 'lucide-react';

type TestStep = 'idle' | 'step1_lowest' | 'step1_done' | 'step2_highest' | 'step2_done' | 'result';

const VOICE_BADGE_COLORS: Record<string, string> = {
  'Baixo': 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30',
  'Barítono': 'bg-blue-500/10 text-blue-300 border-blue-500/30',
  'Tenor': 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
  'Contralto': 'bg-rose-500/10 text-rose-300 border-rose-500/30',
  'Mezzo-Soprano': 'bg-pink-500/10 text-pink-300 border-pink-500/30',
  'Soprano': 'bg-purple-500/10 text-purple-300 border-purple-500/30',
};

const STEP_LABELS = {
  idle: { title: 'Descoberta de Tessitura Vocal', subtitle: 'Teste de extensão vocal interativo passo a passo' },
  step1_lowest: { title: 'Passo 1/2 — Nota Mais Grave', subtitle: 'Cante confortavelmente a nota mais grave que consegue emitir' },
  step1_done: { title: 'Nota Grave Capturada ✓', subtitle: 'Ótimo! Agora vamos capturar a sua nota mais aguda.' },
  step2_highest: { title: 'Passo 2/2 — Nota Mais Aguda', subtitle: 'Cante a nota mais aguda confortável (voz de peito/cabeça)' },
  step2_done: { title: 'Nota Aguda Capturada ✓', subtitle: 'Perfeito! Gerando seu diagnóstico vocal...' },
  result: { title: '🎤 Diagnóstico Vocal Completo', subtitle: 'Resultado da análise da sua tessitura' },
};

export function VocalRangeFinder() {
  const [step, setStep] = useState<TestStep>('idle');
  const [isListening, setIsListening] = useState(false);
  const [currentPitch, setCurrentPitch] = useState<PitchDetectionResult | null>(null);
  const [lowestCapture, setLowestCapture] = useState<PitchDetectionResult | null>(null);
  const [highestCapture, setHighestCapture] = useState<PitchDetectionResult | null>(null);
  const [result, setResult] = useState<VocalRangeTestResult | null>(null);
  const [volume, setVolume] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [captureCountdown, setCaptureCountdown] = useState(0);

  const { resumeContext } = useAudioContext();
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const bufferRef = useRef<Float32Array<ArrayBuffer> | null>(null);
  const bestPitchRef = useRef<PitchDetectionResult | null>(null);
  const captureTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopListeningInternal = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = null;
    if (captureTimerRef.current) clearTimeout(captureTimerRef.current);
    captureTimerRef.current = null;
    sourceRef.current?.disconnect();
    sourceRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setIsListening(false);
    setCurrentPitch(null);
    setVolume(0);
    setCaptureCountdown(0);
  }, []);

  useEffect(() => () => stopListeningInternal(), [stopListeningInternal]);

  const captureNote = useCallback((targetStep: 'step1_lowest' | 'step2_highest') => {
    // Best pitch captured during listening window
    const captured = bestPitchRef.current;
    stopListeningInternal();
    if (!captured) {
      setError('Nenhuma nota detectada. Tente novamente, cantando com mais clareza.');
      return;
    }
    setError(null);
    if (targetStep === 'step1_lowest') {
      setLowestCapture(captured);
      setStep('step1_done');
    } else {
      setHighestCapture(captured);
      setStep('step2_done');
      // Auto-generate result
      setTimeout(() => {
        if (lowestCapture) {
          const diag = calculateVocalRangeDiagnosis(lowestCapture, captured);
          setResult(diag);
          setStep('result');
        }
      }, 800);
    }
  }, [stopListeningInternal, lowestCapture]);

  const startListeningInternal = useCallback(async (targetStep: 'step1_lowest' | 'step2_highest', duration = 5) => {
    try {
      setError(null);
      bestPitchRef.current = null;
      const audioCtx = await resumeContext();
      if (!audioCtx) throw new Error('Falha ao inicializar AudioContext');
      audioContextRef.current = audioCtx;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, autoGainControl: false, noiseSuppression: false },
      });
      streamRef.current = stream;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceRef.current = source;

      const buffer = new Float32Array(analyser.fftSize);
      bufferRef.current = buffer;

      setIsListening(true);
      setCaptureCountdown(duration);

      // Countdown timer
      let remaining = duration;
      const tickTimer = () => {
        remaining -= 1;
        setCaptureCountdown(remaining);
        if (remaining > 0) {
          captureTimerRef.current = setTimeout(tickTimer, 1000);
        } else {
          captureNote(targetStep);
        }
      };
      captureTimerRef.current = setTimeout(tickTimer, 1000);

      // Audio analysis loop
      const analyze = () => {
        if (!analyserRef.current || !bufferRef.current || !audioContextRef.current) return;
        analyserRef.current.getFloatTimeDomainData(bufferRef.current);
        const detected = detectPitch(bufferRef.current, {
          sampleRate: audioContextRef.current.sampleRate,
          a4Ref: 440,
          minVolume: 0.015,
        });
        if (detected) {
          setCurrentPitch(detected);
          setVolume(detected.volume);
          // Store best pitch (loudest / most stable)
          if (!bestPitchRef.current || detected.volume > bestPitchRef.current.volume) {
            bestPitchRef.current = detected;
          }
        } else {
          setVolume((v) => Math.max(0, v * 0.85));
        }
        animFrameRef.current = requestAnimationFrame(analyze);
      };
      animFrameRef.current = requestAnimationFrame(analyze);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro de microfone';
      setError(
        msg.includes('Permission') || msg.includes('denied')
          ? 'Permissão de microfone negada. Por favor, autorize o navegador.'
          : `Erro: ${msg}`
      );
    }
  }, [resumeContext, captureNote]);

  const handleReset = () => {
    stopListeningInternal();
    setStep('idle');
    setLowestCapture(null);
    setHighestCapture(null);
    setResult(null);
    setError(null);
  };

  const handlePlayGlissando = async () => {
    if (!result) return;
    const ctx = await resumeContext();
    if (ctx) {
      playVocalGlissando(ctx, result.lowestPitch.frequency, result.highestPitch.frequency, 2.5);
    }
  };

  const handlePlayNote = async (note: NoteName, octave: number) => {
    const ctx = await resumeContext();
    if (ctx) playTone(ctx, note, octave, 1.0, 440);
  };

  const info = STEP_LABELS[step];

  return (
    <div className="bg-zinc-900/60 rounded-2xl border border-zinc-800 p-6 sm:p-8 backdrop-blur-sm shadow-xl flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white tracking-tight">{info.title}</h2>
            {step === 'result' && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Concluído
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 mt-1">{info.subtitle}</p>
        </div>
        {step !== 'idle' && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 border border-zinc-700 rounded-lg hover:text-zinc-200 hover:border-zinc-600 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reiniciar
          </button>
        )}
      </div>

      {/* Erro */}
      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* IDLE STATE */}
      {step === 'idle' && (
        <div className="flex flex-col items-center gap-6 py-6">
          {/* Steps overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
            {[
              { icon: ChevronDown, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', num: '1', label: 'Nota Mais Grave', desc: 'Cante sua nota mais grave confortável' },
              { icon: ChevronUp, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20', num: '2', label: 'Nota Mais Aguda', desc: 'Cante sua nota mais aguda confortável' },
              { icon: Star, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', num: '3', label: 'Diagnóstico', desc: 'Resultado com classificação e tons sugeridos' },
            ].map(({ icon: Icon, color, bg, num, label, desc }) => (
              <div key={num} className={`rounded-xl p-4 border ${bg} flex flex-col gap-2`}>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-md bg-zinc-900 ${color}`}>{num}</span>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <div className="text-sm font-semibold text-white">{label}</div>
                <div className="text-xs text-zinc-400">{desc}</div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setStep('step1_lowest')}
            className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 text-zinc-950 font-bold text-sm hover:opacity-95 active:scale-95 transition-all shadow-lg shadow-amber-500/20"
          >
            <Mic className="w-4 h-4" />
            Iniciar Teste de Tessitura
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* STEP 1 — LOWEST NOTE */}
      {(step === 'step1_lowest' || step === 'step1_done') && (
        <div className="flex flex-col items-center gap-5">
          <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-center max-w-lg">
            <ChevronDown className="w-8 h-8 text-amber-400 mx-auto mb-2" />
            <p className="text-sm text-zinc-300">
              Ative o microfone e cante sua <span className="font-semibold text-amber-300">nota mais grave confortável</span>.
              Sustente por alguns segundos. O sistema captura automaticamente após 5 segundos.
            </p>
          </div>

          {/* Live pitch display */}
          {isListening && (
            <div className="flex flex-col items-center gap-2">
              <div className="relative w-32 h-32 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-amber-500/10 border-2 border-amber-500/30 animate-pulse" />
                <span className="text-5xl font-black font-mono text-amber-300">
                  {currentPitch ? currentPitch.note : '—'}
                </span>
                {currentPitch && (
                  <span className="absolute bottom-3 text-sm font-bold text-amber-400/70 font-mono">
                    {currentPitch.octave}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">{currentPitch ? `${currentPitch.frequency.toFixed(1)} Hz` : 'Aguardando...'}</span>
              </div>
              {/* Countdown */}
              <div className="text-2xl font-black text-amber-400 font-mono">{captureCountdown}s</div>
              {/* VU Meter */}
              <div className="w-48 h-2 bg-zinc-950 rounded-full border border-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-75"
                  style={{ width: `${Math.min(100, volume * 100)}%` }}
                />
              </div>
            </div>
          )}

          {step === 'step1_done' && lowestCapture && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <Check className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <div className="text-sm font-bold text-amber-300">{lowestCapture.scientificNotation} capturado!</div>
                <div className="text-xs text-zinc-400">{lowestCapture.frequency.toFixed(1)} Hz</div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3 justify-center">
            {step === 'step1_lowest' && !isListening && (
              <button
                onClick={() => startListeningInternal('step1_lowest', 5)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold text-sm hover:bg-amber-500/25 active:scale-95 transition-all"
              >
                <Mic className="w-4 h-4" />
                Ativar Microfone — Cante a Nota Mais Grave
              </button>
            )}
            {isListening && (
              <button
                onClick={() => captureNote('step1_lowest')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm hover:bg-zinc-700 active:scale-95 transition-all"
              >
                <Check className="w-4 h-4" />
                Capturar Agora
              </button>
            )}
            {step === 'step1_done' && (
              <button
                onClick={() => { setStep('step2_highest'); setLowestCapture(lowestCapture); }}
                className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-zinc-950 font-bold text-sm hover:opacity-95 active:scale-95 transition-all"
              >
                Avançar para Nota Mais Aguda
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* STEP 2 — HIGHEST NOTE */}
      {(step === 'step2_highest' || step === 'step2_done') && (
        <div className="flex flex-col items-center gap-5">
          {/* Step 1 summary badge */}
          {lowestCapture && (
            <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300">
              <Check className="w-3.5 h-3.5" />
              Grave: <span className="font-bold font-mono">{lowestCapture.scientificNotation}</span>
              <span className="text-zinc-500">({lowestCapture.frequency.toFixed(0)} Hz)</span>
            </div>
          )}

          <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/20 text-center max-w-lg">
            <ChevronUp className="w-8 h-8 text-rose-400 mx-auto mb-2" />
            <p className="text-sm text-zinc-300">
              Agora cante sua <span className="font-semibold text-rose-300">nota mais aguda confortável</span>.
              Pode ser voz de peito ou cabeça — o que sair naturalmente sem forçar.
            </p>
          </div>

          {isListening && (
            <div className="flex flex-col items-center gap-2">
              <div className="relative w-32 h-32 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-rose-500/10 border-2 border-rose-500/30 animate-pulse" />
                <span className="text-5xl font-black font-mono text-rose-300">
                  {currentPitch ? currentPitch.note : '—'}
                </span>
                {currentPitch && (
                  <span className="absolute bottom-3 text-sm font-bold text-rose-400/70 font-mono">
                    {currentPitch.octave}
                  </span>
                )}
              </div>
              <div className="text-2xl font-black text-rose-400 font-mono">{captureCountdown}s</div>
              <div className="w-48 h-2 bg-zinc-950 rounded-full border border-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-rose-500 to-pink-300 transition-all duration-75"
                  style={{ width: `${Math.min(100, volume * 100)}%` }}
                />
              </div>
            </div>
          )}

          {step === 'step2_done' && highestCapture && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/30">
              <Check className="w-5 h-5 text-rose-400 shrink-0" />
              <div>
                <div className="text-sm font-bold text-rose-300">{highestCapture.scientificNotation} capturado!</div>
                <div className="text-xs text-zinc-400">{highestCapture.frequency.toFixed(1)} Hz</div>
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-center">
            {step === 'step2_highest' && !isListening && (
              <button
                onClick={() => startListeningInternal('step2_highest', 5)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 font-semibold text-sm hover:bg-rose-500/25 active:scale-95 transition-all"
              >
                <Mic className="w-4 h-4" />
                Ativar Microfone — Cante a Nota Mais Aguda
              </button>
            )}
            {isListening && (
              <button
                onClick={() => captureNote('step2_highest')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm hover:bg-zinc-700 active:scale-95 transition-all"
              >
                <Check className="w-4 h-4" />
                Capturar Agora
              </button>
            )}
          </div>
        </div>
      )}

      {/* RESULT */}
      {step === 'result' && result && (
        <div className="flex flex-col gap-6">
          {/* Hero: Range summary */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 p-6 rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800">
            {/* Lowest note */}
            <div className="flex flex-col items-center gap-1">
              <ChevronDown className="w-5 h-5 text-amber-400" />
              <span className="text-xs text-zinc-400">Mais Grave</span>
              <span className="text-4xl font-black font-mono text-amber-300">{result.lowestPitch.scientificNotation}</span>
              <span className="text-xs font-mono text-zinc-500">{result.lowestPitch.frequency.toFixed(1)} Hz</span>
            </div>

            {/* Range info */}
            <div className="flex flex-col items-center gap-2 px-6">
              <div className="text-2xl font-black text-white">{result.semitonesTotal} <span className="text-zinc-400 text-lg font-normal">semitons</span></div>
              <div className="text-sm text-zinc-400">
                {result.octavesSpan > 0 && <span className="font-semibold text-zinc-300">{result.octavesSpan} oitava{result.octavesSpan > 1 ? 's' : ''}</span>}
                {result.semitonesRemainder > 0 && <span> + {result.semitonesRemainder} semitom{result.semitonesRemainder > 1 ? 's' : ''}</span>}
              </div>
              <button
                onClick={handlePlayGlissando}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs hover:bg-zinc-700 active:scale-95 transition-all mt-1"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Ouvir Extensão
              </button>
            </div>

            {/* Highest note */}
            <div className="flex flex-col items-center gap-1">
              <ChevronUp className="w-5 h-5 text-rose-400" />
              <span className="text-xs text-zinc-400">Mais Aguda</span>
              <span className="text-4xl font-black font-mono text-rose-300">{result.highestPitch.scientificNotation}</span>
              <span className="text-xs font-mono text-zinc-500">{result.highestPitch.frequency.toFixed(1)} Hz</span>
            </div>
          </div>

          {/* Voice type classification */}
          {result.classifications.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400" />
                Classificação Vocal
              </div>
              <div className="flex flex-wrap gap-2">
                {result.classifications.map((vc) => (
                  <div
                    key={vc.voiceType}
                    className={`px-4 py-2.5 rounded-xl border flex flex-col gap-0.5 ${VOICE_BADGE_COLORS[vc.voiceType] ?? 'bg-zinc-800 text-zinc-300 border-zinc-700'}`}
                  >
                    <span className="font-bold text-sm">{vc.voiceType}</span>
                    <span className="text-[11px] opacity-70">{vc.gender} · {vc.rangeLabel}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comfortable center note */}
          <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-between gap-4">
            <div>
              <div className="text-xs text-zinc-400 mb-1 flex items-center gap-1"><Music className="w-3.5 h-3.5" /> Nota Central de Conforto</div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black font-mono text-emerald-300">{result.comfortableCenterNote.scientificNotation}</span>
                <span className="text-sm font-mono text-zinc-400">{result.comfortableCenterNote.frequency} Hz</span>
              </div>
              <div className="text-xs text-zinc-500 mt-1">Ponto médio da sua tessitura — ideal para tonalidades de treino</div>
            </div>
            <button
              onClick={() => handlePlayNote(result.comfortableCenterNote.note, result.comfortableCenterNote.octave)}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs hover:bg-emerald-500/20 active:scale-95 transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Ouvir
            </button>
          </div>

          {/* Suggested keys */}
          <div className="flex flex-col gap-3">
            <div className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              Tonalidades Sugeridas para Treino
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {result.suggestedKeys.map((key, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 hover:border-zinc-700 transition-all"
                >
                  <div className="flex items-baseline gap-1.5 mb-1">
                    <span className="text-xl font-black font-mono text-white">{key.tonic}</span>
                    <span className="text-xs text-zinc-400">{key.mode === 'major' ? 'Maior' : key.mode === 'natural_minor' ? 'Menor Natural' : key.mode}</span>
                  </div>
                  <div className="text-[11px] text-zinc-500">{key.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Restart */}
          <div className="flex justify-center">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm text-zinc-400 border border-zinc-700 hover:text-zinc-200 hover:border-zinc-600 active:scale-95 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              Repetir Teste
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
