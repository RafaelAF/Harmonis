# AGENTS.md

## 1. Visão Geral do Projeto
Desenvolvimento de uma **ferramenta web interativa para músicos e cantores**, integrando afinador, metrônomo, gerador de tons de referência e um visualizador de campo harmônico para auxílio no treino vocal, transposição e prática musical.

* **Foco:** Performance em tempo real, baixa latência de áudio, interface leve e *mobile-first*.
* **Persistência de Dados:** **Nenhuma (Stateless).** Sem backend, sem banco de dados, sem armazenamento local (`localStorage`/`sessionStorage`) no momento.

---

## 2. Stack Tecnológica Recomendada
* **Framework Web:** Next.js (App Router) ou React + Vite.
* **Linguagem:** TypeScript (estritamente tipado).
* **Estilização:** Tailwind CSS (com suporte a *Dark Mode* por padrão).
* **Processamento de Áudio:** Web Audio API nativa do navegador (`AudioContext`, `AnalyserNode`, `OscillatorNode`, `GainNode`).
* **Análise de Frequência (Afinador):** Algoritmo de Autocorrelação (*YIN* ou *McLeod Pitch Method*) executado via Web Workers ou `AudioWorkletNode`.

---

## 3. Requisitos de Funcionalidades Principais

### 3.1 Metrônomo Ajustável
* **Controle de BPM:** Slider e botões (+ / -) variando de 30 a 280 BPM. Suporte a *Tap Tempo*.
* **Fórmula de Compasso (Time Signature):** Seleção de fórmulas comuns (2/4, 3/4, 4/4, 6/8).
* **Acentuação Visual e Sonora:**
  * Som diferenciado para o tempo 1 (acento forte).
  * Indicador visual de LEDs/pulsos piscando no ritmo do tempo.
* **Subdivisões de Tempo:** Semínima, colcheia, tercina, semicolcheia.
* **Motor de Tempo:** Implementar a técnica de *lookahead scheduler* do Web Audio API (usando `setTimeout`/`setInterval` de apoio para agendar eventos de áudio com precisão de relógio nativo e prevenir *jitter*).

