/**
 * KITWER26 — Configurazione Marketplace Amazon Internazionali
 *
 * Mappa ogni locale → dominio Amazon + tag affiliazione + valuta Stripe.
 * Usato sia server-side (checkout API) sia client-side (admin panel).
 * I tag sono NEXT_PUBLIC_ perché già visibili in ogni URL affiliato del sito.
 */

export type AmazonLocale = 'it' | 'de' | 'fr' | 'es' | 'uk' | 'us';

export interface MarketplaceEntry {
  domain:   string;
  tag:      string;
  currency: 'EUR' | 'GBP' | 'USD';
  flag:     string;
  label:    string;
}

export const MARKETPLACE: Record<AmazonLocale, MarketplaceEntry> = {
  it: {
    domain:   'www.amazon.it',
    tag:      process.env.NEXT_PUBLIC_AMAZON_TAG_IT ?? 'kitwer26-21',
    currency: 'EUR',
    flag:     '🇮🇹',
    label:    'Italia',
  },
  de: {
    domain:   'www.amazon.de',
    tag:      process.env.NEXT_PUBLIC_AMAZON_TAG_DE ?? 'kitwer2609-21',
    currency: 'EUR',
    flag:     '🇩🇪',
    label:    'Germania',
  },
  fr: {
    domain:   'www.amazon.fr',
    tag:      process.env.NEXT_PUBLIC_AMAZON_TAG_FR ?? 'kitwer260f-21',
    currency: 'EUR',
    flag:     '🇫🇷',
    label:    'Francia',
  },
  es: {
    domain:   'www.amazon.es',
    tag:      process.env.NEXT_PUBLIC_AMAZON_TAG_ES ?? 'kitwer2600-21',
    currency: 'EUR',
    flag:     '🇪🇸',
    label:    'Spagna',
  },
  uk: {
    domain:   'www.amazon.co.uk',
    tag:      process.env.NEXT_PUBLIC_AMAZON_TAG_UK ?? 'kitwer2606-21',
    currency: 'GBP',
    flag:     '🇬🇧',
    label:    'UK',
  },
  us: {
    domain:   'www.amazon.com',
    tag:      process.env.NEXT_PUBLIC_AMAZON_TAG_US ?? 'kitwer26-20',
    currency: 'USD',
    flag:     '🇺🇸',
    label:    'USA',
  },
};

/**
 * Costruisce l'URL affiliato corretto per un ASIN sul marketplace indicato.
 * Esempio: buildAffiliateUrl('B0XXXXXXXX', 'uk')
 *   → 'https://www.amazon.co.uk/dp/B0XXXXXXXX?tag=kitwer2606-21'
 */
export function buildAffiliateUrl(asin: string, locale: AmazonLocale): string {
  const { domain, tag } = MARKETPLACE[locale];
  return `https://${domain}/dp/${asin}?tag=${tag}`;
}

/**
 * Estrae l'ASIN da un URL Amazon qualsiasi (amazon.it, amazon.com, ecc.)
 * Ritorna null se l'URL non contiene un ASIN valido.
 */
export function extractAsinFromUrl(url: string): string | null {
  const match = url.match(/\/dp\/([A-Z0-9]{10})(?:[/?#]|$)/i);
  return match ? match[1].toUpperCase() : null;
}

/**
 * Genera un URL di ricerca Amazon con tag affiliazione come fallback sicuro.
 * Non dà mai errore 404 — mostra prodotti simili se l'ASIN non esiste.
 * Esempio: buildSearchUrl('Ledger Nano X', 'it')
 *   → 'https://www.amazon.it/s?k=Ledger+Nano+X&tag=kitwer26-21'
 */
export function buildSearchUrl(productName: string, locale: AmazonLocale): string {
  const { domain, tag } = MARKETPLACE[locale];
  const query = encodeURIComponent(productName.trim().slice(0, 100));
  return `https://${domain}/s?k=${query}&tag=${tag}`;
}

/**
 * Verifica se il link /dp/ASIN risponde con HTTP ≠ 404.
 * Timeout: 3 secondi. In caso di errore / timeout / blocco → assume valido (true).
 * Ritorna false SOLO se Amazon conferma HTTP 404 (prodotto non trovato / ASIN inesistente).
 */
export async function isAsinReachable(asin: string, locale: AmazonLocale): Promise<boolean> {
  const url = buildAffiliateUrl(asin, locale);
  try {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000);
    const res   = await fetch(url, {
      method:   'HEAD',
      redirect: 'follow',
      signal:   ctrl.signal,
      headers: {
        'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
      },
    });
    clearTimeout(timer);
    // Solo HTTP 404 conferma ASIN inesistente — tutti gli altri stati (200, 301, 403, 503)
    // vengono trattati come "valido" per evitare falsi negativi da bot-blocking Amazon
    return res.status !== 404;
  } catch {
    // Timeout, errore di rete, o blocco da Amazon → assume valido
    return true;
  }
}
