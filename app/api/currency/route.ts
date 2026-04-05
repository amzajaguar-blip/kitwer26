import { NextRequest, NextResponse } from 'next/server';
import {
  detectCurrencyFromRequest,
  EUR_RATES,
  CURRENCY_SYMBOLS,
  type SupportedCurrency,
} from '@/lib/currency';
import { MARKETPLACE, type AmazonLocale } from '@/lib/marketplace';

// Currency → marketplace locale mapping
const CURRENCY_TO_LOCALE: Record<SupportedCurrency, AmazonLocale> = {
  EUR: 'it', // EUR default → Italian storefront
  GBP: 'uk',
  USD: 'us',
};

// Language code for the locale (used by the i18n context)
const LOCALE_TO_LANGUAGE: Record<AmazonLocale, string> = {
  it: 'it', de: 'de', fr: 'fr', es: 'es',
  uk: 'en', us: 'en',
};

/**
 * GET /api/currency
 *
 * Rileva la valuta e il marketplace dell'utente tramite geo IP (Vercel/CF headers)
 * con fallback su Accept-Language. Usato dal client al primo caricamento
 * (quando non c'è una preferenza salvata in localStorage).
 *
 * Response:
 *   { currency, locale, language, symbol, rate, flag, label }
 *
 * Cache: private, 1 ora (varia per utente — dipende dall'IP).
 */
export async function GET(req: NextRequest) {
  const currency = detectCurrencyFromRequest(req);
  const locale   = CURRENCY_TO_LOCALE[currency];
  const market   = MARKETPLACE[locale];

  return NextResponse.json(
    {
      currency,                          // 'EUR' | 'GBP' | 'USD'
      locale,                            // AmazonLocale: 'it' | 'uk' | 'us' | ...
      language: LOCALE_TO_LANGUAGE[locale], // 'it' | 'en' | 'de' | 'fr' | 'es'
      symbol:   CURRENCY_SYMBOLS[currency], // '€' | '£' | '$'
      rate:     EUR_RATES[currency],        // 1 EUR = rate [currency]
      flag:     market.flag,
      label:    market.label,
    },
    {
      headers: {
        // private: non cacheable dai CDN — ogni utente ottiene la propria valuta
        'Cache-Control': 'private, max-age=3600',
      },
    },
  );
}
