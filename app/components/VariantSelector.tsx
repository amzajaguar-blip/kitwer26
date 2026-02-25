'use client'

import { useState, useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import AddToCartButton from './AddToCartButton'

export interface ProductVariant {
  id: string
  variant_type: string   // 'color' | 'size' | 'switch' | 'other'
  name: string
  color_hex?: string | null
  price_override?: number | null
  stock_quantity: number
  image_url?: string | null
  sort_order: number
}

interface Props {
  variants: ProductVariant[]
  basePrice: number
  productId: string
  productTitle: string
  productSlug: string
  productImageUrl?: string
  onVariantChange?: (variant: ProductVariant | null) => void
}

export default function VariantSelector({
  variants,
  basePrice,
  productId,
  productTitle,
  productSlug,
  productImageUrl,
  onVariantChange,
}: Props) {
  const [selected, setSelected] = useState<ProductVariant | null>(
    variants.length > 0 ? (variants.find(v => v.stock_quantity > 0) ?? variants[0]) : null
  )

  useEffect(() => {
    onVariantChange?.(selected)
  }, [selected, onVariantChange])

  if (variants.length === 0) return null

  // Raggruppa per tipo
  const byType = variants.reduce<Record<string, ProductVariant[]>>((acc, v) => {
    if (!acc[v.variant_type]) acc[v.variant_type] = []
    acc[v.variant_type].push(v)
    return acc
  }, {})

  const effectivePrice = selected?.price_override ?? basePrice
  const isOutOfStock = selected ? selected.stock_quantity === 0 : false

  const typeLabel: Record<string, string> = {
    color: 'Colore',
    size: 'Taglia',
    switch: 'Switch',
    other: 'Variante',
  }

  function stockLabel(qty: number) {
    if (qty === 0) return { text: 'Esaurito', cls: 'text-red-400' }
    if (qty <= 3) return { text: `Ultime ${qty}`, cls: 'text-amber-400' }
    return { text: 'Disponibile', cls: 'text-neon-green' }
  }

  return (
    <div className="space-y-4">
      {/* Gruppi per tipo */}
      {Object.entries(byType).map(([type, group]) => (
        <div key={type}>
          <div className="mb-2.5 flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              {typeLabel[type] ?? type}
            </span>
            {selected && group.find(v => v.id === selected.id) && (
              <span className="text-sm font-semibold text-text-primary">
                — {selected.name}
                {selected.stock_quantity > 0 && selected.stock_quantity <= 5 && (
                  <span className="ml-2 text-xs font-normal text-amber-400">
                    (ultime {selected.stock_quantity} unità)
                  </span>
                )}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2.5">
            {group.map((variant) => {
              const isSelected = selected?.id === variant.id
              const outOfStock = variant.stock_quantity === 0
              const stock = stockLabel(variant.stock_quantity)

              // ── Color swatch ─────────────────────────────────
              if (type === 'color' && variant.color_hex) {
                return (
                  <button
                    key={variant.id}
                    onClick={() => !outOfStock && setSelected(variant)}
                    disabled={outOfStock}
                    title={`${variant.name} — ${stock.text}`}
                    aria-label={`${variant.name}${outOfStock ? ' — esaurito' : ''}`}
                    className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all
                      ${isSelected
                        ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg-card scale-110'
                        : 'ring-1 ring-border hover:ring-accent/60 hover:scale-105'
                      }
                      ${outOfStock ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}
                    `}
                    style={{ backgroundColor: variant.color_hex }}
                  >
                    {/* Diagonal line for out-of-stock */}
                    {outOfStock && (
                      <span className="absolute inset-0 overflow-hidden rounded-full">
                        <span className="absolute inset-0 rotate-45 border-t-2 border-white/60" />
                      </span>
                    )}
                    {/* Selected check */}
                    {isSelected && (
                      <svg className="h-4 w-4 drop-shadow-sm" viewBox="0 0 16 16" fill="none">
                        <path d="M3 8l3.5 3.5L13 4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>
                )
              }

              // ── Pill button (size, switch, other) ────────────
              return (
                <button
                  key={variant.id}
                  onClick={() => !outOfStock && setSelected(variant)}
                  disabled={outOfStock}
                  aria-label={`${variant.name}${outOfStock ? ' — esaurito' : ''}`}
                  className={`relative min-h-[44px] min-w-[44px] rounded-xl border px-4 py-2 text-sm font-semibold transition-all
                    ${isSelected
                      ? 'border-accent bg-accent/15 text-accent shadow-sm shadow-accent/20'
                      : outOfStock
                        ? 'cursor-not-allowed border-border bg-bg-dark/40 text-text-secondary/40 line-through'
                        : 'border-border bg-bg-card text-text-secondary hover:border-accent/60 hover:text-text-primary'
                    }
                  `}
                >
                  {variant.name}
                  {variant.price_override && variant.price_override !== basePrice && (
                    <span className="ml-1.5 text-[10px] font-normal opacity-70">
                      +{(variant.price_override - basePrice).toFixed(0)}€
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {/* Prezzo aggiornato */}
      {selected?.price_override && selected.price_override !== basePrice && (
        <div className="flex items-center gap-2 rounded-xl border border-accent/20 bg-accent/5 px-4 py-2.5">
          <span className="text-xs text-text-secondary">Prezzo per questa variante:</span>
          <span className="text-lg font-bold text-accent">{effectivePrice.toFixed(2)}€</span>
          <span className="text-sm text-text-secondary line-through">{basePrice.toFixed(2)}€</span>
        </div>
      )}

      {/* Stock status badge */}
      {selected && (
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${
            selected.stock_quantity === 0 ? 'bg-red-400' :
            selected.stock_quantity <= 3 ? 'bg-amber-400 animate-pulse' :
            'bg-neon-green animate-pulse'
          }`} />
          <span className={`text-xs font-medium ${stockLabel(selected.stock_quantity).cls}`}>
            {stockLabel(selected.stock_quantity).text}
            {selected.stock_quantity > 0 && selected.stock_quantity <= 10 && (
              <> — {selected.stock_quantity} rimasti</>
            )}
          </span>
        </div>
      )}

      {/* Out-of-stock alert */}
      {isOutOfStock && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-400/25 bg-red-400/8 px-4 py-3">
          <AlertCircle size={15} className="mt-0.5 shrink-0 text-red-400" />
          <div>
            <p className="text-sm font-semibold text-red-400">Colore / variante non disponibile</p>
            <p className="mt-0.5 text-xs text-text-secondary">
              Seleziona un&apos;altra opzione oppure contattaci per sapere quando torna disponibile.
            </p>
          </div>
        </div>
      )}

      {/* Add to Cart — disabled se esaurito */}
      <AddToCartButton
        productId={productId}
        productTitle={`${productTitle}${selected ? ` — ${selected.name}` : ''}`}
        productPrice={effectivePrice}
        productImageUrl={selected?.image_url ?? productImageUrl}
        productSlug={productSlug}
        className={`w-full ${isOutOfStock ? 'pointer-events-none opacity-40' : ''}`}
      />

      {isOutOfStock && (
        <p className="text-center text-xs text-text-secondary/60">
          Seleziona una variante disponibile per procedere
        </p>
      )}
    </div>
  )
}
