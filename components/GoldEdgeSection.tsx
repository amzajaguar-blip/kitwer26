'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { ExternalLink, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { buildAffiliateLink } from '@/lib/affiliate';
import type { Product } from '@/types/product';

export default function GoldEdgeSection() {
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

  return (
    <section className="px-4 py-8">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-6">
        <Zap size={14} className="text-amber-400 shrink-0" />
        <div>
          <p className="font-mono text-[9px] tracking-[0.3em] text-amber-400/70 uppercase font-bold">
            Selezione di Punta
          </p>
          <p className="font-mono text-[11px] text-th-subtle tracking-wide">
            Prodotti premium selezionati per massima qualità e valore
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span className="font-mono text-[8px] text-amber-400/60 tracking-widest uppercase">
            Elite
          </span>
        </div>
      </div>

      {/* Horizontal scroll grid */}
      <div className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-none">
        {products.map((p) => {
          const affiliateUrl = buildAffiliateLink(p.product_url);
          const trackUrl = p.id ? `/track/product/${p.id}` : affiliateUrl;
          const price = parseFloat(String(p.price ?? ''));
          const displayPrice = isNaN(price) ? null : `€${price.toFixed(2)}`;

          return (
            <div
              key={p.id}
              className="flex-shrink-0 w-48 snap-start rounded-sm border border-amber-500/20 bg-zinc-900/80 overflow-hidden flex flex-col"
            >
              {/* Product image */}
              <div className="relative w-full aspect-square bg-zinc-900">
                <Image
                  src={p.image_url ?? '/placeholder.svg'}
                  alt={p.name ?? ''}
                  fill
                  className="object-contain p-2"
                  sizes="192px"
                  unoptimized
                />
                {/* Elite badge */}
                <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-amber-500/90 rounded-sm">
                  <span className="font-mono text-[7px] font-bold text-black uppercase tracking-wider">
                    Top Gear
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="flex flex-col gap-2 p-3 flex-1">
                <p className="font-mono text-[10px] text-white leading-snug line-clamp-2 font-semibold">
                  {p.name}
                </p>
                {displayPrice && (
                  <p className="font-mono font-black text-base text-amber-400">
                    {displayPrice}
                  </p>
                )}

                {/* CTA */}
                {affiliateUrl && trackUrl ? (
                  <a
                    href={trackUrl}
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                    className="mt-auto flex items-center justify-center gap-1.5 py-2.5 px-3 font-mono font-bold text-[10px] tracking-widest uppercase text-black bg-amber-500 hover:bg-amber-400 active:scale-95 transition-all rounded-sm shadow-[0_0_10px_rgba(245,158,11,0.35)] w-full"
                  >
                    <ExternalLink size={10} />
                    Vedi Offerta
                  </a>
                ) : (
                  <button
                    disabled
                    className="mt-auto py-2.5 font-mono text-[10px] text-zinc-500 border border-zinc-700 rounded-sm w-full cursor-not-allowed"
                  >
                    Non disponibile
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
