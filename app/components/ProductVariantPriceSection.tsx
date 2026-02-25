'use client'

/**
 * ProductVariantPriceSection
 *
 * Client component that:
 * 1. Renders the price block (updates dynamically when a priced variant is selected)
 * 2. Renders generic variant buttons (size/material/connectivity/etc.)
 * 3. Renders color circles (from the `colors` column)
 * 4. Renders AddToCartButton with the correct cart metadata
 *
 * Variant format (sizes column):
 *   - "M:20, L:30, XL:40"        → variant with price override
 *   - "Rosso, Verde, Blu"         → variant without price (label only)
 *   - "900x400mm:35, Vetro Temperato:50, Senza fili"  → mixed
 */

import { useState } from 'react'
import { Truck } from 'lucide-react'
import AddToCartButton from './AddToCartButton'
import { useGalleryIndex } from '@/app/context/ProductGalleryContext'

// ── Color helpers ──────────────────────────────────────────────────────────────
const COLOR_MAP: Record<string, string> = {
  bianco: '#f0ede8', 'bianco ghiaccio': '#eef0f3', 'marmo bianco': '#e8e4dc',
  nero: '#1c1c1c', 'nero opaco': '#2a2a2a', 'marmo nero': '#2d2d2d',
  grigio: '#6b7280', 'grigio scuro': '#374151', 'grigio chiaro': '#9ca3af',
  rosso: '#ef4444', blu: '#3b82f6', 'blu navy': '#1e3a5f',
  verde: '#22c55e', 'verde militare': '#4a5c3f',
  giallo: '#eab308', arancione: '#f97316', viola: '#8b5cf6',
  rosa: '#ec4899', dorato: '#d4af37', argento: '#c0c0c0',
  marrone: '#78350f', beige: '#d9c9a8', sabbia: '#c8b89a',
  turchese: '#0d9488', cobalto: '#1e40af',
}

function colorHex(name: string): string {
  return COLOR_MAP[name.toLowerCase().trim()] ?? '#6b7280'
}

function isLight(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 160
}

// ── Variant parsing ────────────────────────────────────────────────────────────
interface ParsedVariant {
  label: string
  price: number | null  // null = use product base price
}

/**
 * Parse sizes string into structured variants.
 * "M:20, L:30, XL:40"         → [{label:"M", price:20}, ...]
 * "Rosso, Verde"               → [{label:"Rosso", price:null}, ...]
 * "900x400mm:35, Vetro:50.00"  → [{label:"900x400mm", price:35}, ...]
 */
function parseVariants(raw: string): ParsedVariant[] {
  return raw
    .split(',')
    .map((part) => {
      const trimmed = part.trim()
      if (!trimmed) return null
      const colonIdx = trimmed.lastIndexOf(':')
      if (colonIdx === -1) return { label: trimmed, price: null }
      const potentialPrice = trimmed.slice(colonIdx + 1).trim()
      const parsed = parseFloat(potentialPrice)
      if (!isNaN(parsed) && potentialPrice !== '') {
        return { label: trimmed.slice(0, colonIdx).trim(), price: parsed }
      }
      return { label: trimmed, price: null }
    })
    .filter((v): v is ParsedVariant => v !== null && v.label !== '')
}

