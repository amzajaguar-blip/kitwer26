'use client';

import { useEffect, useRef, Component, ReactNode } from 'react';
import ProductCard from './ProductCard';
import { Product } from '@/types/product';
import { useIntl } from '@/context/InternationalizationContext';

// ── Error boundary per singola card ──────────────────────────────────────────
// Isola il crash di un ProductCard senza buttare giù l'intera griglia
class CardBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) {
      return (
        <div className="flex flex-col bg-zinc-900 border border-zinc-800 rounded-sm aspect-square items-center justify-center opacity-30">
          <span className="font-mono text-[9px] text-th-subtle text-center px-2">// DATI NON DISP.</span>
        </div>
      );
    }
    return this.props.children;
  }
}

interface ProductGridProps {
  products: Product[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onOpenDrawer: (product: Product) => void;
}

function SkeletonCard() {
  return (
    <div className="flex flex-col bg-[#111111] rounded-xl overflow-hidden border border-gray-800/50 animate-pulse">
      <div className="aspect-square bg-[#1A1A1A]" />
      <div className="p-2.5 flex flex-col gap-2">
        <div className="h-2 bg-[#1A1A1A] rounded-full w-1/3" />
        <div className="h-2.5 bg-[#1A1A1A] rounded-full w-full" />
        <div className="h-2.5 bg-[#1A1A1A] rounded-full w-3/4" />
        <div className="flex justify-between items-center mt-1">
          <div className="h-3.5 bg-[#1A1A1A] rounded-full w-1/3" />
          <div className="w-7 h-7 bg-[#1A1A1A] rounded-full" />
        </div>
      </div>
    </div>
  );
}

export default function ProductGrid({
  products,
  loading,
  loadingMore,
  hasMore,
  onLoadMore,
  onOpenDrawer,
}: ProductGridProps) {
  const { t } = useIntl();
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Scroll infinito automatico — carica il prossimo blocco quando il sentinel è visibile
  useEffect(() => {
    if (!hasMore || loadingMore) return;
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) onLoadMore();
      },
      { rootMargin: '300px' }, // inizia a caricare 300px prima del bordo
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, onLoadMore]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 px-4 sm:px-6 pt-4 sm:pt-6 max-w-6xl mx-auto">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-th-subtle">
        <svg
          width="44"
          height="44"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          viewBox="0 0 24 24"
          className="mb-3 opacity-30"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <p className="text-sm text-th-subtle">{t('noProducts')}</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 px-4 sm:px-6 pt-4 sm:pt-6 max-w-6xl mx-auto">
        {products.map((p, i) => (
          <CardBoundary key={p.id ?? `${p.name}-${i}`}>
            <div
              className="animate-scale-in opacity-0"
              style={{
                animationDelay: `${Math.min(i * 60, 400)}ms`,
                animationFillMode: 'forwards',
              }}
            >
              <ProductCard product={p} onOpenDrawer={onOpenDrawer} />
            </div>
          </CardBoundary>
        ))}
      </div>

      {/* Sentinel invisibile — trigga il caricamento automatico */}
      <div ref={sentinelRef} className="h-1" />

      {/* Spinner visibile mentre carica */}
      {loadingMore && (
        <div className="flex justify-center py-6">
          <svg className="animate-spin w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      )}
    </>
  );
}
