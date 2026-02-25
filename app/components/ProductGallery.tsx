'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react'
import { useGalleryIndex } from '@/app/context/ProductGalleryContext'

interface Props {
  imageUrl?: string | null
  title: string
}

/** Splitta la stringa per virgole e restituisce URL puliti */
function parseImages(raw?: string | null): string[] {
  if (!raw) return []
  return raw.split(',').map((u) => u.trim()).filter(Boolean)
}

export default function ProductGallery({ imageUrl, title }: Props) {
  const images = parseImages(imageUrl)
  const galleryCtx = useGalleryIndex()

  // Se c'è un context (es. ColorSelector attivo), usa il suo indice; altrimenti stato locale
  const [localIndex, setLocalIndex] = useState(0)
  const activeIndex = galleryCtx ? Math.min(galleryCtx.activeIndex, images.length - 1) : localIndex

  const [zoomed, setZoomed] = useState(false)
  const [touchStartX, setTouchStartX] = useState<number | null>(null)

  const current = images[activeIndex] ?? null
  const total = images.length

  function goTo(i: number) {
    const clamped = Math.max(0, Math.min(i, total - 1))
    setZoomed(false)
    if (galleryCtx) {
      galleryCtx.setActiveIndex(clamped)
    } else {
      setLocalIndex(clamped)
    }
  }

  // ── Swipe su mobile ──────────────────────────────────────
  function onTouchStart(e: React.TouchEvent) {
    setTouchStartX(e.touches[0].clientX)
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX === null) return
    const dx = touchStartX - e.changedTouches[0].clientX
    if (Math.abs(dx) > 40) dx > 0 ? goTo(activeIndex + 1) : goTo(activeIndex - 1)
    setTouchStartX(null)
  }

  // ── Nessuna immagine ────────────────────────────────────
  if (total === 0) {
    return (
      <div className="space-y-3">
        <div
          className="flex items-center justify-center rounded-2xl border border-border bg-bg-card text-7xl text-text-secondary/30"
          style={{ aspectRatio: '1 / 1' }}
        >
          🎮
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">

      {/* ── Immagine principale ─────────────────────────────── */}
      <div
        className={[
          'group relative overflow-hidden rounded-2xl border border-border bg-bg-card',
          'transition-all duration-300 select-none',
          current ? (zoomed ? 'cursor-zoom-out' : 'cursor-zoom-in') : '',
        ].join(' ')}
        style={{ aspectRatio: '1 / 1' }}
        onClick={() => current && setZoomed((z) => !z)}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Top accent glow */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={activeIndex}
          src={current!}
          alt={`${title} – immagine ${activeIndex + 1} di ${total}`}
          className={[
            'h-full w-full object-contain transition-all duration-500',
            zoomed ? 'scale-[1.4] p-2' : 'scale-100 p-8',
          ].join(' ')}
          loading={activeIndex === 0 ? 'eager' : 'lazy'}
        />

        {/* ── Frecce prev/next ─── (solo con più immagini e non zoomato) */}
        {total > 1 && !zoomed && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); goTo(activeIndex - 1) }}
              disabled={activeIndex === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-bg-dark/80 text-text-primary backdrop-blur-sm transition-all hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-20"
              aria-label="Immagine precedente"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); goTo(activeIndex + 1) }}
              disabled={activeIndex === total - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-bg-dark/80 text-text-primary backdrop-blur-sm transition-all hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-20"
              aria-label="Immagine successiva"
            >
              <ChevronRight size={18} />
            </button>
          </>
        )}

        {/* ── Dot indicator ─── (centro, basso) */}
        {total > 1 && !zoomed && (
          <div
            className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-border bg-bg-dark/80 px-3 py-1.5 backdrop-blur-sm"
            onClick={(e) => e.stopPropagation()}
          >
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={[
                  'rounded-full transition-all duration-200',
                  i === activeIndex
                    ? 'h-1.5 w-4 bg-accent'
                    : 'h-1.5 w-1.5 bg-border hover:bg-text-secondary',
                ].join(' ')}
                aria-label={`Vai all'immagine ${i + 1}`}
              />
            ))}
          </div>
        )}

        {/* ── Zoom hint ─── */}
        <div className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-1.5 rounded-lg border border-border bg-bg-dark/80 px-2.5 py-1.5 text-xs text-text-secondary backdrop-blur-sm opacity-0 transition-opacity group-hover:opacity-100">
          {zoomed ? <ZoomOut size={12} /> : <ZoomIn size={12} />}
          {zoomed ? 'Riduci' : 'Ingrandisci'}
        </div>

        {/* ── Badge ─── */}
        <div className="absolute left-3 top-3 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-accent">
          Premium Gaming
        </div>
      </div>

      {/* ── Thumbnail strip ─── (visibile solo con 2+ immagini) */}
      {total > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {images.map((url, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-pressed={i === activeIndex}
              aria-label={`Visualizza immagine ${i + 1}`}
              className={[
                'relative aspect-square h-[70px] shrink-0 overflow-hidden rounded-xl border transition-all',
                'bg-bg-card hover:scale-[1.04]',
                i === activeIndex
                  ? 'border-accent shadow-[0_0_10px_rgba(255,193,7,0.2)]'
                  : 'border-border opacity-45 hover:opacity-85',
              ].join(' ')}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`${title} – vista ${i + 1}`}
                className="h-full w-full object-contain p-1.5"
                loading="lazy"
              />
              {/* Active bottom line */}
              {i === activeIndex && (
                <div className="absolute inset-x-0 bottom-0 h-0.5 bg-accent" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
