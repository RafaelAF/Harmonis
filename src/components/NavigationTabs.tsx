'use client';

import React from 'react';
import { Mic, Grid3X3, Timer, Volume2 } from 'lucide-react';

export type TabKey = 'tuner' | 'harmonic' | 'metronome' | 'vocal';

interface NavigationTabsProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

export function NavigationTabs({ activeTab, onTabChange }: NavigationTabsProps) {
  const tabs = [
    {
      id: 'tuner' as TabKey,
      label: 'Afinador & Harmonia',
      icon: Mic,
      badge: 'Ativo',
    },
    {
      id: 'harmonic' as TabKey,
      label: 'Campo Harmônico',
      icon: Grid3X3,
      badge: null,
    },
    {
      id: 'metronome' as TabKey,
      label: 'Metrônomo & Cajón',
      icon: Timer,
      badge: null,
    },
    {
      id: 'vocal' as TabKey,
      label: 'Tom Vocal',
      icon: Volume2,
      badge: null,
    },
  ];

  return (
    <nav className="border-b border-zinc-800 bg-zinc-950/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex gap-2 overflow-x-auto py-2 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-zinc-800 text-white shadow-sm shadow-black/50 border border-zinc-700/60'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 border border-transparent'
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-emerald-400' : 'text-zinc-500'
                  }`}
                />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      tab.badge === 'Ativo'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
