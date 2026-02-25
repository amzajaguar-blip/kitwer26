/**
 * product-template.ts
 * ────────────────────
 * Schema standard per la creazione di nuove descrizioni prodotto Kitwer26.
 *
 * Istruzioni:
 *   1. Copia il blocco `templateProduct` e compila tutti i campi.
 *   2. Usa `generateDescription(template)` per generare la descrizione finale.
 *   3. Incolla il risultato nel campo `description` del seed o dell'admin panel.
 */

// ─── Struttura template ───────────────────────────────────────────────────────

export interface ProductDescriptionTemplate {
  /** Problema che risolve il prodotto  (max 15 parole) */
  hook_problem: string

  /** Soluzione offerta dal prodotto    (max 15 parole) */
  hook_solution: string

  /** Caratteristiche tecniche chiave (3–5 bullet) */
  features: Array<{
    label: string    // es. "Sensore HERO 2"
    value: string    // es. "44.000 DPI per tracking assoluto"
  }>

  /** Perché sceglierlo per il proprio setup (1 frase, max 25 parole) */
  why_choose: string

  /** Target principale: 'gamer' | 'streamer' | 'creator' | 'pro' | 'budget' */
  target: 'gamer' | 'streamer' | 'creator' | 'pro' | 'budget'
}

// ─── Generatore testo ─────────────────────────────────────────────────────────

const TARGET_LABELS: Record<ProductDescriptionTemplate['target'], string> = {
  gamer:   'i gamer competitivi',
  streamer:'gli streamer professionisti',
  creator: 'i content creator',
  pro:     'i pro player esport',
  budget:  'chi vuole qualità senza compromettere il budget',
}

export function generateDescription(t: ProductDescriptionTemplate): string {
  const featureBullets = t.features
    .map(f => `${f.label}: ${f.value}`)
    .join('. ')

  return (
    `${t.hook_problem}? ${t.hook_solution}. ` +
    `${featureBullets}. ` +
    `${t.why_choose} — la scelta ideale per ${TARGET_LABELS[t.target]}.`
  )
}

// ─── ESEMPI COMPILATI ─────────────────────────────────────────────────────────

/**
 * ESEMPIO 1 — Mouse gaming
 */
export const EXAMPLE_MOUSE: ProductDescriptionTemplate = {
  hook_problem:  'Perdi colpi per latenza o imprecisione del sensore',
  hook_solution: 'Il sensore HERO 2 a 44K DPI elimina ogni esitazione',
  features: [
    { label: 'Peso',           value: 'solo 60g — il più leggero della categoria' },
    { label: 'Polling rate',   value: '2000Hz per input ultra-reattivi' },
    { label: 'Batteria',       value: '95 ore di autonomia wireless' },
    { label: 'Switch',         value: 'LIGHTFORCE ibridi ottici/meccanici' },
  ],
  why_choose: 'Usato dai pro player nelle major internazionali esport',
  target: 'pro',
}

/**
 * ESEMPIO 2 — Microfono streaming
 */
export const EXAMPLE_MIC: ProductDescriptionTemplate = {
  hook_problem:  'Audio rauco o troppo rumoroso durante i tuoi stream',
  hook_solution: 'La tecnologia Clipguard a doppio condensatore garantisce voce cristallina',
  features: [
    { label: 'Pattern polare', value: 'cardioide — isola la voce dal rumore ambientale' },
    { label: 'Qualità',        value: '96kHz/24bit — broadcast broadcast-grade' },
    { label: 'Controllo',      value: 'Mixer Wave Link integrato per bilanciare sorgenti' },
    { label: 'Plug & Play',    value: 'USB-C, nessun driver richiesto' },
  ],
  why_choose: 'Setup completo in 30 secondi — basta collegare e premere rec',
  target: 'streamer',
}

/**
 * ESEMPIO 3 — Monitor 144Hz budget
 */
export const EXAMPLE_MONITOR: ProductDescriptionTemplate = {
  hook_problem:  'Il tuo monitor limita le tue performance in game',
  hook_solution: 'L\'IPS 144Hz trasforma ogni partita in un\'esperienza fluida',
  features: [
    { label: 'Refresh rate',   value: '144Hz — movimenti sullo schermo senza ghosting' },
    { label: 'Pannello',       value: 'IPS con angoli di visione 178°' },
    { label: 'Risposta',       value: '1ms MPRT per inseguire ogni target' },
    { label: 'Compatibilità',  value: 'FreeSync Premium + G-Sync compatible' },
  ],
  why_choose: 'Il miglior punto di ingresso nel gaming fluido senza sacrificare la qualità',
  target: 'budget',
}

// ─── SCHEMA VUOTO DA COPIARE ──────────────────────────────────────────────────

/**
 * ┌───────────────────────────────────────────────────────────────────────────┐
 * │  TEMPLATE VUOTO — copia, compila e usa generateDescription()              │
 * └───────────────────────────────────────────────────────────────────────────┘
 *
 * export const NEW_PRODUCT: ProductDescriptionTemplate = {
 *   hook_problem:  'PROBLEMA CHE IL PRODOTTO RISOLVE',
 *   hook_solution: 'COME IL PRODOTTO LO RISOLVE',
 *   features: [
 *     { label: 'Feature 1', value: 'Valore tecnico + beneficio' },
 *     { label: 'Feature 2', value: 'Valore tecnico + beneficio' },
 *     { label: 'Feature 3', value: 'Valore tecnico + beneficio' },
 *   ],
 *   why_choose: 'MOTIVAZIONE SETUP-SPECIFICA IN UNA FRASE',
 *   target: 'gamer', // gamer | streamer | creator | pro | budget
 * }
 *
 * const description = generateDescription(NEW_PRODUCT)
 * console.log(description)
 */

// ─── Quick test ───────────────────────────────────────────────────────────────
if (process.argv[1] === new URL(import.meta.url).pathname) {
  console.log('\n── ESEMPIO OUTPUT MOUSE ──')
  console.log(generateDescription(EXAMPLE_MOUSE))

  console.log('\n── ESEMPIO OUTPUT MICROFONO ──')
  console.log(generateDescription(EXAMPLE_MIC))

  console.log('\n── ESEMPIO OUTPUT MONITOR ──')
  console.log(generateDescription(EXAMPLE_MONITOR))
}
