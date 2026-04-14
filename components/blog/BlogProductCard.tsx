'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { ExternalLink, Zap } from 'lucide-react';
import TrustBadge from './TrustBadge';
import { formatEur } from '@/lib/utils/price';
import type { BlogProductData } from '@/lib/blog/db';

interface BlogProductCardProps {
  product: BlogProductData;
}

function getBadgeVariant(category: string | null): 'defcon' | 'verified' | 'bundle' {
  const c = (category ?? '').toLowerCase();
  if (c.includes('bundle') || c.includes('kit')) return 'bundle';
  if (c.includes('crypto') || c.includes('wallet') || c.includes('security')) return 'defcon';
  return 'verified';
}

export default function BlogProductCard({ product }: BlogProductCardProps) {
  const badgeVariant = getBadgeVariant(product.category);
  const isBundle     = product.name.toLowerCase().includes('bundle') || product.name.toLowerCase().includes('kit');
  const imageUrl     = product.image_urls?.[0] ?? product.image_url;
  const buyUrl       = product.affiliate_url ?? '#';
  const price        = formatEur(product.price);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-32px' }}
      transition={{ duration: 0.4 }}
      className="group my-4 flex flex-col gap-4 border border-zinc-800 bg-zinc-950 p-4 transition-all duration-300 hover:border-zinc-600 sm:flex-row sm:items-center sm:gap-5"
    >
      {/* Image */}
      {imageUrl && (
        <div className="relative h-24 w-24 shrink-0 overflow-hidden border border-zinc-800 bg-zinc-900 group-hover:border-zinc-700 transition-colors">
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            sizes="96px"
            className="object-contain p-2"
          />
        </div>
      )}

      {/* Info */}
      <div className="flex flex-1 flex-col gap-2">
        <TrustBadge variant={isBundle ? 'bundle' : badgeVariant} />
        <h3 className="font-mono text-sm font-extrabold leading-snug text-white sm:text-base">
          {product.name}
        </h3>
        {price && (
          <div className="font-mono text-lg font-extrabold text-orange-400 sm:text-xl">
            {price}
          </div>
        )}
      </div>

      {/* CTA */}
      {buyUrl !== '#' && (
        <a
          href={buyUrl}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="inline-flex shrink-0 items-center gap-2 border border-orange-500 bg-orange-500/10 px-4 py-2.5 font-mono text-sm font-bold uppercase tracking-widest text-orange-400 transition-all hover:bg-orange-500 hover:text-zinc-950 active:scale-95"
        >
          <Zap className="h-4 w-4" />
          Vedi Offerta
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </motion.div>
  );
}
