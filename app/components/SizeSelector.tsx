'use client'

import { useState } from 'react'
import AddToCartButton from './AddToCartButton'

interface Props {
  sizes: string[]
  productId: string
  productTitle: string
  productPrice: number
  productImageUrl?: string
  productSlug: string
}

export default function SizeSelector({
  sizes,
  productId,
  productTitle,
  productPrice,
  productImageUrl,
  productSlug,
}: Props) {
  const [selected, setSelected] = useState(sizes[0])

  return (
    <div className="space-y-4">
      {/* Label + selezione */}
      <div>
        <div className="mb-2.5 flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Misura
          </span>
          <span className="text-sm font-semibold text-text-primary">— {selected}</span>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {sizes.map((size) => {
            const isSelected = selected === size
            return (
              <button
                key={size}
                onClick={() => setSelected(size)}
                aria-label={`Misura ${size}`}
                aria-pressed={isSelected}
                className={[
                  'min-h-[44px] min-w-[44px] rounded-xl border px-4 py-2 text-sm font-semibold transition-all duration-150',
                  isSelected
                    ? 'border-accent bg-accent/15 text-accent shadow-sm shadow-accent/20'
                    : 'border-border bg-bg-card text-text-secondary hover:border-accent/60 hover:text-text-primary',
                ].join(' ')}
              >
                {size}
              </button>
            )
          })}
        </div>
      </div>

      {/* Add to cart — titolo include la misura scelta */}
      <AddToCartButton
        productId={`${productId}-${selected}`}
        productTitle={`${productTitle} — ${selected}`}
        productPrice={productPrice}
        productImageUrl={productImageUrl}
        productSlug={productSlug}
      />
    </div>
  )
}
