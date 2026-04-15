'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AmazonLocale, MARKETPLACE } from '@/lib/marketplace';

export type Language = 'it' | 'en' | 'de' | 'fr' | 'es';

export interface LocaleData {
  language: Language;
  marketplace: AmazonLocale;
  currency: string;
  symbol: string;
  flag: string;
  label: string;
}

interface InternationalizationContextType {
  locale: LocaleData;
  setLocale: (locale: LocaleData) => void;
  t: (key: string) => string;
  /** Converte un prezzo base (EUR) con markup 20% — per prodotti singoli dal DB. */
  formatPrice: (basePrice: number) => string;
  /**
   * Converte un importo già-calcolato in EUR nella valuta corrente.
   * NON applica markup — usare per bundle, totali ordine, prezzi già processati.
   */
  convertPrice: (amountEur: number) => string;
  getExchangeRate: () => number;
}

const InternationalizationContext = createContext<InternationalizationContextType | undefined>(undefined);

// Tassi di cambio — derivati da lib/currency.ts (fonte autoritativa).
// Struttura: 1 EUR = rate [valuta del marketplace]
const EXCHANGE_RATES: Record<AmazonLocale, number> = {
  it: 1.00,   // EUR base
  de: 1.00,   // EUR
  fr: 1.00,   // EUR
  es: 1.00,   // EUR
  uk: 0.85,   // 1 EUR = £0.85
  us: 1.08,   // 1 EUR = $1.08
};

// Mappa lingua → marketplace
const LANGUAGE_TO_MARKETPLACE: Record<Language, AmazonLocale> = {
  it: 'it',
  en: 'us', // Default to US for English
  de: 'de',
  fr: 'fr',
  es: 'es',
};

// Simboli valuta
const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: '€',
  GBP: '£',
  USD: '$',
};

const DEFAULT_LOCALE: LocaleData = (() => {
  const defaultMarketplace = 'it' as AmazonLocale;
  const market = MARKETPLACE[defaultMarketplace];
  return {
    language: 'it',
    marketplace: defaultMarketplace,
    currency: market.currency,
    symbol: CURRENCY_SYMBOLS[market.currency],
    flag: market.flag,
    label: market.label,
  };
})();

export function InternationalizationProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<LocaleData>(DEFAULT_LOCALE);

  useEffect(() => {
    // Priority 1: preferenza salvata dall'utente
    const saved = localStorage.getItem('kitwer26-locale');
    if (saved) {
      try {
        const savedLocale: LocaleData = JSON.parse(saved);
        setLocale(savedLocale);
        document.documentElement.lang = savedLocale.language ?? 'en';
        return;
      } catch {
        console.warn('[i18n] Invalid locale in localStorage, falling back to geo detection');
      }
    }

    // Priority 2: geo detection server-side via /api/currency
    fetch('/api/currency')
      .then((r) => r.json())
      .then((data: { currency: string; locale: string; language: string; symbol: string; flag: string; label: string }) => {
        const marketplace = data.locale as AmazonLocale;
        if (!MARKETPLACE[marketplace]) return; // unknown locale — keep default
        const resolvedLocale: LocaleData = {
          language:    data.language as Language,
          marketplace,
          currency:    data.currency,
          symbol:      data.symbol,
          flag:        data.flag,
          label:       data.label,
        };
        setLocale(resolvedLocale);
        document.documentElement.lang = resolvedLocale.language ?? 'en';
      })
      .catch(() => {
        // Network error or server unavailable — keep default (EUR/it)
      });
  }, []);

  // Traduzioni di default (evitano flash di chiavi raw al primo render)
  const DEFAULT_TRANSLATIONS: Record<string, any> = {
    loading: 'CARICAMENTO...', loadMore: 'Carica altri', noProducts: 'Nessun prodotto trovato',
    shipping: 'SPEDIZIONE RAPIDA', support: 'SUPPORT', pricePending: '—',
    contactForAvailability: 'Contattaci per disponibilità',
    buyNow: '[ ACQUISTA ORA ]', addToCart: '[ ACQUISTA ]',
    buttons: { addToCart: '[ + CARRELLO ]', buyNow: '[ ACQUISTA ORA ]' },
    cart: 'Carrello', close: 'Chiudi', checkout: 'Checkout',
    emptyCart: 'Il carrello è vuoto', remove: 'Rimuovi', total: 'Totale',
  };

  // Carica traduzioni
  const [translations, setTranslations] = useState<Record<string, any>>(DEFAULT_TRANSLATIONS);

  useEffect(() => {
    const loadTranslations = async () => {
      try {
        const response = await fetch(`/locales/${locale.language}.json`);
        const data = await response.json();
        setTranslations(data.common);
      } catch (error) {
        console.error('Failed to load translations:', error);
        // Fallback to Italian
        const fallbackResponse = await fetch('/locales/it.json');
        const fallbackData = await fallbackResponse.json();
        setTranslations(fallbackData.common);
      }
    };

    loadTranslations();
  }, [locale.language]);

  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = translations;

    for (const k of keys) {
      value = value?.[k];
    }

    return value || key;
  };

  const getExchangeRate = (): number => {
    return EXCHANGE_RATES[locale.marketplace] || 1.0;
  };

  /** Arrotondamento psicologico retail: .90 o .99 */
  function psychologicalRound(value: number): number {
    const floor = Math.floor(value);
    if (floor + 0.90 >= value) return floor + 0.90;
    if (floor + 0.99 >= value) return floor + 0.99;
    return (floor + 1) + 0.90;
  }

  /** Separatore decimale per valuta: EUR usa virgola, GBP/USD usano punto. */
  function decimalSep(): string {
    return locale.currency === 'EUR' ? ',' : '.';
  }

  const formatPrice = (basePrice: number): string => {
    if (isNaN(basePrice) || basePrice <= 0) return t('pricePending');
    const raw    = basePrice * getExchangeRate() * 1.2; // exchange + 20% markup
    const rounded = psychologicalRound(raw);
    const [int, dec] = rounded.toFixed(2).split('.');
    return `${locale.symbol}${int}${decimalSep()}${dec}`;
  };

  const convertPrice = (amountEur: number): string => {
    if (isNaN(amountEur) || amountEur <= 0) return t('pricePending');
    const raw    = amountEur * getExchangeRate(); // solo exchange rate, nessun markup
    const rounded = psychologicalRound(raw);
    const [int, dec] = rounded.toFixed(2).split('.');
    return `${locale.symbol}${int}${decimalSep()}${dec}`;
  };

  const setLocaleWithStorage = (newLocale: LocaleData) => {
    setLocale(newLocale);
    localStorage.setItem('kitwer26-locale', JSON.stringify(newLocale));
  };

  return (
    <InternationalizationContext.Provider
      value={{
        locale,
        setLocale: setLocaleWithStorage,
        t,
        formatPrice,
        convertPrice,
        getExchangeRate,
      }}
    >
      {children}
    </InternationalizationContext.Provider>
  );
}

export function useIntl() {
  const context = useContext(InternationalizationContext);
  if (context === undefined) {
    throw new Error('useIntl must be used within an InternationalizationProvider');
  }
  return context;
}