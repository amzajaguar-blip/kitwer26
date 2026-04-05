'use client';

import { useIntl, LocaleData } from '@/context/InternationalizationContext';

// ── Minimal currency presets (no full locale switch — just EUR/GBP/USD) ────────
const CURRENCY_PRESETS: Record<string, LocaleData> = {
  EUR: {
    language:    'it',
    marketplace: 'it',
    currency:    'EUR',
    symbol:      '€',
    flag:        '🇮🇹',
    label:       'Italia',
  },
  USD: {
    language:    'en',
    marketplace: 'us',
    currency:    'USD',
    symbol:      '$',
    flag:        '🇺🇸',
    label:       'USA',
  },
  GBP: {
    language:    'en',
    marketplace: 'uk',
    currency:    'GBP',
    symbol:      '£',
    flag:        '🇬🇧',
    label:       'UK',
  },
};

const CURRENCIES = ['EUR', 'USD', 'GBP'] as const;

/**
 * CurrencyToggle — Minimal stealth 3-pill selector.
 * Designed for the footer. Updates InternationalizationContext globally.
 * All price displays using convertPrice() / formatPrice() react instantly.
 */
export default function CurrencyToggle() {
  const { locale, setLocale } = useIntl();
  const active = locale.currency as string;

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="font-mono text-[8px] tracking-[0.45em] text-th-subtle uppercase select-none">
        CURRENCY
      </span>

      <div
        role="group"
        aria-label="Select currency"
        className="flex items-center border border-zinc-800 divide-x divide-zinc-800"
      >
        {CURRENCIES.map((code) => {
          const isActive = active === code;
          const preset   = CURRENCY_PRESETS[code];

          return (
            <button
              key={code}
              onClick={() => setLocale(preset)}
              aria-pressed={isActive}
              aria-label={`Switch to ${code}`}
              className={[
                'px-4 py-1.5 font-mono text-[11px] font-medium tracking-widest transition-colors',
                isActive
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-th-subtle hover:text-white hover:bg-zinc-900',
              ].join(' ')}
            >
              {preset.symbol}
            </button>
          );
        })}
      </div>
    </div>
  );
}
