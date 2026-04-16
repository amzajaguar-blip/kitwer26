'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { ExternalLink, Lock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { buildAffiliateLink } from '@/lib/affiliate';
import type { Product } from '@/types/product';

// ── Per-category accent config ──────────────────────────────────────────────
const CAT_ACCENT: Record<string, { color: string; code: string }> = {
  'FPV Drones':     { color: '#00D4FF', code: 'FPV' },
  'Sim Racing':     { color: '#F59E0B', code: 'SIM' },
  'Crypto Wallets': { color: '#00FF94', code: 'CRY' },
  'Cyber Security': { color: '#FF4444', code: 'CYB' },
};
function accent(cat?: string | null) {
  return CAT_ACCENT[cat ?? ''] ?? { color: '#a1a1aa', code: 'GEN' };
}

// ── Animated count-up ────────────────────────────────────────────────────────
function CountUp({ target, prefix = '' }: { target: number; prefix?: string }) {
  const [val, setVal] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const duration = 900;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(ease * target));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target]);
  return <>{prefix}{val.toFixed(2)}</>;
}

// ── Asset card (scroll items) ─────────────────────────────────────────────────
function AssetCard({ p, idx }: { p: Product; idx: number }) {
  const acc = accent(p.category);
  const price = parseFloat(String(p.price ?? ''));
  const aff = buildAffiliateLink(p.product_url);
  const track = p.id ? `/track/product/${p.id}` : aff;
  const fileNo = String(idx + 2).padStart(2, '0');

  return (
    <a
      href={track ?? '#'}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="group flex-shrink-0 w-[152px] snap-start flex flex-col overflow-hidden relative"
      style={{
        background: 'rgba(9,9,11,0.92)',
        border: `1px solid ${acc.color}18`,
        transition: 'border-color .2s, box-shadow .2s',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = `${acc.color}55`;
        el.style.boxShadow = `0 0 20px ${acc.color}18, inset 0 0 20px ${acc.color}05`;
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = `${acc.color}18`;
        el.style.boxShadow = 'none';
      }}
    >
      {/* File number */}
      <div className="absolute top-0 left-0 z-10">
        <div
          className="px-1.5 py-0.5 font-mono text-[7px] font-black"
          style={{
            background: `${acc.color}22`,
            borderRight: `1px solid ${acc.color}30`,
            borderBottom: `1px solid ${acc.color}30`,
            color: `${acc.color}99`,
          }}
        >
          #{fileNo}
        </div>
      </div>

      {/* Category badge top-right */}
      <div className="absolute top-0 right-0 z-10">
        <div
          className="px-1.5 py-0.5 font-mono text-[7px] font-black tracking-widest"
          style={{
            background: `${acc.color}18`,
            borderLeft: `1px solid ${acc.color}30`,
            borderBottom: `1px solid ${acc.color}30`,
            color: acc.color,
          }}
        >
          {acc.code}
        </div>
      </div>

      {/* Image */}
      <div className="relative w-full aspect-square bg-zinc-950/70">
        <Image
          src={p.image_url ?? '/placeholder.svg'}
          alt={p.name ?? ''}
          fill
          className="object-contain p-2.5 transition-transform duration-300 group-hover:scale-[1.05]"
          sizes="152px"
          unoptimized
        />
      </div>

      {/* Info */}
      <div className="p-2.5 flex flex-col gap-1.5 flex-1">
        <p className="font-mono text-[9px] text-zinc-400 leading-snug line-clamp-2 font-medium group-hover:text-zinc-200 transition-colors min-h-[2.6em]">
          {p.name}
        </p>
        {!isNaN(price) && (
          <p
            className="font-mono font-black text-[15px] leading-none"
            style={{ color: acc.color, textShadow: `0 0 10px ${acc.color}40` }}
          >
            €{price.toFixed(2)}
          </p>
        )}
        <div
          className="mt-auto flex items-center justify-center gap-1 py-2 font-mono text-[8px] font-bold tracking-widest uppercase transition-all group-hover:brightness-125"
          style={{
            background: `${acc.color}12`,
            border: `1px solid ${acc.color}30`,
            color: acc.color,
          }}
        >
          <ExternalLink size={8} />
          Acquista
        </div>
      </div>
    </a>
  );
}

