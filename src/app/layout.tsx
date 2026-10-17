import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Harmonis • Afinador Cromático & Campo Harmônico Dinâmico',
  description:
    'Ferramenta web interativa para músicos e cantores com afinador cromático de alta precisão e visualizador dinâmico de campo harmônico em tempo real.',
  keywords: [
    'afinador',
    'campo harmônico',
    'música',
    'treino vocal',
    'afinador cromático',
    'teoria musical',
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${jetbrainsMono.variable} dark`}>
      <body className="min-h-screen bg-zinc-950 text-zinc-100 font-sans antialiased selection:bg-emerald-500 selection:text-zinc-950">
        {children}
      </body>
    </html>
  );
}