// ── Props ──────────────────────────────────────────────────────────────────────
interface Props {
  basePrice: number
  priceOriginal: number | null
  sizesRaw: string | null       // raw sizes column value
  colorsRaw: string | null      // raw colors column value
  imageUrls: string[]
  productId: string
  productTitle: string
  productSlug: string
  isDirectSell: boolean
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function ProductVariantPriceSection({
  basePrice,
  priceOriginal,
  sizesRaw,
  colorsRaw,
  imageUrls,
  productId,
  productTitle,
  productSlug,
  isDirectSell,
}: Props) {
  const galleryCtx = useGalleryIndex()

  // Parse variants from sizes column
  const variants: ParsedVariant[] = sizesRaw ? parseVariants(sizesRaw) : []

  // Parse colors
  const colors: string[] = colorsRaw
    ? colorsRaw.split(',').map((c) => c.trim()).filter(Boolean)
    : []

  // State
  const [selectedVariantIdx, setSelectedVariantIdx] = useState<number | null>(
    variants.length > 0 ? 0 : null
  )
  const [selectedColorIdx, setSelectedColorIdx] = useState<number>(0)

  // Compute effective price
  const selectedVariant =
    selectedVariantIdx !== null ? variants[selectedVariantIdx] : null
  const effectivePrice =
    selectedVariant?.price != null ? selectedVariant.price : basePrice

  const discount =
    priceOriginal && priceOriginal > effectivePrice
      ? Math.round((1 - effectivePrice / priceOriginal) * 100)
      : 0

  // Cart metadata
  const cartParts = [productTitle]
  if (selectedVariant) cartParts.push(selectedVariant.label)
  if (colors.length > 0) cartParts.push(colors[selectedColorIdx])
  const cartTitle = cartParts.join(' — ')
  const cartId = [productId, selectedVariant?.label ?? '', colors[selectedColorIdx] ?? '']
    .filter(Boolean)
    .join('-')
    .replace(/\s+/g, '_')
  const cartImageUrl = imageUrls[selectedColorIdx] ?? imageUrls[0]

  function handleColorSelect(idx: number) {
    setSelectedColorIdx(idx)
    galleryCtx?.setActiveIndex(idx)
  }

  return (
    <div className="flex flex-col gap-5">
      {/* ── PRICE BLOCK ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-bg-card p-4">
        {/* Availability badge */}
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-badge-green/15 px-3 py-1">
          <span className="h-2 w-2 animate-pulse rounded-full bg-badge-green" />
          <span className="text-xs font-semibold text-badge-green">
            {isDirectSell ? 'Disponibilità Immediata' : 'Disponibilità Immediata'}
          </span>
        </div>

        {/* Dynamic price */}
        <div className="flex items-baseline gap-3">
          <span className="text-4xl font-bold text-accent">
            {effectivePrice > 0
              ? `${effectivePrice.toFixed(2)}€`
              : 'Prezzo su richiesta'}
          </span>
          {priceOriginal && priceOriginal > effectivePrice && (
            <>
              <span className="text-lg text-text-secondary line-through">
                {priceOriginal.toFixed(2)}€
              </span>
              <span className="rounded-full bg-badge-green px-2.5 py-0.5 text-sm font-bold text-white">
                -{discount}%
              </span>
            </>
          )}
        </div>
        <p className="mt-1 text-xs text-text-secondary">Prezzo aggiornato · IVA inclusa</p>

        {/* Shipping badge */}
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-neon-green/20 bg-neon-green/5 px-3 py-2.5">
          <Truck className="mt-0.5 h-4 w-4 shrink-0 text-neon-green" />
          <div>
            <p className="text-xs font-semibold text-neon-green">
              Spedizione Standard Assicurata: 7–14 giorni lavorativi
            </p>
            <p className="mt-0.5 text-[11px] text-text-secondary">
              Controllo qualità incluso prima della partenza
            </p>
          </div>
        </div>
      </div>

      {/* ── VARIANTI GENERICHE ─────────────────────────────────── */}
      {variants.length > 0 && (
        <div>
          <div className="mb-2.5 flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Variante
            </span>
            {selectedVariant && (
              <span className="text-sm font-semibold text-text-primary">
                — {selectedVariant.label}
                {selectedVariant.price != null && (
                  <span className="ml-1 text-accent">({selectedVariant.price.toFixed(2)}€)</span>
                )}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2.5">
            {variants.map((v, idx) => {
              const isSelected = selectedVariantIdx === idx
              return (
                <button
                  key={`${v.label}-${idx}`}
                  onClick={() => setSelectedVariantIdx(idx)}
                  aria-pressed={isSelected}
                  aria-label={`Variante ${v.label}${v.price != null ? ` — ${v.price.toFixed(2)}€` : ''}`}
                  className={[
                    'min-h-[44px] rounded-xl border px-4 py-2 text-sm font-semibold transition-all duration-150',
                    isSelected
                      ? 'border-accent bg-accent/15 text-accent shadow-sm shadow-accent/20'
                      : 'border-border bg-bg-card text-text-secondary hover:border-accent/60 hover:text-text-primary',
                  ].join(' ')}
                >
                  {v.label}
                  {v.price != null && (
                    <span className={`ml-1.5 text-xs ${isSelected ? 'text-accent' : 'text-text-secondary'}`}>
                      {v.price.toFixed(2)}€
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── COLORI ─────────────────────────────────────────────── */}
      {colors.length > 0 && (
        <div>
          <div className="mb-2.5 flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Colore
            </span>
            {colors[selectedColorIdx] && (
              <span className="text-sm font-semibold text-text-primary">
                — {colors[selectedColorIdx]}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-4">
            {colors.map((color, idx) => {
              const isSelected = selectedColorIdx === idx
              const hex = colorHex(color)
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
                    {isSelected && (
                      <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4 drop-shadow-sm" aria-hidden>
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
                  <span
                    className={[
                      'max-w-[64px] text-center text-[10px] font-medium leading-tight transition-colors',
                      isSelected ? 'text-accent' : 'text-text-secondary group-hover:text-text-primary',
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

      {/* ── ADD TO CART ─────────────────────────────────────────── */}
      <AddToCartButton
        productId={cartId || productId}
        productTitle={cartTitle}
        productPrice={effectivePrice}
        productImageUrl={cartImageUrl}
        productSlug={productSlug}
      />
    </div>
  )
}