// ── Hero card (featured product) ─────────────────────────────────────────────
function HeroCard({ p }: { p: Product }) {
  const acc = accent(p.category);
  const price = parseFloat(String(p.price ?? ''));
  const aff = buildAffiliateLink(p.product_url);
  const track = p.id ? `/track/product/${p.id}` : aff;

  return (
    <a
      href={track ?? '#'}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="group flex-shrink-0 flex flex-col relative overflow-hidden"
      style={{
        width: 188,
        background: 'rgba(9,9,11,0.95)',
        border: `1px solid ${acc.color}35`,
        boxShadow: `0 0 30px ${acc.color}10`,
        transition: 'box-shadow .3s, border-color .3s',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = `${acc.color}70`;
        el.style.boxShadow = `0 0 40px ${acc.color}25, inset 0 0 30px ${acc.color}06`;
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = `${acc.color}35`;
        el.style.boxShadow = `0 0 30px ${acc.color}10`;
      }}
    >
      {/* TOP ASSET badge */}
      <div
        className="px-2 py-1 font-mono text-[8px] font-black tracking-[0.3em] uppercase border-b flex items-center gap-1.5"
        style={{
          borderColor: `${acc.color}30`,
          background: `${acc.color}10`,
          color: acc.color,
        }}
      >
        <span
          className="inline-block w-1.5 h-1.5 rounded-full animate-pulse"
          style={{ background: acc.color }}
        />
        #01 · TOP ASSET
      </div>

      {/* Image */}
      <div className="relative flex-1 min-h-[160px] bg-zinc-950/50">
        <Image
          src={p.image_url ?? '/placeholder.svg'}
          alt={p.name ?? ''}
          fill
          className="object-contain p-4 group-hover:scale-[1.04] transition-transform duration-500"
          sizes="188px"
          unoptimized
        />
        {/* Corner category code */}
        <div
          className="absolute bottom-2 right-2 px-1.5 py-0.5 font-mono text-[8px] font-black tracking-widest"
          style={{
            background: `${acc.color}15`,
            border: `1px solid ${acc.color}40`,
            color: acc.color,
          }}
        >
          {acc.code}
        </div>
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-2 border-t" style={{ borderColor: `${acc.color}20` }}>
        <p className="font-mono text-[10px] text-white font-bold leading-snug line-clamp-2">
          {p.name}
        </p>
        {!isNaN(price) && (
          <p
            className="font-mono font-black text-2xl leading-none"
            style={{ color: acc.color, textShadow: `0 0 16px ${acc.color}50` }}
          >
            <CountUp target={price} prefix="€" />
          </p>
        )}
        <div
          className="flex items-center justify-center gap-1.5 py-2.5 font-mono font-bold text-[9px] tracking-widest uppercase transition-all group-hover:brightness-125"
          style={{
            background: `${acc.color}18`,
            border: `1px solid ${acc.color}45`,
            color: acc.color,
            boxShadow: `0 0 10px ${acc.color}15`,
          }}
        >
          <ExternalLink size={9} />
          Vedi Offerta
        </div>
      </div>
    </a>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function SelezioneSection() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('products')
      .select('id, name, price, image_url, product_url, category, sub_category')
      .eq('is_top_tier', true)
      .eq('is_active', true)
      .not('image_url', 'is', null)
      .not('product_url', 'is', null)
      .order('price', { ascending: false })
      .limit(8)
      .then(({ data }) => {
        if (data) setProducts(data as Product[]);
        setLoading(false);
      });
  }, []);

  if (loading || products.length === 0) return null;

  const [hero, ...rest] = products;

  return (
    <section className="relative px-4 py-8 overflow-hidden">
      {/* Ambient light bleed from hero product category */}
      <div
        className="pointer-events-none absolute -top-8 left-0 right-0 h-64 blur-[80px] opacity-[0.055]"
        style={{
          background: `radial-gradient(ellipse 60% 100% at 20% 0%, ${accent(hero?.category).color} 0%, transparent 70%)`,
        }}
      />

      {/* Header row ──────────────────────────────────────────────── */}
      <div className="flex items-end justify-between mb-5 relative">
        <div>
          {/* Eyebrow */}
          <div className="flex items-center gap-2 mb-1.5">
            <Lock size={9} className="text-amber-400/60" />
            <span className="font-mono text-[8px] tracking-[0.4em] text-amber-400/60 uppercase font-bold">
              Classificato · Tier-1
            </span>
          </div>
          {/* Title */}
          <h2
            className="font-mono font-black text-[22px] sm:text-2xl leading-none tracking-tight text-white"
            style={{ letterSpacing: '-0.01em' }}
          >
            SELEZIONE{' '}
            <span style={{ color: '#F59E0B', textShadow: '0 0 18px rgba(245,158,11,0.45)' }}>
              DI PUNTA
            </span>
          </h2>
          {/* Sub */}
          <p className="font-mono text-[9px] text-zinc-600 tracking-[0.12em] mt-0.5 uppercase">
            {products.length} asset certificati · ordinati per valore
          </p>
        </div>

        {/* Live dot */}
        <div className="flex items-center gap-1.5 mb-0.5">
          <span
            className="h-1.5 w-1.5 rounded-full animate-pulse"
            style={{ background: accent(hero?.category).color }}
          />
          <span className="font-mono text-[8px] text-zinc-600 tracking-widest uppercase">
            Live
          </span>
        </div>
      </div>

      {/* Horizontal scroll container ────────────────────────────── */}
      <div className="flex gap-2.5 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-none -mx-4 px-4">
        {/* Hero */}
        <HeroCard p={hero} />

        {/* Separator */}
        <div
          className="flex-shrink-0 w-px self-stretch my-1 opacity-30"
          style={{ background: 'linear-gradient(to bottom, transparent, #F59E0B55, transparent)' }}
        />

        {/* Rest */}
        {rest.map((p, i) => <AssetCard key={p.id} p={p} idx={i} />)}
      </div>

      {/* Bottom rule */}
      <div className="mt-5 flex items-center gap-3">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
        <span className="font-mono text-[8px] text-zinc-700 tracking-[0.3em] uppercase shrink-0">
          // prezzi Amazon IT · link affiliati kitwer26
        </span>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
      </div>
    </section>
  );
}
