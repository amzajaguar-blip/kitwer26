'use client';
/**
 * @module ProductRating
 * Stelle di valutazione dinamiche con riempimento parziale (0–5).
 * Stile: cyan neon su fondo dark — coerente con il tema cyberpunk Kitwer26.
 *
 * Props:
 *   rating      — numero float 0–5 (es. 4.3)
 *   reviewCount — numero recensioni opzionale (es. 1248)
 *   size        — 'sm' | 'md' (default 'sm')
 *   showCount   — mostra il contatore recensioni (default true)
 */

import React from 'react';

interface ProductRatingProps {
  rating:      number;
  reviewCount?: number;
  size?:        'sm' | 'md';
  showCount?:   boolean;
}

const STAR_PATH =
  'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z';

const COLOR_ACTIVE  = '#22D3EE'; // cyan neon
const COLOR_EMPTY   = '#27272a'; // zinc-800

/** Una singola stella con riempimento percentuale via clip CSS. */
function Star({ fill, sizePx }: { fill: number; sizePx: number }) {
  // fill: 0.0 → vuota, 1.0 → piena, 0.5 → mezza
  const pct = Math.max(0, Math.min(1, fill)) * 100;

  return (
    <span
      style={{ position: 'relative', display: 'inline-block', width: sizePx, height: sizePx, flexShrink: 0 }}
      aria-hidden="true"
    >
      {/* Stella vuota (sfondo) */}
      <svg
        width={sizePx} height={sizePx}
        viewBox="0 0 24 24"
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        <path d={STAR_PATH} fill={COLOR_EMPTY} />
      </svg>

      {/* Stella piena ritagliata a pct% */}
      <span
        style={{
          position: 'absolute', top: 0, left: 0,
          overflow: 'hidden',
          width: `${pct}%`,
          height: '100%',
          display: 'block',
        }}
      >
        <svg width={sizePx} height={sizePx} viewBox="0 0 24 24">
          <path d={STAR_PATH} fill={COLOR_ACTIVE} />
        </svg>
      </span>
    </span>
  );
}

export default function ProductRating({
  rating,
  reviewCount,
  size      = 'sm',
  showCount = true,
}: ProductRatingProps): React.ReactElement | null {
  if (!rating || rating <= 0) return null;

  const clamped = Math.max(0, Math.min(5, rating));
  const sizePx  = size === 'md' ? 16 : 12;
  const stars   = [1, 2, 3, 4, 5].map(i => {
    const diff = clamped - (i - 1);
    return Math.max(0, Math.min(1, diff)); // fill per questa stella: 0, 0.x, o 1
  });

  const formatted = reviewCount
    ? reviewCount >= 1000
      ? `(${(reviewCount / 1000).toFixed(1)}k)`
      : `(${reviewCount})`
    : null;

  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
      aria-label={`Valutazione: ${clamped.toFixed(1)} su 5${reviewCount ? `, ${reviewCount} recensioni` : ''}`}
      role="img"
    >
      {/* Stelle */}
      <div style={{ display: 'flex', gap: '1px' }}>
        {stars.map((fill, i) => (
          <Star key={i} fill={fill} sizePx={sizePx} />
        ))}
      </div>

      {/* Valore numerico */}
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: size === 'md' ? '11px' : '9px',
        fontWeight: 700,
        color: COLOR_ACTIVE,
        lineHeight: 1,
      }}>
        {clamped.toFixed(1)}
      </span>

      {/* Contatore recensioni */}
      {showCount && formatted && (
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: size === 'md' ? '10px' : '8px',
          color: '#52525b',
          lineHeight: 1,
        }}>
          {formatted}
        </span>
      )}
    </div>
  );
}
