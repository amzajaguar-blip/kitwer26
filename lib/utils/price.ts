/**
 * lib/utils/price.ts
 *
 * Utilità centralizzate per il calcolo e la formattazione dei prezzi.
 * Usare queste funzioni per garantire consistenza in tutto il progetto.
 */

/**
 * Tasso di cambio USD → EUR = 1 / EUR_RATES.USD (lib/currency.ts).
 * Con EUR_RATES.USD = 1.08 → USD_TO_EUR ≈ 0.9259.
 * Mantenuto per retrocompatibilità con applyMarkupFormula().
 */
export const USD_TO_EUR = 1 / 1.08; // ≈ 0.9259

/** Ricarico commerciale del 20% sul prezzo base */
export const MARKUP = 1.20;

/** @deprecated rimossa */
export const FLAT_FEE = 0;

/**
 * Parsa una stringa prezzo gestendo sia il formato italiano (virgola decimale)
 * che quello americano (punto decimale), restituendo sempre un numero valido.
 *
 * Esempi:
 *   "149,00"   → 149        (italiano: solo virgola)
 *   "319.99"   → 319.99     (americano: solo punto)
 *   "1.299,99" → 1299.99    (italiano: punto migliaia + virgola decimale)
 *   "1,299.99" → 1299.99    (americano: virgola migliaia + punto decimale)
 *   "$319.99"  → 319.99     (con simbolo valuta)
 */
export function parsePrice(input: string): number {
  if (!input || typeof input !== 'string') return NaN;

  // Rimuovi simboli valuta e spazi
  let cleaned = input.replace(/[€$£¥\s]/g, '').trim();
  if (!cleaned) return NaN;

  const hasComma = cleaned.includes(',');
  const hasDot   = cleaned.includes('.');

  if (hasComma && hasDot) {
    // Entrambi presenti: l'ultimo separatore è quello decimale
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot   = cleaned.lastIndexOf('.');
    if (lastComma > lastDot) {
      // Formato italiano: 1.299,99 → rimuovi punti migliaia, virgola → punto
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // Formato americano: 1,299.99 → rimuovi virgole migliaia
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (hasComma) {
    // Solo virgola: separatore decimale italiano (149,00)
    cleaned = cleaned.replace(',', '.');
  }
  // Solo punto o nessuno: già formato americano/numerico — nessuna modifica

  const value = parseFloat(cleaned);
  return isNaN(value) || value < 0 ? NaN : value;
}

/**
 * Applica la formula TITAN v2: Math.ceil(basePrice × 1.20) + 0.90.
 * Garantisce sempre margine ≥ 20% con arrotondamento per ECCESSO.
 * Se la valuta è USD converte prima in EUR (× USD_TO_EUR ≈ 0.926).
 *
 * Esempi: 175€ → 210.90 | 129€ → 155.90 | 249€ → 299.90
 *
 * @param basePrice - Prezzo Amazon base
 * @param currency  - Valuta ('EUR' | 'USD'). Default: 'EUR'
 * @returns Prezzo finale, NaN se input non valido
 */
export function applyMarkupFormula(basePrice: number, currency = 'EUR'): number {
  if (isNaN(basePrice) || basePrice <= 0) return NaN;

  const inEur = currency.toUpperCase() === 'USD'
    ? basePrice * USD_TO_EUR
    : basePrice;

  return Math.ceil(inEur * MARKUP) + 0.90;
}

/**
 * Arrotondamento psicologico: sceglie il più piccolo tra N.90 e N.99
 * che sia ≥ al valore di ingresso. Garantisce sempre un look da prezzo retail.
 *
 * Esempi: 48.2 → 48.90 | 48.91 → 48.99 | 48.997 → 49.90
 */
function commercialRound(value: number): number {
  const floor = Math.floor(value);
  if (floor + 0.90 >= value) return floor + 0.90;
  if (floor + 0.99 >= value) return floor + 0.99;
  return (floor + 1) + 0.90; // decimali > .99 (raro ma gestito)
}

/** Separatore decimale per lingua */
const DECIMAL_SEP: Record<string, string> = {
  it: ',', de: ',', fr: ',', es: ',', en: '.',
};

/**
 * Formatta un prezzo con arrotondamento psicologico (.90 o .99) e
 * il simbolo valuta corretto in base alla lingua dell'utente.
 *
 * @param amount   - Importo già con markup applicato
 * @param symbol   - Simbolo valuta ('€', '£', '$'). Default: '€'
 * @param language - Codice lingua ('it', 'en', 'de', 'fr', 'es'). Default: 'it'
 * @returns Stringa formattata es. "€319,99" oppure "" se importo non valido
 */
/** Formattatore EUR condiviso — istanziato una volta sola a livello modulo */
const EUR_FORMATTER = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });

/**
 * Formatta un numero come valuta EUR (es. "€89,00").
 * @returns Stringa formattata o `null` se il prezzo non è valido.
 */
export function formatEur(price: number): string | null {
  if (!price || price <= 0) return null;
  return EUR_FORMATTER.format(price);
}

export function formatPremiumPrice(
  amount: number,
  symbol = '€',
  language = 'it',
): string {
  if (isNaN(amount) || amount <= 0) return '';

  const rounded = commercialRound(amount);
  const sep     = DECIMAL_SEP[language] ?? ',';
  const [intPart, decPart] = rounded.toFixed(2).split('.');

  return `${symbol}${intPart}${sep}${decPart}`;
}
