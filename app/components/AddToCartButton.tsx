'use client'

import { useState } from 'react'
import { ShoppingCart, Check } from 'lucide-react'
import { useCart } from '@/app/context/CartContext'

interface Props {
  productId: string
  productTitle: string
  productPrice: number
  productImageUrl?: string
  productSlug: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export default function AddToCartButton({
  productId,
  productTitle,
  productPrice,
  productImageUrl,
  productSlug,
  className,
  size = 'lg',
}: Props) {
  const { addItem } = useCart()
  const [added, setAdded] = useState(false)
  const [flyKey, setFlyKey] = useState(0) // increment to re-trigger fly animation

  function handleClick() {
    addItem({
      id: productId,
      title: productTitle,
      price: productPrice,
      image_url: productImageUrl,
      slug: productSlug,
    })
    setAdded(true)
    setFlyKey((k) => k + 1) // trigger fly-to-cart animation
    setTimeout(() => setAdded(false), 2200)
  }

  const sizeClasses = {
    sm: 'px-4 py-2.5 text-sm',
    md: 'px-5 py-3 text-sm',
    lg: 'px-6 py-4 text-base',
  }

  return (
    <div className="relative">
      {/* Flying cart icon — animates upward on click */}
      {flyKey > 0 && (
        <span
          key={flyKey}
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          aria-hidden
        >
          <ShoppingCart
            size={20}
            className="fly-to-cart text-bg-dark"
          />
        </span>
      )}

      <button
        onClick={handleClick}
        className={[
          'group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl font-bold',
          'transition-all duration-200 active:scale-[0.97]',
          sizeClasses[size],
          // Breath pulse — only when idle (not after adding)
          !added ? 'btn-breath' : '',
          added
            ? 'bg-badge-green text-white shadow-lg shadow-badge-green/25'
            : 'bg-accent text-bg-dark shadow-lg shadow-accent/30 hover:bg-accent-hover hover:shadow-accent/45',
          className ?? '',
        ].join(' ')}
        aria-label={added ? 'Aggiunto al carrello' : 'Aggiungi al carrello'}
      >
        {/* Shimmer sweep on hover */}
        {!added && (
          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
        )}

        <span className="relative flex items-center gap-2">
          {added ? (
            <>
              <Check size={18} />
              Aggiunto al Carrello!
            </>
          ) : (
            <>
              <ShoppingCart size={18} />
              Aggiungi al Carrello
            </>
          )}
        </span>
      </button>
    </div>
  )
}
