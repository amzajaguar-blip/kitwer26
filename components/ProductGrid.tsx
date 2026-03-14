'use client';

import ProductCard from './ProductCard';
import { Product } from '@/types/product';
import { useIntl } from '@/context/InternationalizationContext';

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
      <div className="flex flex-col items-center justify-center py-24 text-gray-600">
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
        <p className="text-sm text-gray-500">{t('noProducts')}</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 px-4 sm:px-6 pt-4 sm:pt-6 max-w-6xl mx-auto">
        {products.map((p, i) => (
          <div
            key={p.id ?? `${p.name}-${i}`}
            className="animate-scale-in opacity-0"
            style={{
              animationDelay: `${Math.min(i * 60, 400)}ms`,
              animationFillMode: 'forwards',
            }}
          >
            <ProductCard product={p} onOpenDrawer={onOpenDrawer} />
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center py-8">
          <button
            onClick={onLoadMore}
            disabled={loadingMore}
            className="px-8 h-11 bg-[var(--th-input)] text-[var(--th-text)] text-sm font-semibold rounded-full border border-[var(--th-border)] active:scale-95 transition-transform disabled:opacity-40 min-w-[140px] hover:border-[#00D4FF]/40"
          >
            {loadingMore ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin w-4 h-4 text-[#00D4FF]"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                {t('loading')}
              </span>
            ) : (
              t('loadMore')
            )}
          </button>
        </div>
      )}
    </>
  );
}
