'use client';

import React from 'react';
import { Volume2, ArrowRight, Sparkles } from 'lucide-react';

export function VocalTonePlaceholder() {
  return (
    <div className="bg-zinc-900/60 rounded-2xl border border-zinc-800 p-8 text-center max-w-2xl mx-auto backdrop-blur-sm">
      <div className="w-14 h-14 rounded-2xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center mx-auto mb-4 text-cyan-400 shadow-lg">
        <Volume2 className="w-7 h-7" />
      </div>
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-semibold border border-cyan-500/20 mb-3">
        <Sparkles className="w-3.5 h-3.5" />
        Próxima Etapa no Roadmap (AGENTS.md #3.3)
      </div>
      <h3 className="text-xl font-bold text-white mb-2">Player de Tom Vocal & Tessitura</h3>
      <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
        Gerador de tons puros (senoidal e triangular) com controle de oitava (O2 a O6), modo Sustain/Hold e Press to Play para aquecimento vocal, reconhecimento de tessitura e testes de afinação relativa.
      </p>

      <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 text-left text-xs space-y-2 text-zinc-300">
        <div className="font-semibold text-zinc-200">Especificações planejadas:</div>
        <div className="flex items-center gap-2">
          <ArrowRight className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>Sintetizador puro com envelope sem estalos (anti-pop/click)</span>
        </div>
        <div className="flex items-center gap-2">
          <ArrowRight className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>Controles de oitava e volume independente</span>
        </div>
        <div className="flex items-center gap-2">
          <ArrowRight className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>Integração com progressões harmônicas vocais</span>
        </div>
      </div>
    </div>
  );
}
