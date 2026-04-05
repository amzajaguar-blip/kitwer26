'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { ShoppingCart, Zap, RefreshCw, AlertTriangle, TrendingDown } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useIntl } from '@/context/InternationalizationContext';
import type { TacticalDeal } from '@/lib/products';

// ── Skeleton card ──────────────────────────────────────────────────────────────
function SkeletonDeal() {
  return (
    <div className="flex flex-col rounded-sm border border-zinc-800 bg-zinc-900/60 animate-pulse">
      <div className="aspect-square bg-zinc-800/80 rounded-t-sm" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-zinc-800 rounded-sm w-3/4" />
        <div className="h-3 bg-zinc-800 rounded-sm w-1/2" />
        <div className="flex gap-2 mt-2">
          <div className="h-4 bg-zinc-800 rounded-sm w-1/3" />
          <div className="h-4 bg-zinc-800 rounded-sm w-1/4" />
        </div>
        <div className="h-9 bg-zinc-800 rounded-sm mt-2" />
      </div>
    </div>
  );
}

// ── Deal Card ──────────────────────────────────────────────────────────────────
function DealCard({ deal }: { deal: TacticalDeal }) {
  const { addItem, openCart } = useCart();
  const { convertPrice }      = useIntl();

  // Candidati memoizzati — ricalcolati solo se deal cambia
  const candidates = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    const push = (u?: string | null) => {
      if (u?.startsWith('http') && !seen.has(u)) { seen.add(u); out.push(u); }
    };
    push(deal.image_url);
    deal.image_urls?.forEach(push);
    return out;
  }, [deal.image_url, deal.image_urls]);

  // imgSrc inizializzato da candidates[0] — stesso criterio startsWith('http')
  const [imgSrc, setImgSrc]     = useState<string>(() => candidates[0] ?? '/placeholder.svg');
  const [imgIdx, setImgIdx]     = useState(0);
  const [adding, setAdding]     = useState(false);
  const addingTimerRef          = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timer al dismount per evitare setState su componente smontato
  useEffect(() => () => { if (addingTimerRef.current) clearTimeout(addingTimerRef.current); }, []);

  const handleImgError = () => {
    const next = imgIdx + 1;
    if (next < candidates.length) {
      setImgIdx(next);
      setImgSrc(candidates[next]);
    } else {
      setImgSrc('/placeholder.svg');
    }
  };

  const handleAcquire = () => {
    if (adding) return;
    setAdding(true);
    addItem({
      id:         deal.id,
      name:       deal.name,
      price:      deal.rawPrice,
      image_url:  deal.image_url ?? undefined,
      image_urls: deal.image_urls ?? undefined,
      category:   deal.category,
      sub_category: deal.sub_category ?? undefined,
    });
    openCart();
    if (addingTimerRef.current) clearTimeout(addingTimerRef.current);
    addingTimerRef.current = setTimeout(() => setAdding(false), 800);
  };

  return (
    <div className="group relative flex flex-col bg-zinc-900 border border-zinc-800 hover:border-amber-500/40 transition-colors duration-200 rounded-sm overflow-hidden hover:shadow-[0_0_16px_rgba(245,158,11,0.12)]">

      {/* Image container */}
      <div className="relative aspect-square bg-zinc-950 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgSrc}
          alt={deal.name}
          className="absolute inset-0 w-full h-full object-contain p-2 transition-transform duration-300 group-hover:scale-[1.04]"
          loading="lazy"
          onError={handleImgError}
        />

        {/* Badges top row */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm font-mono text-[8px] font-bold tracking-widest uppercase bg-amber-500/20 border border-amber-500/50 text-amber-400">
            <Zap size={7} className="shrink-0" />
            INTEL DETECTED
          </span>
          {deal.sub_category && (
            <span className="font-mono text-[7px] text-th-subtle tracking-widest uppercase px-1">
              [{deal.sub_category.replace(/-/g, ' ')}]
            </span>
          )}
        </div>

        {/* Discount % badge top-right */}
        <div className="absolute top-2 right-2">
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-sm font-mono text-[9px] font-extrabold bg-red-500/90 text-white border border-red-400/50 shadow-[0_0_8px_rgba(239,68,68,0.4)]">
            <TrendingDown size={8} className="shrink-0" />
            -{deal.discountPct}%
          </span>
        </div>

        {/* Dark overlay on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-all pointer-events-none" />
      </div>

      {/* Info */}
      <div className="flex flex-col gap-2 p-3 flex-1">
        {/* Product name */}
        <p
          className="font-mono text-xs text-th-subtle leading-snug line-clamp-2 min-h-[2.5em] group-hover:text-white transition-colors"
          title={deal.name}
        >
          {deal.name}
        </p>

        {/* Pricing block */}
        <div className="flex items-baseline gap-2 flex-wrap mt-auto">
          {/* Market price struck-through */}
          <span className="font-mono text-xs line-through" style={{ color: '#d4d4d8' }}>
            {convertPrice(deal.marketPrice)}
          </span>
          {/* Deal price neon green */}
          <span
            className="font-mono font-extrabold text-base"
            style={{
              color: '#22c55e',
              textShadow: '0 0 8px rgba(34,197,94,0.55), 0 0 20px rgba(34,197,94,0.2)',
            }}
          >
            {convertPrice(deal.dealPrice)}
          </span>
        </div>

        {/* Scarcity line */}
        <div className="flex items-center gap-1.5">
          <span className="h-1 w-1 rounded-full bg-amber-400 animate-ping shrink-0" />
          <span className="font-mono text-[8px] text-amber-500/80 uppercase tracking-widest">
            Stock Tattico in esaurimento
          </span>
        </div>

        {/* CTA */}
        <button
          onClick={handleAcquire}
          disabled={adding}
          className="mt-1 w-full h-9 flex items-center justify-center gap-1.5 font-mono font-bold text-[10px] tracking-widest uppercase text-black bg-amber-500 hover:bg-amber-400 disabled:opacity-60 active:scale-95 transition-all rounded-sm shadow-[0_0_8px_rgba(245,158,11,0.25)] hover:shadow-[0_0_16px_rgba(245,158,11,0.45)]"
        >
          {adding ? (
            <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <ShoppingCart size={11} />
          )}
          {adding ? 'AGGIUNTO' : '[ ACQUISCI ASSET ]'}
        </button>
      </div>
    </div>
  );
}

