'use client'

import { useState } from 'react'
import AddToCartButton from './AddToCartButton'
import { useGalleryIndex } from '@/app/context/ProductGalleryContext'

// Mappa nomi colori italiani → CSS hex (fallback al grigio neutro)
const COLOR_MAP: Record<string, string> = {
  'bianco': '#f0ede8',
  'bianco ghiaccio': '#eef0f3',
  'marmo bianco': '#e8e4dc',
  'nero': '#1c1c1c',
  'nero opaco': '#2a2a2a',
  'marmo nero': '#2d2d2d',
  'grigio': '#6b7280',
  'grigio scuro': '#374151',
  'grigio chiaro': '#9ca3af',
  'rosso': '#ef4444',
  'blu': '#3b82f6',
  'blu navy': '#1e3a5f',
  'verde': '#22c55e',
  'verde militare': '#4a5c3f',
  'giallo': '#eab308',
  'arancione': '#f97316',
  'viola': '#8b5cf6',
  'rosa': '#ec4899',
  'dorato': '#d4af37',
  'argento': '#c0c0c0',
  'marrone': '#78350f',
  'beige': '#d9c9a8',
  'sabbia': '#c8b89a',
  'turchese': '#0d9488',
  'cobalto': '#1e40af',
}

function getColorHex(name: string): string {
  return COLOR_MAP[name.toLowerCase().trim()] ?? '#6b7280'
}

/** Determina se il colore di sfondo è chiaro → usa testo scuro per il check */
function isLight(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 160
}

interface Props {
  sizes: string[]
  colors: string[]
  imageUrls: string[]   // già parsato: image_url.split(',')
  productId: string
  productTitle: string
  productPrice: number
  productSlug: string
}

export default function ProductVariantControls({
  sizes,
  colors,
  imageUrls,
  productId,
  productTitle,
  productPrice,
  productSlug,
}: Props) {
  const galleryCtx = useGalleryIndex()

  const [selectedSize, setSelectedSize] = useState<string | null>(sizes[0] ?? null)
  const [selectedColorIdx, setSelectedColorIdx] = useState<number>(0)

  function handleColorSelect(idx: number) {
    setSelectedColorIdx(idx)
    // Sincronizza la gallery con l'immagine corrispondente al colore
    galleryCtx?.setActiveIndex(idx)
  }

  const selectedColor = colors.length > 0 ? colors[selectedColorIdx] : null

  // Titolo carrello: "Prodotto — Misura — Colore" (solo le parti presenti)
  const titleParts: string[] = [productTitle]
  if (selectedSize) titleParts.push(selectedSize)
  if (selectedColor) titleParts.push(selectedColor)
  const cartTitle = titleParts.join(' — ')

  // ID carrello univoco per variante (size + color)
  const cartId = [productId, selectedSize, selectedColor]
    .filter(Boolean)
    .join('-')
    .replace(/\s+/g, '_')

  // Immagine carrello: usa l'immagine del colore selezionato se disponibile
  const cartImageUrl = imageUrls[selectedColorIdx] ?? imageUrls[0]

  return (
    <div className="space-y-5">

      {/* ── MISURE ─────────────────────────────────────────── */}
      {sizes.length > 0 && (
        <div>
          <div className="mb-2.5 flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Misura
            </span>
            {selectedSize && (
              <span className="text-sm font-semibold text-text-primary">— {selectedSize}</span>
            )}
          </div>

          <div className="flex flex-wrap gap-2.5">
            {sizes.map((size) => {
              const isSelected = selectedSize === size
              return (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  aria-pressed={isSelected}
                  aria-label={`Misura ${size}`}
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
      )}

      {/* ── COLORI ─────────────────────────────────────────── */}
      {colors.length > 0 && (
        <div>
          <div className="mb-2.5 flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Colore
            </span>
            {selectedColor && (
              <span className="text-sm font-semibold text-text-primary">— {selectedColor}</span>
            )}
          </div>

          <div className="flex flex-wrap gap-4">
            {colors.map((color, idx) => {
              const isSelected = selectedColorIdx === idx
              const hex = getColorHex(color)
              const light = isLight(hex)

              return (
                <button
                  key={`${color}-${idx}`}
                  onClick={() => handleColorSelect(idx)}
                  aria-pressed={isSelected}
                  aria-label={`Colore ${color}`}
                  title={color}
                  className="group flex flex-col items-center gap-1.5"
                >
                  {/* Cerchio colorato */}
                  <span
                    className={[
                      'relative flex h-10 w-10 items-center justify-center rounded-full',
                      'border-2 transition-all duration-150',
                      isSelected
                        ? 'border-accent ring-2 ring-accent ring-offset-[3px] ring-offset-bg-card scale-110'
                        : 'border-border/60 hover:border-accent/60 hover:scale-105',
                    ].join(' ')}
                    style={{ backgroundColor: hex }}
                  >
                    {/* Checkmark sul selezionato */}
                    {isSelected && (
                      <svg
                        viewBox="0 0 16 16"
                        fill="none"
                        className="h-4 w-4 drop-shadow-sm"
                        aria-hidden
                      >
                        <path
                          d="M3 8l3.5 3.5L13 4"
                          stroke={light ? '#1a1a1a' : '#ffffff'}
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>

                  {/* Nome colore */}
                  <span
                    className={[
                      'max-w-[64px] text-center text-[10px] font-medium leading-tight transition-colors',
                      isSelected
                        ? 'text-accent'
                        : 'text-text-secondary group-hover:text-text-primary',
                    ].join(' ')}
                  >
                    {color}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── ADD TO CART ─────────────────────────────────────── */}
      <AddToCartButton
        productId={cartId}
        productTitle={cartTitle}
        productPrice={productPrice}
        productImageUrl={cartImageUrl}
        productSlug={productSlug}
      />
    </div>
  )
}
