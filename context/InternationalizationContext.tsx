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
  formatPrice: (basePrice: number) => string;
  getExchangeRate: () => number;
}

const InternationalizationContext = createContext<InternationalizationContextType | undefined>(undefined);

// Tassi di cambio fissi (aggiornati periodicamente)
const EXCHANGE_RATES: Record<AmazonLocale, number> = {
  it: 1.0,    // EUR base
  de: 1.0,    // EUR
  fr: 1.0,    // EUR
  es: 1.0,    // EUR
  uk: 0.85,   // GBP → EUR
  us: 1.08,   // USD → EUR
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
    const saved = localStorage.getItem('kitwer26-locale');
    if (saved) {
      try {
        setLocale(JSON.parse(saved));
      } catch (e) {
        console.warn('Invalid locale in localStorage, using default');
      }
    }
  }, []);

  // Carica traduzioni
  const [translations, setTranslations] = useState<Record<string, any>>({});

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

  const formatPrice = (basePrice: number): string => {
    if (isNaN(basePrice) || basePrice <= 0) return t('pricePending');

    // Applica tasso di cambio + ricarico 20%
    const exchangedPrice = basePrice * getExchangeRate();
    const finalPrice = exchangedPrice * 1.2; // +20% markup

    return `${locale.symbol}${finalPrice.toFixed(2).replace('.', ',')}`;
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