import Image from 'next/image';
import { ExternalLink, ShieldCheck, Zap } from 'lucide-react';
import type { BlogProductData } from '@/lib/blog/db';

interface BlogProductCardProps {
  product: BlogProductData;
}

function getCategoryBadge(category: string | null): { text: string; color: string } {
  const c = (category ?? '').toLowerCase();
  if (c.includes('crypto') || c.includes('wallet') || c.includes('security')) {
    return { text: 'DEFCON 1', color: 'text-red-400 border-red-500/50 bg-red-500/10' };
  }
  if (c.includes('drone') || c.includes('fpv')) {
    return { text: 'AERIAL OPS', color: 'text-cyan-400 border-cyan-500/50 bg-cyan-500/10' };
  }
  if (c.includes('sim') || c.includes('racing')) {
    return { text: 'RACE SPEC', color: 'text-orange-400 border-orange-500/50 bg-orange-500/10' };
  }
  return { text: 'VERIFICATO', color: 'text-green-400 border-green-500/50 bg-green-500/10' };
}

export default function BlogProductCard({ product }: BlogProductCardProps) {
  const badge     = getCategoryBadge(product.category);
  const imageUrl  = product.image_urls?.[0] ?? product.image_url;
  const buyUrl    = product.affiliate_url ?? '#';
  const price     = product.price > 0
    ? new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(product.price)
    : null;

  return (
    <div className="my-6 flex flex-col gap-4 rounded-none border border-zinc-700 bg-zinc-900/60 p-4 transition-colors hover:border-cyan-500/40 sm:flex-row sm:items-center sm:gap-6">
      {/* Image */}
      {imageUrl && (
        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-none border border-zinc-800 bg-zinc-950">
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            sizes="112px"
            className="object-contain p-2"
          />
        </div>
      )}

      {/* Info */}
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-none border px-2 py-0.5 font-mono text-xs font-bold uppercase tracking-widest ${badge.color}`}>
            <ShieldCheck className="h-3 w-3" />
            {badge.text}
          </span>
        </div>
        <h3 className="font-mono text-base font-bold text-white leading-snug">
          {product.name}
        </h3>
        {price && (
          <div className="font-mono text-xl font-extrabold text-orange-400">
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
          className="inline-flex shrink-0 items-center gap-2 rounded-none border border-orange-500 bg-orange-500/10 px-5 py-2.5 font-mono text-sm font-bold uppercase tracking-widest text-orange-400 transition-all hover:bg-orange-500 hover:text-zinc-950"
        >
          <Zap className="h-4 w-4" />
          Acquista
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  );
}
