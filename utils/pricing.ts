/** Ricarico applicato al prezzo base Amazon (20%). */
export const MARKUP = 1.2;

/**
 * Calcola il prezzo finale con ricarico del 20%, arrotondato a 2 decimali.
 * Usare SEMPRE questa funzione per visualizzare prezzi o calcolare totali.
 * @deprecated Usa useIntl().formatPrice() per prezzi internazionalizzati
 */
export const getMarkupPrice = (basePrice: number): number =>
  Math.round(basePrice * MARKUP * 100) / 100;

import type { AmazonLocale } from '@/lib/marketplace';
import { MARKETPLACE } from '@/lib/marketplace';

/**
 * Rileva il marketplace Amazon dell'utente in base al fuso orario e alla lingua del browser.
 * Ritorna il locale Amazon corrispondente (it, de, fr, es, uk, us).
 */
export function detectMarketplace(): AmazonLocale {
  if (typeof window === 'undefined') return 'it';
  const tz   = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const lang = navigator.language;

  const GB_ZONES = ['Europe/London', 'Europe/Belfast', 'Europe/Guernsey', 'Europe/Isle_of_Man', 'Europe/Jersey'];
  if (GB_ZONES.includes(tz) || lang.startsWith('en-GB')) return 'uk';
  if (tz.startsWith('America/') || tz.startsWith('US/') || lang === 'en-US') return 'us';
  if (lang.startsWith('de') || tz === 'Europe/Berlin' || tz === 'Europe/Vienna' || tz === 'Europe/Zurich') return 'de';
  if (lang.startsWith('fr') || tz === 'Europe/Paris'  || tz === 'Europe/Brussels') return 'fr';
  if (lang.startsWith('es') || tz === 'Europe/Madrid') return 'es';
  return 'it';
}

/**
 * Ritorna la valuta Stripe corretta derivandola dal marketplace rilevato.
 */
export function detectCurrency(): 'EUR' | 'GBP' | 'USD' {
  return MARKETPLACE[detectMarketplace()].currency;
}
