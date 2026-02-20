import Link from 'next/link'
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
      className="group block rounded-xl bg-bg-card border border-border p-4 transition-all hover:border-accent hover:bg-bg-hover hover:shadow-lg hover:shadow-accent/5"
    >
      {/* Badges */}
      <div className="flex gap-2 mb-3">
        {discount > 0 && (
          <span className="rounded-full bg-badge-green px-2.5 py-0.5 text-xs font-bold text-white">
            -{discount}%
          </span>
        )}
        <span className="rounded-full bg-border px-2.5 py-0.5 text-xs text-text-secondary">
          {product.category}
        </span>
      </div>

      {/* Image */}
      <div className="relative aspect-square mb-4 overflow-hidden rounded-lg bg-bg-dark">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.title}
            className="h-full w-full object-contain p-4 transition-transform group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-text-secondary">
            <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>

      {/* Title */}
      <h3 className="mb-2 text-sm font-semibold leading-tight text-text-primary line-clamp-2 group-hover:text-accent">
        {product.title}
      </h3>

      {/* Price */}
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-bold text-accent">
          {product.price_current.toFixed(2)}€
        </span>
        {product.price_original && product.price_original > product.price_current && (
          <span className="text-sm text-text-secondary line-through">
            {product.price_original.toFixed(2)}€
          </span>
        )}
      </div>
    </Link>
  )
}
