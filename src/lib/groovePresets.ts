import { GroovePreset } from '@/types/sequencer';

export const GROOVE_PRESETS: GroovePreset[] = [
  {
    id: 'pop_rock',
    name: 'Pop / Rock Básico',
    genre: 'Rock / Pop',
    defaultBpm: 110,
    timeSignature: '4/4',
    stepCount: 16,
    description: 'Groove padrão com bumbo nos tempos 1 e 3, caixa nos tempos 2 e 4.',
    grid: {
      bass: [
        true, false, false, false,  // 1
        false, false, false, false, // 2
        true, false, true, false,   // 3 (com antecipação)
        false, false, false, false, // 4
      ],
      snare: [
        false, false, false, false,
        true, false, false, false,  // 2
        false, false, false, false,
        true, false, false, false,  // 4
      ],
      ghost: [
        false, false, true, false,
        false, false, true, false,
        false, false, false, false,
        false, false, true, true,
      ],
    },
  },
  {
    id: 'samba_pagode',
    name: 'Samba & Pagode',
    genre: 'Brasileiro',
    defaultBpm: 96,
    timeSignature: '4/4',
    stepCount: 16,
    description: 'Síncope brasileira tradicional simulando o surdo e tamborim no cajón.',
    grid: {
      bass: [
        true, false, false, false,  // 1
        false, false, true, false,  // síncope
        true, false, false, false,  // 3
        false, false, true, false,  // síncope
      ],
      snare: [
        false, false, false, false,
        true, false, false, false,
        false, false, false, false,
        true, false, false, false,
      ],
      ghost: [
        false, true, true, false,
        false, true, false, true,
        false, true, true, false,
        false, true, false, true,
      ],
    },
  },
  {
    id: 'baiao_forro',
    name: 'Baião & Forró',
    genre: 'Brasileiro',
    defaultBpm: 105,
    timeSignature: '4/4',
    stepCount: 16,
    description: 'Simulação da zabumba clássica: Tum... Tá-Tum... Tá.',
    grid: {
      bass: [
        true, false, false, false,
        false, false, false, false,
        false, false, true, false,
        true, false, false, false,
      ],
      snare: [
        false, false, false, false,
        true, false, false, false,
        false, false, false, false,
        true, false, false, false,
      ],
      ghost: [
        false, false, true, false,
        false, true, false, false,
        false, true, false, false,
        false, true, true, false,
      ],
    },
  },
  {
    id: 'bossa_nova',
    name: 'Bossa Nova',
    genre: 'Brasileiro',
    defaultBpm: 125,
    timeSignature: '4/4',
    stepCount: 16,
    description: 'Clave suave de bossa nova com bumbo cadenciado e esteira leve.',
    grid: {
      bass: [
        true, false, false, false,
        true, false, false, false,
        true, false, false, false,
        true, false, false, false,
      ],
      snare: [
        true, false, false, true,
        false, false, true, false,
        false, false, true, false,
        true, false, false, false,
      ],
      ghost: [
        false, false, true, false,
        false, true, false, false,
        false, true, false, false,
        false, false, true, false,
      ],
    },
  },
  {
    id: 'funk_groove',
    name: 'Funk & Soul 70s',
    genre: 'Funk / Groove',
    defaultBpm: 100,
    timeSignature: '4/4',
    stepCount: 16,
    description: 'Groove estilo James Brown e Tower of Power com síncopes ativas de ghost notes.',
    grid: {
      bass: [
        true, false, false, false,  // 1
        false, false, true, false,  // 2 e
        false, true, false, false,  // 3 "e"
        false, false, true, false,  // 4 "e"
      ],
      snare: [
        false, false, false, false,
        true, false, false, false,  // 2
        false, false, false, false,
        true, false, false, false,  // 4
      ],
      ghost: [
        false, true, false, true,
        false, true, false, true,
        true, false, true, false,
        false, true, false, true,
      ],
    },
  },
  {
    id: 'rumba_flamenca',
    name: 'Rumba Flamenca',
    genre: 'Flamenco / World',
    defaultBpm: 116,
    timeSignature: '4/4',
    stepCount: 16,
    description: 'O berço do cajón moderno: rasgueados e acentuações no contratempo (estilo Gipsy Kings).',
    grid: {
      bass: [
        true, false, false, false,
        false, false, true, false,
        false, false, true, false,
        false, false, false, false,
      ],
      snare: [
        false, false, false, true,
        false, false, false, true,
        false, false, false, false,
        true, false, false, false,
      ],
      ghost: [
        false, true, true, false,
        true, true, false, false,
        true, true, false, true,
        false, true, true, true,
      ],
    },
  },
  {
    id: 'ijexa_afoxe',
    name: 'Ijexá & Afoxé',
    genre: 'Brasileiro',
    defaultBpm: 92,
    timeSignature: '4/4',
    stepCount: 16,
    description: 'Ritmo afro-brasileiro da Bahia (Filhos de Gandhy) com swing característico nos agogôs.',
    grid: {
      bass: [
        true, false, false, false,
        false, false, true, false,
        true, false, false, false,
        false, false, true, false,
      ],
      snare: [
        false, false, true, false,
        false, true, false, false,
        false, false, true, false,
        false, true, false, false,
      ],
      ghost: [
        false, true, false, true,
        true, false, false, true,
        false, true, false, true,
        true, false, false, true,
      ],
    },
  },
  {
    id: 'xote_nordestino',
    name: 'Xote Nordestino',
    genre: 'Brasileiro',
    defaultBpm: 84,
    timeSignature: '4/4',
    stepCount: 16,
    description: 'Levada dançante e cadenciada de xote pé-de-serra com estalos suaves no contratempo.',
    grid: {
      bass: [
        true, false, false, false,
        false, false, true, false,
        true, false, false, false,
        false, false, true, false,
      ],
      snare: [
        false, false, false, false,
        true, false, false, false,
        false, false, false, false,
        true, false, false, false,
      ],
      ghost: [
        false, true, false, true,
        false, true, false, true,
        false, true, false, true,
        false, true, false, true,
      ],
    },
  },
  {
    id: 'maracatu',
    name: 'Maracatu de Baque Virado',
    genre: 'Brasileiro',
    defaultBpm: 98,
    timeSignature: '4/4',
    stepCount: 16,
    description: 'O peso das alfaias de Pernambuco: bumbo denso e forte pressão rítmica.',
    grid: {
      bass: [
        true, false, false, true,
        false, false, true, false,
        true, false, false, false,
        false, false, true, false,
      ],
      snare: [
        false, false, false, false,
        true, false, false, false,
        false, false, true, false,
        true, false, false, false,
      ],
      ghost: [
        false, true, true, false,
        false, true, false, true,
        false, true, false, true,
        false, true, false, true,
      ],
    },
  },
  {
    id: 'reggae_onedrop',
    name: 'Reggae (One Drop)',
    genre: 'Reggae',
    defaultBpm: 78,
    timeSignature: '4/4',
    stepCount: 16,
    description: 'O clássico "One Drop" jamaicano com o tempo 1 livre e peso conjunto no tempo 3.',
    grid: {
      bass: [
        false, false, false, false,
        false, false, false, false,
        true, false, false, false, // Impacto no tempo 3
        false, false, false, false,
      ],
      snare: [
        false, false, false, false,
        false, false, false, false,
        true, false, false, false, // Caixa sincronizada no tempo 3
        false, false, false, false,
      ],
      ghost: [
        false, false, false, false,
        true, false, false, false, // Contratempo
        false, false, false, false,
        true, false, false, false, // Contratempo
      ],
    },
  },
  {
    id: 'hiphop_boombap',
    name: 'Hip-Hop Boom Bap',
    genre: 'Hip-Hop',
    defaultBpm: 88,
    timeSignature: '4/4',
    stepCount: 16,
    description: 'Batida pesada e clássica dos anos 90 com caixa estalada e bumbos sincopados.',
    grid: {
      bass: [
        true, false, false, false,
        false, false, false, false,
        false, false, true, false,
        false, false, false, false,
      ],
      snare: [
        false, false, false, false,
        true, false, false, false,
        false, false, false, false,
        true, false, false, false,
      ],
      ghost: [
        false, false, true, false,
        false, false, true, false,
        true, false, false, false,
        false, false, true, false,
      ],
    },
  },
  {
    id: 'pop_acustico',
    name: 'Balada Pop Acústica',
    genre: 'Rock / Pop',
    defaultBpm: 74,
    timeSignature: '4/4',
    stepCount: 16,
    description: 'Acompanhamento suave e orgânico para voz e violão com estalos leves de borda.',
    grid: {
      bass: [
        true, false, false, false,
        false, false, false, false,
        true, false, false, false,
        false, false, false, false,
      ],
      snare: [
        false, false, false, false,
        true, false, false, false,
        false, false, false, false,
        true, false, false, false,
      ],
      ghost: [
        false, false, true, false,
        false, false, true, false,
        false, false, true, false,
        false, false, true, false,
      ],
    },
  },
  {
    id: 'valsa_34',
    name: 'Valsa / Guarânia (3/4)',
    genre: 'Ternário',
    defaultBpm: 130,
    timeSignature: '3/4',
    stepCount: 12,
    description: 'Ritmo ternário com peso no primeiro tempo e estalos nos tempos 2 e 3.',
    grid: {
      bass: [
        true, false, false, false,  // Tempo 1
        false, false, false, false, // Tempo 2
        false, false, false, false, // Tempo 3
      ],
      snare: [
        false, false, false, false,
        true, false, false, false,  // Tempo 2
        true, false, false, false,  // Tempo 3
      ],
      ghost: [
        false, false, true, false,
        false, false, true, false,
        false, false, true, false,
      ],
    },
  },
  {
    id: 'blues_shuffle',
    name: 'Blues Shuffle (12 Passos)',
    genre: 'Blues',
    defaultBpm: 115,
    timeSignature: '3/4',
    stepCount: 12,
    description: 'Swing de blues em tercinas com bumbos arrastados e caixa nos tempos principais.',
    grid: {
      bass: [
        true, false, false, false,
        false, false, true, false,
        false, false, false, false,
      ],
      snare: [
        false, false, false, false,
        true, false, false, false,
        true, false, false, false,
      ],
      ghost: [
        false, false, true, false,
        false, false, false, true,
        false, false, true, false,
      ],
    },
  },
];
