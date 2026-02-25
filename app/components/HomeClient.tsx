'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { Search, X } from 'lucide-react'
import ProductCard from './ProductCard'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import type { Product } from '@/types/supabase'

const MACRO_MAP: Record<string, string[]> = {
  audio:      ['Cuffie', 'Microfono', 'Audio Interface', 'Mixer Audio', 'Braccio Microfono'],
  streaming:  ['Webcam', 'Cattura Video', 'Stream Deck', 'Ring Light', 'Illuminazione', 'Fotocamera'],
  gaming:     ['Mouse', 'Tastiera', 'Monitor 144hz', 'Monitor', 'Mousepad', 'Sedia Gaming', 'Controller'],
  smarthome:  ['LED', 'Sensori', 'Robot'],
  accessori:  ['Accessori', 'SSD', 'RAM', 'Hub USB-C', 'Docking Station'],
}

const MACRO_LABELS: Record<string, string> = {
  audio:      'Audio',
  streaming:  'Streaming',
  gaming:     'Gaming',
  smarthome:  'Smart Home',
  accessori:  'Accessori',
}

interface Props {
  initialProducts: Product[]
}

export default function HomeClient({ initialProducts }: Props) {
  const searchParams = useSearchParams()
  const macro = searchParams.get('macro') ?? ''

  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Product[] | null>(null)
  const [loading, setLoading] = useState(false)

  // Live Supabase search with 300ms debounce
  useEffect(() => {
    const q = query.trim()
    if (!q) {
      setSearchResults(null)
      setLoading(false)
      return
    }
    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const sb = createBrowserSupabaseClient()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let req: any = sb
          .from('products')
          .select('*')
          .or(`title.ilike.%${q}%,description.ilike.%${q}%`)
        if (macro && MACRO_MAP[macro]) {
          req = req.in('category', MACRO_MAP[macro])
        }
        const { data } = await req.order('created_at', { ascending: false })
        setSearchResults(data ?? [])
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query, macro])

  const displayProducts = useMemo(() => {
    if (searchResults !== null) return searchResults
    if (macro && MACRO_MAP[macro]) {
      const allowed = new Set(MACRO_MAP[macro])
      return initialProducts.filter((p) => allowed.has(p.category))
    }
    return initialProducts
  }, [searchResults, initialProducts, macro])

  const activeLabel = query.trim()
    ? `Risultati per "${query.trim()}"`
    : macro
    ? (MACRO_LABELS[macro] ?? 'Prodotti')
    : 'Tutti i Prodotti'

  const hasFilter = !!query.trim() || !!macro

  return (
    <section className="mx-auto max-w-7xl px-4 py-8">
      {/* ── Live Search Bar ─────────────────────────────────────────── */}
      <div className="mb-8">
        <div
          className={[
            'flex items-center gap-3 rounded-2xl border px-5 py-3.5',
            'border-white/10 bg-white/5 backdrop-blur-md',
            'transition-all duration-200',
            'focus-within:border-accent/60 focus-within:shadow-[0_0_0_3px_rgba(255,193,7,0.08)]',
          ].join(' ')}
        >
          <Search size={18} className="shrink-0 text-accent" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca tastiere, microfoni, smart home..."
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-secondary/55 focus:outline-none md:text-base"
            autoComplete="off"
          />
          {loading && (
            <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
          )}
          {query && !loading && (
            <button
              onClick={() => setQuery('')}
              className="shrink-0 text-text-secondary transition hover:text-text-primary"
              aria-label="Cancella ricerca"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* ── Section header ────────────────────────────────────────────── */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary/60">
            {loading
              ? 'Ricerca in corso…'
              : `${displayProducts.length} prodott${displayProducts.length === 1 ? 'o' : 'i'}`}
          </p>
          <h2 className="text-lg font-bold text-text-primary">{activeLabel}</h2>
        </div>
        {hasFilter && (
          <a
            href="/"
            className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary transition hover:border-accent hover:text-accent"
          >
            Rimuovi filtro ×
          </a>
        )}
      </div>

      {/* ── Product grid / Empty state ─────────────────────────────── */}
      {displayProducts.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 md:gap-4">
          {displayProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : !loading ? (
        <div className="flex flex-col items-center py-16 text-center">
          <p className="text-4xl">🔍</p>
          <p className="mt-3 font-semibold text-text-primary">Nessun prodotto trovato</p>
          <p className="mt-1 text-sm text-text-secondary">
            {query.trim()
              ? 'Nessun prodotto trovato per la tua ricerca, prova con un altro setup!'
              : 'Nessun prodotto in questa categoria'}
          </p>
          <a
            href="/"
            className="mt-5 rounded-xl border border-border px-5 py-2.5 text-sm text-text-secondary transition hover:border-accent hover:text-accent"
          >
            Vedi tutti i prodotti
          </a>
        </div>
      ) : null}
    </section>
  )
}