### 3.2 Afinador Cromático (Tempo Real)
* **Entrada de Áudio:** Captura via `navigator.mediaDevices.getUserMedia({ audio: true })`.
* **Detecção de Frequência:**
  * Identificação da nota mais próxima (Notação Científica / Cifra: ex: C4, A4, F#3).
  * Exibição do desvio em **Cents** (de -50 a +50 cents).
* **Interface do Afinador:**
  * Ponteiro/Medidor visual (estilo ponteiro analógico ou indicador digital de afinação).
  * Indicador visual claro de status: *Abaixo (Flatted)*, *Afinado (In Tune)*, *Acima (Sharp)*.
* **Frequência de Referência (A4):** Padrão em 440 Hz (com ajuste opcional entre 432 Hz e 446 Hz).

### 3.3 Player de Tom Vocal (Tone Generator) & Campo Harmônico
* **Objetivo:** Permitir que o cantor execute notas/tons de referência para identificar sua tessitura, aquecer a voz e navegar pelos acordes/graus da tonalidade escolhida.
* **Geração de Som:** Sintetizador de onda pura (Sine wave ou Triangle wave) gerado via `OscillatorNode`.
* **Seleção de Notas & Tons:**
  * Seletor da tonalidade fundamental ($C$, $C\#/D\flat$, $D$, $D\#/E\flat$, $E$, $F$, $F\#/G\flat$, $G$, $G\#/A\flat$, $A$, $A\#/B\flat$, $B$).
  * Seleção de Modo/Escala: Maior e Menor (Natural, Harmônica e Melódica opcional).
  * Controle de Oitava (ex: Oitava 2 a Oitava 6).
* **Visualizador de Campo Harmônico (Integrado na Sessão do Singer/Vocal Player):**
  * Exibição dos graus da escala em numerais romanos ($I, ii, iii, IV, V, vi, vii^\circ$).
  * Renderização dinâmica das cifras correspondentes à tonalidade selecionada (ex: em $C$ Maior $\rightarrow$ $C$, $Dm$, $Em$, $F$, $G$, $Am$, $Bdim$).
  * Ao clicar em uma cifra do campo harmônico, o player emite a nota tônica ou o acorde de referência correspondente para o cantor testar a harmonia.
* **Controles do Player:**
  * Botão de reprodução contínua (*Sustain / Hold*) e modo *Press to Play* (toca apenas enquanto pressionado).
  * Controle individual de volume e fade-in/fade-out suave ao soltar para evitar estalos de áudio (*clicks/pops*).

### 3.4 Módulo Independente de Campo Harmônico (Visão Detalhada / Separada)
* **Objetivo:** Aba ou seção dedicada exclusivamente ao estudo e consulta rápida do Campo Harmônico, independente da sessão do player vocal.
* **Tonalidades & Modos:**
  * Seleção livre de Nota Tônica e Modo (Maior / Menor Natural / Menor Harmônica).
* **Visualização de Acordes & Graus:**
  * Tabela/Cards interativos contendo:
    * Graus da escala ($I, ii, iii, IV, V, vi, vii^\circ$).
    * Cifra do acorde triádico e tetrádico (ex: $Cmaj7$, $Dm7$, $Em7$, $Fmaj7$, $G7$, $Am7$, $Bm7(b5)$).
    * Notas formadoras do acorde (Tônica, Terça, Quinta, Sétima).
    * Funções harmônicas indicadas por cores ou tags (Tônica, Subdominante, Dominante).
* **Interatividade Sonora:**
  * Botão para ouvir o acorde sintetizado (arpejado ou bloco de notas via `OscillatorNode`).

---

## 4. Requisitos Opcionais / Futuros (Backlog Exploratório)

### 4.1 Criador de Ritmos / Sequenciador Simplificado (Draft)
> **Status:** *Em definição de regras (Não prioritário no MVP).*

* **Visão Inicial:**
  * Sequenciador estilo *Step Sequencer* de 8 ou 16 passos.
  * Seleção de kit mínimo de percussão sintetizada ou sintetizador básico (ex: Bumbo/Kick, Caixa/Snare, Chimbal/Hi-Hat, Clave).
  * Possibilidade de criar padrões rítmicos simples (Ex: Samba, Rock 4/4, Bossa Nova, Reggae) para acompanhar o estudo.
* **Atenção:** Manter o escopo desacoplado do motor principal do metrônomo para garantir modularidade.

---

## 5. Diretrizes de Arquitetura e Código

* **Gerenciamento de Estado Global & Lógica Musical:**
  * Criar um helper ou utilitário desacoplado `musicTheory.ts` responsável pelos cálculos de escalas, intervalos, construção de campo harmônico e mapeamento nota-para-frequência (Hz).
  * Manter o ciclo de vida do `AudioContext` isolado em Custom Hooks React (ex: `useAudioContext`, `useToneGenerator`, `useTuner`).
  * Tratar políticas de *Autoplay* dos navegadores modernos (o `AudioContext` deve ser iniciado/resumido apenas após interação do usuário).
* **Desempenho & UI:**
  * Evitar re-renderizações desnecessárias durante eventos contínuos de tempo e requisições de frame (`requestAnimationFrame` no afinador).
  * Design responsivo mobile (layout limpo com botões grandes e de fácil toque).
* **Sem Armazenamento:**
  * Não utilizar `localStorage`, `IndexedDB` nem cookies. Configurações voltam aos valores padrão ao recarregar a página.

---

## 6. Instruções para os Agentes de IA

1. **Priorização:** Implemente primeiro o utilitário musical (`musicTheory.ts`) e o motor Web Audio API antes das camadas de interface.
2. **Audio Performance:** Sempre aplique ganho zero via `GainNode` com rampa suave (`linearRampToValueAtTime` / `exponentialRampToValueAtTime`) antes de pausar ou desconectar osciladores para evitar ruídos de estalo (*clicks/pops*).
3. **Ergonomia e UX:**
   * O Afinador deve conter um *noise gate* simples/threshold de volume para ignorar ruídos de fundo fracos.
   * A interface do Campo Harmônico deve ser visualmente clara, destacando com facilidade os graus principais (Tônica, Subdominante, Dominante).
