/**
 * lib/currency.ts — Global Currency Engine (Single Source of Truth)
 *
 * Tutte le rate di cambio, la rilevazione server-side e la conversione
 * devono passare da qui. Non usare tassi sparsi in altri file.
 *
 * Base currency: EUR (tutti i prezzi nel DB sono in EUR).
 * Aggiornare EUR_RATES ogni trimestre.
 */

import { NextRequest } from 'next/server';

// ── Types ──────────────────────────────────────────────────────────────────────

export type SupportedCurrency = 'EUR' | 'GBP' | 'USD';

export interface CurrencyInfo {
  currency: SupportedCurrency;
  symbol:   string;
  rate:     number; // 1 EUR = rate [currency]
}

// ── Exchange Rates — 1 EUR = X [currency] ─────────────────────────────────────
// Aggiornare se la fluttuazione supera il 3% rispetto al valore corrente.

export const EUR_RATES: Record<SupportedCurrency, number> = {
  EUR: 1.00,
  GBP: 0.85,  // 1 EUR ≈ £0.85
  USD: 1.08,  // 1 EUR ≈ $1.08
};

export const CURRENCY_SYMBOLS: Record<SupportedCurrency, string> = {
  EUR: '€',
  GBP: '£',
  USD: '$',
};

// ── Geo Detection Maps ─────────────────────────────────────────────────────────

// ISO 3166-1 alpha-2 → currency (aggiungere paesi se si apre un nuovo mercato)
const COUNTRY_TO_CURRENCY: Record<string, SupportedCurrency> = {
  GB: 'GBP',
  US: 'USD', CA: 'USD', AU: 'USD', NZ: 'USD',
  SG: 'USD', HK: 'USD', PH: 'USD', MY: 'USD',
};

// Accept-Language BCP-47 prefix → currency (fallback se il geo non è disponibile)
const LANG_PREFIX_TO_CURRENCY: Array<[string, SupportedCurrency]> = [
  ['en-GB', 'GBP'],
  ['en-US', 'USD'],
  ['en-CA', 'USD'],
  ['en-AU', 'USD'],
  ['en-NZ', 'USD'],
];

// ── Server-Side Detection ──────────────────────────────────────────────────────

/**
 * Rileva la valuta corretta dall'IP/geo dell'utente tramite gli header
 * di Vercel (x-vercel-ip-country) o Cloudflare (cf-ipcountry).
 * Fallback progressivo: geo → Accept-Language → EUR.
 */
export function detectCurrencyFromRequest(req: NextRequest): SupportedCurrency {
  // Priority 1: Vercel edge geo (affidabile in produzione su Vercel)
  const country = (
    req.headers.get('x-vercel-ip-country') ??
    req.headers.get('cf-ipcountry') ??
    ''
  ).toUpperCase().trim();

  if (country && COUNTRY_TO_CURRENCY[country]) {
    return COUNTRY_TO_CURRENCY[country];
  }

  // Priority 2: Accept-Language header (disponibile su tutti i browser)
  const acceptLang = (req.headers.get('accept-language') ?? '').toLowerCase();
  for (const [prefix, currency] of LANG_PREFIX_TO_CURRENCY) {
    if (acceptLang.startsWith(prefix.toLowerCase())) {
      return currency;
    }
  }

  // Default: EUR (mercato principale)
  return 'EUR';
}

// ── Price Conversion ───────────────────────────────────────────────────────────

/**
 * Converte un importo da EUR alla valuta target con arrotondamento psicologico.
 * Il risultato è sempre in formato .90 o .99 per massimizzare la conversione.
 *
 * Esempi (EUR → USD, rate 1.08):
 *   100 EUR → 108.00 → 107.99
 *   150 EUR → 162.00 → 161.99
 */
export function convertFromEur(amountEur: number, currency: SupportedCurrency): number {
  if (currency === 'EUR') return amountEur;
  const raw = amountEur * EUR_RATES[currency];
  return psychologicalRound(raw);
}

/**
 * Converte un importo nella valuta data in EUR (per normalizzazione interna).
 */
export function convertToEur(amount: number, currency: SupportedCurrency): number {
  if (currency === 'EUR') return amount;
  return amount / EUR_RATES[currency];
}

/**
 * Arrotondamento psicologico retail: il prezzo più basso tra N.90 e N.99
 * che sia ≥ al valore di ingresso. Identica logica di lib/utils/price.ts.
 */
function psychologicalRound(value: number): number {
  const floor = Math.floor(value);
  if (floor + 0.90 >= value) return floor + 0.90;
  if (floor + 0.99 >= value) return floor + 0.99;
  return (floor + 1) + 0.90;
}

/**
 * Formatta un importo già convertito con il simbolo valuta corretto.
 * Usa il punto decimale per USD/GBP, la virgola per EUR.
 */
export function formatCurrencyAmount(
  amount: number,
  currency: SupportedCurrency,
): string {
  const symbol = CURRENCY_SYMBOLS[currency];
  const sep    = currency === 'EUR' ? ',' : '.';
  const [int, dec] = amount.toFixed(2).split('.');
  return `${symbol}${int}${sep}${dec}`;
}
