'use client';

import Image from 'next/image';
import { ShieldCheck, Zap, ExternalLink, Lock, Radio } from 'lucide-react';
import { Product } from '@/types/product';
import { useIntl } from '@/context/InternationalizationContext';
import { useState, useMemo } from 'react';
import ProductRating from './ProductRating';
import { buildAffiliateLink } from '@/lib/affiliate';

interface Props {
  product: Product;
  onOpenDrawer: (product: Product) => void;
  priority?: boolean;
}

// ── Per-category accent config ──────────────────────────────────────────────
const CAT_ACCENT: Record<string, {
  color:       string;
  colorMuted:  string;
  colorGlow:   string;
  badgeText:   string;
  badgeBg:     string;
  placeholder: string; // fallback SVG path
  Icon:        React.ElementType;
}> = {
  'FPV Drones': {
    color:       '#00D4FF',
    colorMuted:  'rgba(0,212,255,0.15)',
    colorGlow:   'rgba(0,212,255,0.22)',
    badgeText:   'FPV · VERIFICATO',
    badgeBg:     'rgba(0,212,255,0.90)',
    placeholder: '/placeholder.svg',
    Icon:        Radio,
  },
  'Sim Racing': {
    color:       '#F59E0B',
    colorMuted:  'rgba(245,158,11,0.15)',
    colorGlow:   'rgba(245,158,11,0.22)',
    badgeText:   'SIM · VERIFICATO',
    badgeBg:     'rgba(245,158,11,0.90)',
    placeholder: '/images/placeholder-sim.svg',
    Icon:        Zap,
  },
  'Crypto Wallets': {
    color:       '#00FF94',
    colorMuted:  'rgba(0,255,148,0.15)',
    colorGlow:   'rgba(0,255,148,0.22)',
    badgeText:   'CRYPTO · SICURO',
    badgeBg:     'rgba(0,255,148,0.90)',
    placeholder: '/images/placeholder-crypto.svg',
    Icon:        Lock,
  },
  'Cyber Security': {
    color:       '#FF4444',
    colorMuted:  'rgba(255,68,68,0.15)',
    colorGlow:   'rgba(255,68,68,0.22)',
    badgeText:   'CYBER · DEFCON 1',
    badgeBg:     'rgba(255,68,68,0.90)',
    placeholder: '/images/placeholder-cyber.svg',
    Icon:        ShieldCheck,
  },
};

const DEFAULT_ACCENT = {
  color:       '#a1a1aa',
  colorMuted:  'rgba(161,161,170,0.12)',
  colorGlow:   'rgba(161,161,170,0.15)',
  badgeText:   'VERIFICATO',
  badgeBg:     'rgba(6,182,212,0.90)',
  placeholder: '/placeholder.svg',
  Icon:        ShieldCheck,
};

// ── Dev-only affiliate audit ───────────────────────────────────────────────────
// Logs missing/non-Amazon product_urls to the console during development.
// Zero runtime cost in production.
function auditAffiliateUrl(
  productId: string | undefined,
  productUrl: string | null | undefined,
  built: string | null,
) {
  if (process.env.NODE_ENV !== 'development') return;
  if (!productUrl) {
    console.warn(`[affiliate-audit] id=${productId ?? '?'}: product_url null/empty — CTA disabled`);
  } else if (!built) {
    console.warn(`[affiliate-audit] id=${productId ?? '?'}: buildAffiliateLink returned null for: ${productUrl}`);
  } else if (!built.includes('amazon')) {
    console.info(`[affiliate-audit] id=${productId ?? '?'}: non-Amazon URL used as-is: ${built}`);
  }
}

function getRawPrice(p: Product): number {
  const v = parseFloat(String(p.price ?? ''));
  return isNaN(v) || v <= 0 ? NaN : v;
}

