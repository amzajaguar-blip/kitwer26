'use client';

import { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useIntl, LocaleData } from '@/context/InternationalizationContext';
import { MARKETPLACE, AmazonLocale } from '@/lib/marketplace';

const AVAILABLE_LOCALES: LocaleData[] = [
  {
    language: 'it',
    marketplace: 'it',
    currency: 'EUR',
    symbol: '€',
    flag: '🇮🇹',
    label: 'Italia',
  },
  {
    language: 'en',
    marketplace: 'us',
    currency: 'USD',
    symbol: '$',
    flag: '🇺🇸',
    label: 'USA',
  },
  {
    language: 'en',
    marketplace: 'uk',
    currency: 'GBP',
    symbol: '£',
    flag: '🇬🇧',
    label: 'UK',
  },
  {
    language: 'de',
    marketplace: 'de',
    currency: 'EUR',
    symbol: '€',
    flag: '🇩🇪',
    label: 'Deutschland',
  },
  {
    language: 'fr',
    marketplace: 'fr',
    currency: 'EUR',
    symbol: '€',
    flag: '🇫🇷',
    label: 'France',
  },
  {
    language: 'es',
    marketplace: 'es',
    currency: 'EUR',
    symbol: '€',
    flag: '🇪🇸',
    label: 'España',
  },
];

export default function LocaleSelector() {
  const { locale, setLocale, t } = useIntl();
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (newLocale: LocaleData) => {
    setLocale(newLocale);
    setIsOpen(false);
    // Salva nel localStorage
    localStorage.setItem('kitwer26-locale', JSON.stringify(newLocale));
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 h-8 rounded-sm font-mono text-[11px] font-medium tracking-wide text-th-subtle border border-zinc-700/60 hover:border-cyan-500/50 hover:text-white transition-all active:scale-95 min-h-[44px]"
        aria-label={t('selectLanguage')}
      >
        <span className="text-base" role="img" aria-label={locale.label}>
          {locale.flag}
        </span>
        <span className="hidden sm:inline">{locale.label}</span>
        <span className="text-th-subtle">{locale.symbol}</span>
        <ChevronDown
          size={12}
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute left-0 top-full mt-1 z-50 w-48 bg-zinc-900 border border-zinc-700/60 rounded-sm shadow-xl">
            {AVAILABLE_LOCALES.map((option) => (
              <button
                key={`${option.language}-${option.marketplace}`}
                onClick={() => handleSelect(option)}
                className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-zinc-800 transition-colors first:rounded-t-sm last:rounded-b-sm"
              >
                <span className="text-base" role="img" aria-label={option.label}>
                  {option.flag}
                </span>
                <span className="font-mono text-[11px] text-th-subtle flex-1">
                  {option.label}
                </span>
                <span className="font-mono text-[11px] text-th-subtle">
                  {option.symbol}
                </span>
                {locale.marketplace === option.marketplace && locale.language === option.language && (
                  <Check size={12} className="text-cyan-400" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}