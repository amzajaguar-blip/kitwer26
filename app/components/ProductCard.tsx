import Link from 'next/link'
import ProductImage from './ProductImage'
import type { Product } from '@/types/supabase'

interface ProductCardProps {
  product: Product
}

export default function ProductCard({ product }: ProductCardProps) {
  const discount = product.price_original
    ? Math.round((1 - product.price_current / product.price_original) * 100)
    : 0

  return (
    <Link
      href={`/products/${product.slug}`}
      className={[
        'group relative block overflow-hidden rounded-2xl border',
        'transition-all duration-200',
        // Desktop: micro-scale + discrete yellow glow
        'md:hover:scale-[1.02] md:hover:shadow-[0_0_28px_rgba(255,193,7,0.13)]',
        // Mobile touch: accent border only (no scale — better UX per Sara)
        'active:border-accent/50',
      ].join(' ')}
      style={{ background: '#111116', borderColor: '#1e1e2a' }}
    >
      {/* ── Image — 1:1 forced aspect ratio ─────── */}
      <div className="relative aspect-square overflow-hidden" style={{ background: '#0c0c10' }}>
        <ProductImage
          src={product.image_url?.split(',')[0]?.trim()}
          alt={product.title}
          className="h-full w-full object-contain p-4 transition-transform duration-300 md:group-hover:scale-105"
        />

        {/* Gradient overlay — depth from bottom */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Discount badge */}
        {discount > 0 && (
          <span className="absolute left-2.5 top-2.5 rounded-full bg-badge-green px-2 py-0.5 text-[11px] font-bold leading-none text-white">
            -{discount}%
          </span>
        )}

        {/* Top accent line — appears on hover */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-accent opacity-0 transition-all duration-300 md:group-hover:scale-x-100 md:group-hover:opacity-100" />
      </div>

      {/* ── Card body ─────────────────────────────── */}
      <div className="p-3.5 pb-4">
        <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-text-secondary/50">
          {product.category}
        </p>
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-text-primary transition-colors duration-150 md:group-hover:text-accent">
          {product.title}
        </h3>
        <div className="mt-2.5 flex items-baseline gap-2">
          {/* White bold price — massima leggibilità su sfondo scuro */}
          <span className="text-[17px] font-bold leading-none text-white">
            {product.price_current.toFixed(2)}€
          </span>
          {product.price_original && product.price_original > product.price_current && (
            <span className="text-xs text-text-secondary/50 line-through">
              {product.price_original.toFixed(2)}€
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
