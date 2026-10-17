'use client';

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { NoteName, ScaleMode } from '@/types/music';
import { NOTES, SCALE_MODE_LABELS, generateHarmonicField } from '@/lib/musicTheory';
import { playChordArpeggio } from '@/lib/audioSynth';
import { useAudioContext } from '@/hooks/useAudioContext';
import {
  Video, Play, Square, Timer, Music2,
  Volume2, Zap, RotateCcw, ChevronDown, ChevronUp,
  Waves, MousePointer, Info,
} from 'lucide-react';

// Extracts YouTube video ID from various YouTube URL formats
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:v=|\/embed\/|\/v\/|youtu\.be\/|\/shorts\/)([A-Za-z0-9_-]{11})/,
    /^([A-Za-z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Sample BPM presets typical of popular songs
const BPM_PRESETS = [60, 70, 80, 90, 100, 110, 120, 130, 140, 160];

// Tap tempo logic
function useTapTempo() {
  const tapsRef = useRef<number[]>([]);
  const [bpm, setBpm] = useState(120);
  const [tapCount, setTapCount] = useState(0);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tap = useCallback(() => {
    const now = Date.now();
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);

    // Reset if last tap was more than 2.5s ago
    if (tapsRef.current.length > 0 && now - tapsRef.current[tapsRef.current.length - 1] > 2500) {
      tapsRef.current = [];
    }
    tapsRef.current.push(now);
    setTapCount(tapsRef.current.length);
    // Keep only last 8 taps
    if (tapsRef.current.length > 8) tapsRef.current.shift();

    if (tapsRef.current.length >= 2) {
      const intervals = [];
      for (let i = 1; i < tapsRef.current.length; i++) {
        intervals.push(tapsRef.current[i] - tapsRef.current[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const detectedBpm = Math.round(60000 / avgInterval);
      setBpm(Math.max(30, Math.min(250, detectedBpm)));
    }

    // Auto-reset after inactivity
    resetTimerRef.current = setTimeout(() => {
      tapsRef.current = [];
      setTapCount(0);
    }, 3000);
  }, []);

  return { bpm, setBpm, tap, tapCount };
}

// Pitch match challenge types
type PitchChallengeResult = 'perfect' | 'close' | 'off' | 'waiting';

interface PitchScore {
  note: NoteName;
  result: PitchChallengeResult;
  timestamp: number;
}

export function YouTubePlayerScreen() {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [videoId, setVideoId] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [songKey, setSongKey] = useState<NoteName>('C');
  const [songMode, setSongMode] = useState<ScaleMode>('major');
  const [showHarmonicField, setShowHarmonicField] = useState(true);
  const [showTapTempo, setShowTapTempo] = useState(true);
  const [tapFlash, setTapFlash] = useState(false);

  // Gamified pitch tracking (via microphone)
  const [isTracking, setIsTracking] = useState(false);
  const [currentNote, setCurrentNote] = useState<NoteName | null>(null);
  const [pitchScore, setPitchScore] = useState<PitchScore[]>([]);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  const { resumeContext } = useAudioContext();
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const bufferRef = useRef<Float32Array<ArrayBuffer> | null>(null);

  const { bpm, setBpm, tap } = useTapTempo();

  const harmonicField = useMemo(
    () => generateHarmonicField(songKey, songMode),
    [songKey, songMode]
  );

  const handleLoadVideo = () => {
    setUrlError(null);
    const id = extractYouTubeId(youtubeUrl.trim());
    if (!id) {
      setUrlError('URL inválida. Cole uma URL do YouTube (ex: https://youtube.com/watch?v=...)');
      return;
    }
    setVideoId(id);
  };

  const handleTap = () => {
    tap();
    setTapFlash(true);
    setTimeout(() => setTapFlash(false), 100);
  };

  // Microphone pitch tracking
  const stopTracking = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = null;
    analyserRef.current?.disconnect();
    analyserRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setIsTracking(false);
    setCurrentNote(null);
  }, []);

  const startTracking = useCallback(async () => {
    try {
      setTrackingError(null);
      const audioCtx = await resumeContext();
      if (!audioCtx) throw new Error('AudioContext unavailable');
      audioCtxRef.current = audioCtx;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, autoGainControl: false, noiseSuppression: false },
      });
      streamRef.current = stream;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const buffer = new Float32Array(analyser.fftSize);
      bufferRef.current = buffer;
      setIsTracking(true);

      // Dynamic import to avoid SSR
      const { detectPitch } = await import('@/lib/pitchDetection');

      const analyze = () => {
        if (!analyserRef.current || !bufferRef.current) return;
        analyserRef.current.getFloatTimeDomainData(bufferRef.current);
        const detected = detectPitch(bufferRef.current, {
          sampleRate: audioCtx.sampleRate,
          a4Ref: 440,
          minVolume: 0.018,
        });
        if (detected) {
          setCurrentNote(detected.note);
          // Score this note against the harmonic field
          const isInScale = harmonicField.scaleNotes.includes(detected.note);
          const isTonicMatch = detected.note === songKey;
          const result: PitchChallengeResult = isTonicMatch ? 'perfect' : isInScale ? 'close' : 'off';
          setPitchScore((prev) => [
            ...prev.slice(-49),
            { note: detected.note, result, timestamp: Date.now() },
          ]);
        } else {
          setCurrentNote(null);
        }
        animFrameRef.current = requestAnimationFrame(analyze);
      };
      animFrameRef.current = requestAnimationFrame(analyze);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro de microfone';
      setTrackingError(
        msg.includes('denied') || msg.includes('Permission')
          ? 'Acesso ao microfone negado.'
          : `Erro: ${msg}`
      );
    }
  }, [resumeContext, harmonicField, songKey]);

  useEffect(() => () => stopTracking(), [stopTracking]);

  const handlePlayChord = async (notes: NoteName[]) => {
    const ctx = await resumeContext();
    if (ctx) playChordArpeggio(ctx, notes, 4, 440);
  };

  // Last 20 scores for the tracker bar
  const recentScores = pitchScore.slice(-20);
  const totalScore = pitchScore.filter((s) => s.result !== 'off').length;
  const accuracy = pitchScore.length > 0 ? Math.round((totalScore / pitchScore.length) * 100) : 0;

  const noteMatchInScale = currentNote ? harmonicField.scaleNotes.includes(currentNote) : false;
  const noteMatchTonic = currentNote === songKey;

  return (
    <div className="space-y-6">
      {/* 1. YouTube URL Input */}
      <div className="bg-zinc-900/80 rounded-2xl border border-zinc-800 p-6 sm:p-8 backdrop-blur-sm shadow-xl">
        <div className="flex items-center gap-2 mb-4">
          <Video className="w-5 h-5 text-rose-400" />
          <h2 className="text-lg font-bold text-white tracking-tight">Praticar com YouTube</h2>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 ml-1">
            Gamificado
          </span>
        </div>
        <p className="text-xs text-zinc-400 mb-5">
          Cole o link de qualquer música do YouTube para estudar o ritmo e a harmonia junto ao player.
          O microfone rastreia suas notas em tempo real enquanto o vídeo toca.
        </p>

        {/* Notice about audio limitations */}
        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 mb-5 text-xs text-amber-300/80">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
          <span>
            <strong className="text-amber-400">Nota técnica:</strong> Por restrições do YouTube iFrame, o áudio do vídeo não pode ser captado diretamente pela Web Audio API.
            O rastreamento de pitch funciona via <strong>microfone</strong> — o usuário canta ou toca junto ao vídeo.
          </span>
        </div>

        {/* URL input */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={youtubeUrl}
            onChange={(e) => { setYoutubeUrl(e.target.value); setUrlError(null); }}
            onKeyDown={(e) => e.key === 'Enter' && handleLoadVideo()}
            placeholder="https://youtube.com/watch?v=... ou https://youtu.be/..."
            className="flex-1 bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-xl px-4 py-3 text-sm placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono"
          />
          <button
            onClick={handleLoadVideo}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-rose-500 text-white font-semibold text-sm hover:bg-rose-400 active:scale-95 transition-all shadow-lg shadow-rose-500/20"
          >
            <Play className="w-4 h-4 fill-current" />
            Carregar
          </button>
        </div>
        {urlError && <p className="mt-2 text-xs text-rose-400">{urlError}</p>}

        {/* Quick ID shortcut */}
        <div className="mt-3 text-[11px] text-zinc-500">
          Também aceita IDs diretamente, ex: <span className="font-mono text-zinc-400">dQw4w9WgXcQ</span>
        </div>
      </div>

      {/* 2. YouTube Player (shown when video is loaded) */}
      {videoId && (
        <div className="bg-zinc-900/80 rounded-2xl border border-zinc-800 overflow-hidden shadow-xl">
          <div className="aspect-video w-full">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
              title="YouTube player"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
        </div>
      )}

      {/* 3. Song Configuration: Key + Mode */}
      <div className="bg-zinc-900/60 rounded-2xl border border-zinc-800 p-6 sm:p-8 backdrop-blur-sm shadow-xl">
        <div className="flex items-center gap-2 mb-5">
          <Music2 className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold text-white">Tom e Escala da Música</h3>
        </div>

        <div className="flex flex-wrap gap-4 items-center">
          {/* Key selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-400">Tom:</label>
            <div className="flex flex-wrap gap-1">
              {NOTES.map((note) => (
                <button
                  key={note}
                  onClick={() => setSongKey(note)}
                  className={`w-9 h-9 rounded-lg font-mono text-xs font-bold transition-all active:scale-95 ${
                    songKey === note
                      ? 'bg-cyan-500 text-zinc-950 shadow-md shadow-cyan-500/20'
                      : note.includes('#')
                      ? 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700'
                      : 'bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700'
                  }`}
                >
                  {note}
                </button>
              ))}
            </div>
          </div>

          {/* Mode selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-400">Modo:</label>
            <div className="flex flex-col gap-1.5">
              {(Object.keys(SCALE_MODE_LABELS) as ScaleMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setSongMode(mode)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all text-left ${
                    songMode === mode
                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                      : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  {SCALE_MODE_LABELS[mode]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Current field summary */}
        <div className="mt-4 flex items-center gap-2 text-xs text-zinc-400">
          <span>Escala:</span>
          <div className="flex gap-1 font-mono">
            {harmonicField.scaleNotes.map((note, i) => (
              <span
                key={i}
                className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                  note === songKey
                    ? 'bg-cyan-400 text-zinc-950'
                    : 'bg-zinc-800/60 text-zinc-300'
                }`}
              >
                {note}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Tap Tempo / BPM Sync */}
      <div className="bg-zinc-900/60 rounded-2xl border border-zinc-800 overflow-hidden shadow-xl">
        <button
          onClick={() => setShowTapTempo((v) => !v)}
          className="w-full flex items-center justify-between px-6 sm:px-8 py-4 hover:bg-zinc-900/40 transition-all"
        >
          <div className="flex items-center gap-3">
            <Timer className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-bold text-white">Tap Tempo — BPM Sync</span>
            <span className="text-sm font-mono font-black text-amber-300">{bpm} BPM</span>
          </div>
          {showTapTempo ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
        </button>

        {showTapTempo && (
          <div className="px-6 sm:px-8 pb-6 flex flex-col gap-4">
            <p className="text-xs text-zinc-400">
              Toque no botão sincronizando com a batida do vídeo. O BPM detectado pode ser enviado ao Metrônomo & Cajón.
            </p>

            {/* Main Tap button */}
            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={handleTap}
                className={`w-24 h-24 rounded-2xl font-bold text-sm flex flex-col items-center justify-center gap-1 transition-all active:scale-90 select-none shadow-lg ${
                  tapFlash
                    ? 'bg-amber-400 text-zinc-950 shadow-amber-400/30 scale-95'
                    : 'bg-amber-500/15 border-2 border-amber-500/40 text-amber-300 hover:bg-amber-500/25 shadow-amber-500/10'
                }`}
              >
                <MousePointer className="w-6 h-6" />
                <span>TAP</span>
              </button>

              <div className="flex flex-col gap-2">
                <div className="text-4xl font-black font-mono text-white">{bpm} <span className="text-zinc-400 text-xl font-normal">BPM</span></div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={40}
                    max={240}
                    value={bpm}
                    onChange={(e) => setBpm(Number(e.target.value))}
                    className="w-32 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                  />
                  <button
                    onClick={() => setBpm(120)}
                    className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    Reset
                  </button>
                </div>

                {/* Quick BPM presets */}
                <div className="flex flex-wrap gap-1">
                  {BPM_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setBpm(preset)}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold transition-all ${
                        bpm === preset
                          ? 'bg-amber-400 text-zinc-950'
                          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* BPM visual pulse indicator */}
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <Waves className="w-3.5 h-3.5 text-amber-400/60" />
              <span>Duração do beat: <span className="font-mono text-zinc-300">{(60000 / bpm).toFixed(0)} ms</span></span>
              <span>•</span>
              <span>Tempo de 4/4: <span className="font-mono text-zinc-300">{((60000 / bpm) * 4 / 1000).toFixed(2)}s / compasso</span></span>
            </div>
          </div>
        )}
      </div>

      {/* 5. Harmonic Field with Chord Playback */}
      <div className="bg-zinc-900/60 rounded-2xl border border-zinc-800 overflow-hidden shadow-xl">
        <button
          onClick={() => setShowHarmonicField((v) => !v)}
          className="w-full flex items-center justify-between px-6 sm:px-8 py-4 hover:bg-zinc-900/40 transition-all"
        >
          <div className="flex items-center gap-3">
            <Music2 className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-bold text-white">Campo Harmônico — {songKey} {SCALE_MODE_LABELS[songMode]}</span>
          </div>
          {showHarmonicField ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
        </button>

        {showHarmonicField && (
          <div className="px-6 sm:px-8 pb-6">
            <p className="text-xs text-zinc-400 mb-4">
              Clique em qualquer acorde para audicioná-lo. Use como referência harmônica enquanto o vídeo toca.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {harmonicField.degrees.map((degree) => (
                <div
                  key={degree.degreeNumber}
                  onClick={() => handlePlayChord(degree.tetradNotes)}
                  className="group bg-zinc-950/60 border border-zinc-800/80 hover:border-emerald-500/40 hover:bg-zinc-900/60 rounded-xl p-3 transition-all duration-200 cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                      {degree.roman}
                    </span>
                  </div>
                  <div className="text-base font-black font-mono text-zinc-100 group-hover:text-emerald-300 transition-colors">
                    {degree.tetradSymbol}
                  </div>
                  <div className="text-[10px] text-zinc-600 font-mono mt-0.5">{degree.triadSymbol}</div>
                  <div className="mt-2 pt-2 border-t border-zinc-800/60 flex items-center gap-0.5 flex-wrap">
                    {degree.tetradNotes.map((n, ni) => (
                      <span key={ni} className="text-[9px] px-1 py-0.5 rounded bg-zinc-800 text-zinc-500 font-mono">
                        {n}
                      </span>
                    ))}
                  </div>
                  <div className="mt-1.5 text-[10px] text-zinc-600 group-hover:text-emerald-400/70 flex items-center gap-0.5">
                    <Volume2 className="w-2.5 h-2.5" /> ouvir
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 6. Gamified Pitch Tracker */}
      <div className="bg-zinc-900/60 rounded-2xl border border-zinc-800 p-6 sm:p-8 backdrop-blur-sm shadow-xl">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Rastreador de Afinação Gamificado</h3>
          </div>
          {pitchScore.length > 0 && (
            <button
              onClick={() => setPitchScore([])}
              className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Zerar
            </button>
          )}
        </div>
        <p className="text-xs text-zinc-400 mb-4">
          Ative o microfone e cante/toque junto com o vídeo. Suas notas são rastreadas e pontuadas em tempo real com base no campo harmônico da música.
        </p>

        {trackingError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {trackingError}
          </div>
        )}

        {/* Current note display */}
        <div className="flex items-center gap-6 mb-5">
          <div
            className={`w-20 h-20 rounded-2xl flex flex-col items-center justify-center border-2 transition-all duration-150 ${
              currentNote
                ? noteMatchTonic
                  ? 'bg-emerald-500/15 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                  : noteMatchInScale
                  ? 'bg-cyan-500/15 border-cyan-500/50 shadow-md shadow-cyan-500/10'
                  : 'bg-rose-500/10 border-rose-500/30'
                : 'bg-zinc-900 border-zinc-800'
            }`}
          >
            <span
              className={`text-3xl font-black font-mono ${
                currentNote
                  ? noteMatchTonic
                    ? 'text-emerald-300'
                    : noteMatchInScale
                    ? 'text-cyan-300'
                    : 'text-rose-300'
                  : 'text-zinc-700'
              }`}
            >
              {currentNote ?? '—'}
            </span>
            {currentNote && (
              <span className="text-[10px] font-semibold mt-0.5">
                {noteMatchTonic ? '🎯 Tônica!' : noteMatchInScale ? '✓ Na escala' : '× Fora'}
              </span>
            )}
          </div>

          {/* Score */}
          {pitchScore.length > 0 && (
            <div className="flex flex-col gap-1">
              <div className="text-3xl font-black text-white">{accuracy}%</div>
              <div className="text-xs text-zinc-400">precisão (<span className="font-mono">{pitchScore.length}</span> notas)</div>
              <div className="flex gap-1.5 mt-1">
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {pitchScore.filter((s) => s.result === 'perfect').length} ✦
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  {pitchScore.filter((s) => s.result === 'close').length} ✓
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  {pitchScore.filter((s) => s.result === 'off').length} ×
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Recent pitch trail */}
        {recentScores.length > 0 && (
          <div className="flex items-center gap-0.5 mb-4 h-8">
            {recentScores.map((score, i) => (
              <div
                key={i}
                className={`flex-1 rounded-sm h-full flex items-center justify-center text-[9px] font-mono font-bold transition-all ${
                  score.result === 'perfect'
                    ? 'bg-emerald-500/60 text-emerald-200'
                    : score.result === 'close'
                    ? 'bg-cyan-500/40 text-cyan-300'
                    : 'bg-rose-500/20 text-rose-400'
                }`}
                title={`${score.note} — ${score.result}`}
              >
                {score.note}
              </div>
            ))}
          </div>
        )}

        {/* Start/Stop tracking button */}
        <button
          onClick={isTracking ? stopTracking : startTracking}
          className={`flex items-center gap-2.5 px-6 py-3 rounded-xl font-semibold text-sm transition-all shadow-lg active:scale-95 ${
            isTracking
              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20'
              : 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-zinc-950 hover:opacity-95 shadow-emerald-500/20'
          }`}
        >
          {isTracking ? (
            <>
              <Square className="w-4 h-4 fill-current" />
              Parar Rastreamento
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              Iniciar Rastreamento de Afinação
            </>
          )}
        </button>
      </div>
    </div>
  );
}