export default function ProductCard({ product, onOpenDrawer, priority = false }: Props) {
  const { convertPrice, getExchangeRate, t } = useIntl();
  const acc = CAT_ACCENT[product.category ?? ''] ?? DEFAULT_ACCENT;

  const raw               = getRawPrice(product);
  const finalPriceNum     = isNaN(raw) ? null : Math.round(raw * getExchangeRate() * 100) / 100;
  const finalPriceDisplay = isNaN(raw) ? null : convertPrice(raw);
  const showPurchaseButtons = finalPriceNum !== null && finalPriceNum > 0;

  const affiliateUrl = buildAffiliateLink(product.product_url);
  const trackUrl     = product.id ? `/track/product/${product.id}` : null;

  // Affiliate audit (dev-only)
  auditAffiliateUrl(product.id, product.product_url, affiliateUrl);

  // Badge priority: Budget King > Selezione di Punta > category default
  // Note: is_top_tier requires DB migration (ALTER TABLE ... ADD COLUMN is_top_tier).
  // Until migrated it will always be undefined/falsy — safe to reference.
  const badgeText = product.is_budget_king
    ? '★ BUDGET KING'
    : product.is_top_tier
    ? '★ SELEZIONE DI PUNTA'
    : acc.badgeText;

  // Image cascade
  const candidates = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    const add = (url?: string | null) => {
      const u = url?.trim();
      if (u && u.startsWith('http') && !seen.has(u)) { seen.add(u); out.push(u); }
    };
    add(product.image_url);
    add(product.thumbnailImage);
    if (Array.isArray(product.image_urls)) product.image_urls.forEach(add);
    if (Array.isArray(product.images))     product.images.forEach(add);
    return out;
  }, [product]);

  const [candidateIdx, setCandidateIdx] = useState(0);
  const imgSrc = candidateIdx < candidates.length
    ? candidates[candidateIdx]
    : acc.placeholder;

  return (
    <div
      className="group relative flex flex-col bg-zinc-900 shadow-sm transition-all duration-200 rounded-sm"
      style={{
        border: `1px solid ${acc.color}20`,
        '--cat-color': acc.color,
        '--cat-glow': acc.colorGlow,
        '--cat-muted': acc.colorMuted,
      } as React.CSSProperties}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = `${acc.color}55`;
        el.style.boxShadow = `0 0 24px ${acc.colorGlow}, inset 0 0 24px ${acc.colorMuted}`;
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = `${acc.color}20`;
        el.style.boxShadow = 'none';
      }}
    >
      {/* Image — opens drawer on click */}
      <button
        onClick={() => onOpenDrawer(product)}
        className="relative w-full aspect-square overflow-hidden bg-zinc-950 active:opacity-80 rounded-t-sm"
        aria-label={`Dettagli ${product.name}`}
      >
        <Image
          src={imgSrc}
          alt={product.name}
          width={600}
          height={600}
          sizes="(max-width: 768px) 100vw, 300px"
          className="absolute inset-0 w-full h-full object-contain transition-transform duration-300 group-hover:scale-[1.04]"
          loading={priority ? undefined : 'lazy'}
          priority={priority}
          unoptimized
          onError={() => setCandidateIdx(i => i + 1)}
        />

        {/* Category-colored crosshair corners on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <span className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2" style={{ borderColor: acc.color }} />
          <span className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2" style={{ borderColor: acc.color }} />
          <span className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2" style={{ borderColor: acc.color }} />
          <span className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2" style={{ borderColor: acc.color }} />
        </div>

        {/* Badge */}
        <div
          className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-sm font-mono text-[8px] font-black tracking-widest uppercase text-black"
          style={{ background: acc.badgeBg }}
        >
          <acc.Icon size={8} />
          {badgeText}
        </div>

        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-all pointer-events-none" />
      </button>

      {/* Info */}
      <div className="flex flex-col gap-2 p-3 flex-1">
        {product.category && (
          <span
            className="font-mono text-[8px] tracking-[0.2em] uppercase font-bold"
            style={{ color: `${acc.color}80` }}
          >
            {product.category.replace(/-/g, ' ')}
          </span>
        )}

        <button onClick={() => onOpenDrawer(product)} className="text-left flex-1">
          <h3 className="font-mono text-xs font-medium leading-snug line-clamp-2 min-h-[2.8em] text-white transition-colors group-hover:text-zinc-100">
            {product.name}
          </h3>
        </button>

        {product.rating != null && product.rating > 0 && (
          <ProductRating
            rating={product.rating as number}
            reviewCount={product.review_count as number | undefined}
            size="sm"
          />
        )}

        <p
          className="font-mono font-black text-base tracking-tight mt-auto"
          style={{ color: acc.color, textShadow: `0 0 10px ${acc.colorGlow}` }}
        >
          {finalPriceDisplay !== null
            ? finalPriceDisplay
            : (
              <span
                className="font-mono text-[9px] tracking-widest uppercase px-2 py-1 border rounded-sm"
                style={{ borderColor: `${acc.color}40`, color: `${acc.color}70` }}
              >
                CONTROLLA PREZZO
              </span>
            )
          }
        </p>

        {/* CTA */}
        {showPurchaseButtons && affiliateUrl && trackUrl ? (
          <a
            href={trackUrl}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="min-h-[44px] py-2 font-mono font-bold text-[8px] tracking-wide uppercase text-black active:scale-95 transition-all rounded-sm flex items-center justify-center gap-1 overflow-hidden"
            style={{
              background: acc.color,
              boxShadow: `0 0 10px ${acc.colorGlow}`,
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.boxShadow = `0 0 20px ${acc.colorGlow}, 0 0 40px ${acc.colorMuted}`;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.boxShadow = `0 0 10px ${acc.colorGlow}`;
            }}
          >
            <ExternalLink size={10} className="shrink-0" />
            <span className="truncate">Vedi Offerta</span>
          </a>
        ) : showPurchaseButtons ? (
          <button
            disabled
            className="min-h-[44px] py-2 font-mono font-bold text-[8px] tracking-wide uppercase text-black/50 rounded-sm flex items-center justify-center gap-1 overflow-hidden opacity-40 cursor-not-allowed"
            style={{ background: acc.color }}
          >
            <ExternalLink size={10} className="shrink-0" />
            <span className="truncate">Non disponibile</span>
          </button>
        ) : (
          <div className="min-h-[44px] flex items-center justify-center border rounded-sm" style={{ borderColor: `${acc.color}25` }}>
            <span className="font-mono text-[9px] tracking-widest uppercase text-center px-2" style={{ color: `${acc.color}60` }}>
              Verifica disponibilità
            </span>
          </div>
        )}

        {/* Footer bar */}
        <div className="flex items-center justify-center gap-1.5 pt-1 border-t" style={{ borderColor: `${acc.color}12` }}>
          <Image
            src="/svg_kitwer/freepik__svg-pacco-spedizione-cardboard-box-icon-with-shipp__59072.png"
            alt=""
            aria-hidden="true"
            width={10}
            height={10}
            className="w-2.5 h-2.5 object-contain invert opacity-60"
          />
          <span className="font-mono text-[9px] text-th-subtle tracking-wide">{t('shipping')}</span>
          <span className="font-mono text-[9px] text-th-subtle">·</span>
          <Image
            src="/svg_kitwer/freepik__svg-support-for-logo-assets-crisp-outlines-layered__59071-removebg-preview.png"
            alt=""
            aria-hidden="true"
            width={10}
            height={10}
            className="w-2.5 h-2.5 object-contain invert opacity-60"
          />
          <span className="font-mono text-[9px] text-th-subtle tracking-wide">{t('support')}</span>
        </div>
      </div>
    </div>
  );
}
