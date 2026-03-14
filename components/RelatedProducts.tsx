'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import type { Product } from '@/types/product';
import { useCart } from '@/context/CartContext';
import { getMarkupPrice } from '@/utils/pricing';

interface Props {
  products: Product[];
  title?: string;
}

export default function RelatedProducts({
  products,
  title = 'Spesso Acquistati Insieme',
}: Props) {
  const { addItem, openCart } = useCart();

  if (!products.length) return null;

  return (
    <section className="mt-6 mb-2">
      <h3
        className="text-[11px] font-bold uppercase tracking-widest mb-3"
        style={{ color: 'var(--th-faint)' }}
      >
        🔗 {title}
      </h3>

      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
        {products.map((p) => {
          const raw = parseFloat(String(p.price ?? ''));
          const finalPrice = isNaN(raw) ? null : getMarkupPrice(raw);
          const imgSrc = p.image_url || p.thumbnailImage || '/placeholder.svg';
          const displayName = p.name || p.title || '';

          return (
            <div
              key={p.id}
              className="flex-shrink-0 w-36 rounded-2xl overflow-hidden border flex flex-col"
              style={{ background: 'var(--th-card)', borderColor: 'var(--th-border)' }}
            >
              <Link href={`/product/${p.id}`} className="block">
                <div className="relative w-full aspect-square bg-black/5">
                  <Image
                    src={imgSrc}
                    alt={displayName}
                    fill
                    className="object-cover"
                    sizes="144px"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder.svg';
                    }}
                  />
                </div>
              </Link>

              <div className="p-2 flex flex-col flex-1">
                <p
                  className="text-[11px] font-medium line-clamp-2 leading-snug mb-1.5 flex-1"
                  style={{ color: 'var(--th-text)' }}
                >
                  {displayName}
                </p>

                {finalPrice !== null && (
                  <p className="text-sm font-black text-[#00D4FF] mb-2">
                    €{finalPrice.toFixed(2).replace('.', ',')}
                  </p>
                )}

                <button
                  onClick={() => {
                    addItem(p);
                    openCart();
                  }}
                  className="w-full h-7 bg-[#00D4FF] text-[#0A0A0A] text-[11px] font-bold rounded-lg flex items-center justify-center gap-1 active:scale-95 transition-transform"
                >
                  <ShoppingBag size={11} />
                  Aggiungi
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
