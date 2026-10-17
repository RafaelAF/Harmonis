'use client';

import React, { useState } from 'react';
import { Header } from '@/components/Header';
import { NavigationTabs, TabKey } from '@/components/NavigationTabs';
import { TunerScreen } from '@/components/Tuner/TunerScreen';
import { DetailedHarmonicField } from '@/components/HarmonicField/DetailedHarmonicField';
import { MetronomeScreen } from '@/components/Metronome/MetronomeScreen';
import { VocalToneScreen } from '@/components/VocalTone/VocalToneScreen';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabKey>('tuner');

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100">
      {/* Cabeçalho */}
      <Header />

      {/* Barra de Abas de Navegação */}
      <NavigationTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Conteúdo Principal Dinâmico por Aba */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {activeTab === 'tuner' && <TunerScreen />}
        {activeTab === 'harmonic' && <DetailedHarmonicField />}
        {activeTab === 'metronome' && <MetronomeScreen />}
        {activeTab === 'vocal' && <VocalToneScreen />}
      </main>

      {/* Rodapé Stateless */}
      <footer className="border-t border-zinc-900 bg-zinc-950/80 py-6 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Harmonis • Processamento de Áudio 100% no Cliente (Stateless)</span>
          <span className="text-zinc-600">Sem armazenamento de dados • Latência Ultrabaixa</span>
        </div>
      </footer>
    </div>
  );
}