// ── Error state ────────────────────────────────────────────────────────────────
function DealsError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <AlertTriangle size={24} className="text-th-subtle" />
      <span className="font-mono text-[10px] text-th-subtle uppercase tracking-widest">// SIGNAL_LOST</span>
      <button
        onClick={onRetry}
        className="flex items-center gap-2 px-4 py-2 border border-zinc-800 hover:border-amber-500/40 rounded-sm font-mono text-xs text-th-subtle hover:text-amber-400 transition-colors"
      >
        <RefreshCw size={12} />
        RETRY
      </button>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────
export default function TacticalDealsSection() {
  const [deals, setDeals]   = useState<TacticalDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(false);
  const hasFetched          = useRef(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch('/api/deals');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setDeals(json.deals ?? []);
    } catch (e) {
      console.error('[TacticalDealsSection]', e);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Se non ci sono deals e non stiamo caricando, non renderizzare la sezione
  if (!loading && !error && deals.length === 0) return null;

  return (
    <section className="px-4 py-14 sm:py-20 relative">
      {/* Blueprint scan-line di sfondo */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(245,158,11,1) 1px, transparent 1px)',
          backgroundSize: '100% 32px',
        }}
      />

      {/* Ambient glow amber */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-40 w-[600px] blur-[100px] opacity-10"
        style={{ background: 'radial-gradient(ellipse, #f59e0b 0%, transparent 70%)' }}
      />

      <div className="relative">
        {/* Section header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-sm border border-amber-500/30 bg-amber-500/5">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="font-mono text-[10px] tracking-[0.25em] text-amber-400 uppercase">
              PRICE INFILTRATION ACTIVE
            </span>
          </div>

          <h2 className="font-mono font-extrabold text-2xl sm:text-3xl text-white leading-tight">
            TACTICAL{' '}
            <span
              className="text-amber-400"
              style={{ textShadow: '0 0 16px rgba(245,158,11,0.4)' }}
            >
              OVERRIDE
            </span>
          </h2>
          <p className="mt-1 font-mono text-[10px] tracking-[0.15em] text-th-subtle uppercase">
            // Segnale captato: asset ad alto potenziale con costi di acquisizione ridotti
          </p>
        </div>

        {/* Error */}
        {error && <DealsError onRetry={load} />}

        {/* Grid */}
        {!error && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-w-6xl mx-auto">
            {loading
              ? Array.from({ length: 8 }).map((_, i) => <SkeletonDeal key={i} />)
              : deals.map((d) => <DealCard key={d.id} deal={d} />)
            }
          </div>
        )}

        {/* Footer nota */}
        {!loading && !error && deals.length > 0 && (
          <p className="text-center font-mono text-[9px] text-th-subtle uppercase tracking-widest mt-6">
            // Prezzi aggiornati dal database · disponibilità soggetta a variazioni
          </p>
        )}
      </div>
    </section>
  );
}
