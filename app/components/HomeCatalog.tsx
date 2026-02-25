'use client'

import { useSearchParams } from 'next/navigation'
import { useMemo } from 'react'
import ProductCard from './ProductCard'
import type { Product } from '@/types/supabase'

// Mappa macro-categorie → array di category slug del DB
const MACRO_MAP: Record<string, string[]> = {
  audio:      ['Cuffie', 'Microfono', 'Audio Interface', 'Mixer Audio', 'Braccio Microfono'],
  streaming:  ['Webcam', 'Cattura Video', 'Stream Deck', 'Ring Light', 'Illuminazione', 'Fotocamera'],
  gaming:     ['Mouse', 'Tastiera', 'Monitor 144hz', 'Monitor', 'Mousepad', 'Sedia Gaming', 'Controller'],
  smarthome:  ['LED', 'Sensori', 'Robot'],
  accessori:  ['Accessori', 'SSD', 'RAM', 'Hub USB-C', 'Docking Station'],
}

const MACRO_LABELS: { key: string; emoji: string; label: string; sub: string; color: string }[] = [
  { key: 'audio',     emoji: '🎧', label: 'AUDIO',        sub: 'Cuffie, Mic, DAC',        color: 'from-violet-900/30' },
  { key: 'streaming', emoji: '🎥', label: 'STREAMING',    sub: 'Webcam, Deck, Luci',       color: 'from-sky-900/30' },
  { key: 'gaming',    emoji: '🎮', label: 'GAMING',       sub: 'Tastiere, Mouse, Sedie',   color: 'from-emerald-900/30' },
  { key: 'smarthome', emoji: '🏠', label: 'SMART HOME',   sub: 'LED, Sensori, Robot',      color: 'from-orange-900/30' },
  { key: 'accessori', emoji: '🔌', label: 'ACCESSORI',    sub: 'Cavi, Hub, Stand',         color: 'from-rose-900/30' },
]

interface Props {
  products: Product[]
}

export default function HomeCatalog({ products }: Props) {
  const searchParams = useSearchParams()
  const q = searchParams.get('q') ?? ''
  const category = searchParams.get('category') ?? ''
  const macro = searchParams.get('macro') ?? ''

  const filtered = useMemo(() => {
    let list = products
    if (q) {
      const lq = q.toLowerCase()
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(lq) ||
          p.category.toLowerCase().includes(lq) ||
          (p.description?.toLowerCase().includes(lq) ?? false)
      )
    }
    if (category) {
      list = list.filter((p) => p.category === category)
    }
    if (macro && MACRO_MAP[macro]) {
      const allowed = new Set(MACRO_MAP[macro])
      list = list.filter((p) => allowed.has(p.category))
    }
    return list
  }, [products, q, category, macro])

  const activeLabel = q
    ? `Risultati per "${q}"`
    : category
    ? category
    : macro
    ? MACRO_LABELS.find((m) => m.key === macro)?.label ?? 'Prodotti'
    : 'Tutti i Prodotti'

  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      {/* Section header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary/60">
            {filtered.length} prodott{filtered.length === 1 ? 'o' : 'i'}
          </p>
          <h2 className="text-lg font-bold text-text-primary">{activeLabel}</h2>
        </div>
        {(q || category || macro) && (
          <a
            href="/"
            className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary transition hover:border-accent hover:text-accent"
          >
            Rimuovi filtro ×
          </a>
        )}
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 md:gap-4">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center py-16 text-center">
          <p className="text-4xl">🔍</p>
          <p className="mt-3 font-semibold text-text-primary">Nessun risultato</p>
          <p className="mt-1 text-sm text-text-secondary">Prova con un termine diverso</p>
          <a
            href="/"
            className="mt-5 rounded-xl border border-border px-5 py-2.5 text-sm text-text-secondary transition hover:border-accent hover:text-accent"
          >
            Vedi tutti i prodotti
          </a>
        </div>
      )}
    </section>
  )
}
