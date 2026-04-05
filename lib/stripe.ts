/**
 * lib/stripe.ts — Stripe Client + International Tax Compliance Engine
 *
 * API Version: 2026-01-28 (pinned — non aggiornare senza testare breaking changes).
 *
 * Stripe Tax gestisce automaticamente (attivare in Dashboard → Tax → Get started):
 *   EU IVA       → OSS/MOSS rules, rate per paese (IT 22%, DE 19%, FR 20%…)
 *   UK VAT       → 20% standard rate (regime post-Brexit separato dall'UE)
 *   US Sales Tax → nexus-based, configurare soglie in Dashboard → Tax → Registrations
 *
 * Setup obbligatorio in Stripe Dashboard:
 *   1. Tax → Get started → Enable Stripe Tax
 *   2. Tax → Registrations → aggiungere IT, GB, e nexus USA se spedisci negli USA
 *   3. Impostare country nel Stripe account settings (IT se sei italiano)
 */

import Stripe from 'stripe';
import type { AmazonLocale } from '@/lib/marketplace';

/**
 * Versione API Stripe pinned.
 * SDK installato: ^16.x → usa formato date-only senza release name.
 * '2026-01-28.clover' è formato SDK v17+ — incompatibile con v16, causa StripeConnectionError.
 * Per aggiornare: bump stripe a ^17.x in package.json, poi usare la nuova LatestApiVersion.
 */
export const STRIPE_API_VERSION = '2024-06-20' as Stripe.LatestApiVersion;

// ── Singleton (lazy init — evita crash a cold start se env manca) ─────────────

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    // ── TASK 1: Fail-Fast — chiave mancante → errore immediato, nessun retry ──
    const key = process.env.STRIPE_SECRET_KEY?.trim();
    if (!key) {
      console.error('[STRIPE CRITICAL] STRIPE_SECRET_KEY mancante o vuota — aggiungere su Vercel env vars');
      throw new Error('[stripe] STRIPE_SECRET_KEY mancante');
    }

    // ── TASK 2: Inizializzazione blindata SDK ─────────────────────────────────
    _stripe = new Stripe(key, {
      apiVersion: STRIPE_API_VERSION,
      // timeout esplicito: evita che Vercel (10s limit) venga raggiunto prima
      // che l'SDK abbia il tempo di ricevere l'errore e ri-tentare
      timeout: 8000,
      // 1 retry automatico su connection error (default), lo rendiamo esplicito
      maxNetworkRetries: 1,
      appInfo: {
        name:    'KITWER26',
        version: '1.0.0',
        url:     'https://www.kitwer26.com',
      },
    });
  }
  return _stripe;
}

// ── Tax Regime ────────────────────────────────────────────────────────────────

export type TaxRegime = 'EU_IVA' | 'UK_VAT' | 'US_SALES_TAX' | 'EXEMPT';

/** ISO 3166-1 alpha-2 EU member state codes */
const EU_COUNTRIES = new Set([
  'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE',
  'GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT',
  'RO','SK','SI','ES','SE',
]);

/**
 * Determina il regime fiscale dal codice paese ISO 3166-1 alpha-2.
 * Usato per audit logging — la tassazione reale è delegata a Stripe Tax.
 */
export function detectTaxRegime(countryCode: string): TaxRegime {
  const cc = countryCode.toUpperCase().trim();
  if (cc === 'GB')              return 'UK_VAT';
  if (EU_COUNTRIES.has(cc))    return 'EU_IVA';
  if (cc === 'US')              return 'US_SALES_TAX';
  return 'EXEMPT';
}

// ── Mappings ──────────────────────────────────────────────────────────────────

/** Amazon locale → ISO 3166-1 alpha-2 country code */
export const LOCALE_TO_COUNTRY: Record<AmazonLocale, string> = {
  it: 'IT', de: 'DE', fr: 'FR', es: 'ES', uk: 'GB', us: 'US',
};

/** Amazon locale → Stripe locale for Checkout UI */
export const LOCALE_TO_STRIPE_LOCALE: Record<AmazonLocale, string> = {
  it: 'it', de: 'de', fr: 'fr', es: 'es', uk: 'en-GB', us: 'en',
};

/**
 * Tax code Stripe per prodotti KITWER26 (security hardware, electronics).
 * txcd_34021000 = Electronics, Computers & Accessories
 * Riferimento: https://stripe.com/docs/tax/tax-codes
 */
export const KITWER26_TAX_CODE = 'txcd_34021000' as const;

/**
 * Paesi abilitati per la raccolta indirizzo di spedizione.
 * Estendere quando si apre un nuovo mercato.
 */
export const ALLOWED_SHIPPING_COUNTRIES = [
  // UE
  'IT','DE','FR','ES','AT','BE','NL','PT','SE','DK','FI',
  'PL','CZ','HU','RO','SK','SI','EE','LV','LT','LU','MT',
  'CY','IE','GR','HR','BG',
  // UK (regime VAT separato post-Brexit)
  'GB',
  // Export extra-UE
  'US','CA','AU','NZ','SG','HK',
] as const;
