'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Palette, Tag, Zap, MoreHorizontal, Check } from 'lucide-react'

interface Variant {
  id: string
  variant_type: string
  name: string
  color_hex?: string | null
  price_override?: number | null
  stock_quantity: number
  image_url?: string | null
  sort_order: number
}

interface Product {
  id: string
  title: string
  slug: string
  price_current: number
}

const TYPE_OPTIONS = [
  { value: 'color',  label: 'Colore',  icon: Palette },
  { value: 'size',   label: 'Taglia',  icon: Tag },
  { value: 'switch', label: 'Switch',  icon: Zap },
  { value: 'other',  label: 'Altro',   icon: MoreHorizontal },
]

const PRESET_COLORS = [
  { name: 'Nero',         hex: '#1a1a1a' },
  { name: 'Bianco',       hex: '#f5f5f5' },
  { name: 'Rosso',        hex: '#dc2626' },
  { name: 'Blu',          hex: '#2563eb' },
  { name: 'Verde',        hex: '#16a34a' },
  { name: 'Grigio',       hex: '#6b7280' },
  { name: 'Viola',        hex: '#7c3aed' },
  { name: 'Rosa',         hex: '#db2777' },
  { name: 'Arancio',      hex: '#ea580c' },
  { name: 'Oro',          hex: '#d97706' },
  { name: 'Argento',      hex: '#94a3b8' },
  { name: 'Bianco Artico',hex: '#e2e8f0' },
]

export default function AdminVariantManager() {
  const [products, setProducts]       = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [variants, setVariants]       = useState<Variant[]>([])
  const [searchQ, setSearchQ]         = useState('')
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [searching, setSearching]     = useState(false)
  const [loading, setLoading]         = useState(false)
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState('')
  const [success, setSuccess]         = useState('')
  const [isOpen, setIsOpen]           = useState(false)

  // Form nuova variante
  const [newType,      setNewType]      = useState('color')
  const [newName,      setNewName]      = useState('')
  const [newHex,       setNewHex]       = useState('#1a1a1a')
  const [newStock,     setNewStock]     = useState(10)
  const [newPrice,     setNewPrice]     = useState('')
  const [showPresets,  setShowPresets]  = useState(false)

  const fetchVariants = useCallback(async (productId: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/variants?product_id=${productId}`)
      const data = await res.json()
      if (res.ok) setVariants(data.variants ?? [])
    } catch { /* silenzioso */ } finally { setLoading(false) }
  }, [])

  async function searchProducts(q: string) {
    if (q.length < 2) { setSearchResults([]); return }
    setSearching(true)
    try {
      const res = await fetch(`/api/admin/products-search?q=${encodeURIComponent(q)}`)
      if (res.ok) {
        const data = await res.json()
        setSearchResults(data.products ?? [])
      }
    } catch { /* silenzioso */ } finally { setSearching(false) }
  }

  function selectProduct(p: Product) {
    setSelectedProduct(p)
    setSearchQ('')
    setSearchResults([])
    fetchVariants(p.id)
    setError('')
    setSuccess('')
  }

  async function handleAddVariant() {
    if (!selectedProduct || !newName.trim()) return
    setError('')
    setSaving(true)
    try {
      const res = await fetch('/api/admin/variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id:     selectedProduct.id,
          variant_type:   newType,
          name:           newName.trim(),
          color_hex:      newType === 'color' ? newHex : null,
          price_override: newPrice ? parseFloat(newPrice) : null,
          stock_quantity: newStock,
          sort_order:     variants.length,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Errore salvataggio'); return }
      setVariants(prev => [...prev, data.variant])
      setSuccess(`Variante "${newName}" aggiunta!`)
      setNewName('')
      setNewPrice('')
      setNewStock(10)
      setTimeout(() => setSuccess(''), 3000)
    } catch { setError('Errore di rete') } finally { setSaving(false) }
  }

  async function handleUpdateStock(variantId: string, qty: number) {
    try {
      const res = await fetch('/api/admin/variants', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: variantId, stock_quantity: qty }),
      })
      if (res.ok) {
        setVariants(prev => prev.map(v => v.id === variantId ? { ...v, stock_quantity: qty } : v))
      }
    } catch { /* silenzioso */ }
  }

  async function handleDelete(variantId: string, name: string) {
    if (!confirm(`Eliminare la variante "${name}"?`)) return
    try {
      const res = await fetch(`/api/admin/variants?id=${variantId}`, { method: 'DELETE' })
      if (res.ok) {
        setVariants(prev => prev.filter(v => v.id !== variantId))
        setSuccess(`Variante "${name}" eliminata`)
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch { /* silenzioso */ }
  }

  function applyPreset(preset: { name: string; hex: string }) {
    setNewName(preset.name)
    setNewHex(preset.hex)
    setShowPresets(false)
  }

  const typeIcon = (t: string) => {
    const found = TYPE_OPTIONS.find(o => o.value === t)
    return found ? found.label : t
  }

  return (
    <section className="rounded-xl border border-border bg-bg-card">
      {/* Accordion header */}
      <button
        type="button"
        onClick={() => setIsOpen(v => !v)}
        className="flex w-full items-center justify-between px-6 py-4 text-left"
        aria-expanded={isOpen}
      >
        <div>
          <h2 className="text-sm font-semibold text-accent">Step 4</h2>
          <p className="text-lg font-bold text-text-primary">Gestione Varianti (Colori, Taglie, Switch)</p>
          <p className="mt-0.5 text-xs text-text-secondary">
            Associa colori / taglie a un prodotto esistente con stock individuale
          </p>
        </div>
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-lg font-bold text-text-secondary transition hover:border-accent hover:text-accent">
          {isOpen ? '−' : '+'}
        </span>
      </button>

      {isOpen && (
        <div className="border-t border-border px-6 pb-6 pt-5">

          {/* Feedback */}
          {error && (
            <div className="mb-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-400">{error}</div>
          )}
          {success && (
            <div className="mb-4 rounded-xl border border-badge-green/30 bg-badge-green/10 px-4 py-3 text-sm text-badge-green">
              ✓ {success}
            </div>
          )}

          {/* ── 1. Cerca e seleziona prodotto ── */}
          <div className="mb-6">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Prodotto target
            </label>

            {selectedProduct ? (
              <div className="flex items-center justify-between rounded-xl border border-accent/30 bg-accent/5 px-4 py-3">
                <div>
                  <p className="font-semibold text-text-primary">{selectedProduct.title}</p>
                  <p className="text-xs text-text-secondary">
                    Prezzo base: <strong className="text-accent">{selectedProduct.price_current.toFixed(2)}€</strong>
                    {' · '}
                    {variants.length} varianti
                  </p>
                </div>
                <button
                  onClick={() => { setSelectedProduct(null); setVariants([]) }}
                  className="text-xs text-text-secondary underline decoration-dotted hover:text-text-primary"
                >
                  Cambia
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={searchQ}
                  onChange={(e) => { setSearchQ(e.target.value); searchProducts(e.target.value) }}
                  placeholder="Cerca prodotto per nome..."
                  className="w-full rounded-xl border border-border bg-bg-dark px-4 py-3 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:outline-none"
                />
                {searching && <span className="absolute right-4 top-3.5 text-xs text-text-secondary">...</span>}
                {searchResults.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-border bg-bg-card shadow-xl">
                    {searchResults.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => selectProduct(p)}
                        className="flex w-full items-center justify-between px-4 py-3 text-sm transition hover:bg-bg-dark"
                      >
                        <span className="truncate text-text-primary">{p.title}</span>
                        <span className="ml-4 shrink-0 font-bold text-accent">{p.price_current.toFixed(2)}€</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── 2. Varianti esistenti ── */}
          {selectedProduct && (
            <>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                </div>
              ) : variants.length > 0 ? (
                <div className="mb-6">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-secondary">
                    Varianti esistenti ({variants.length})
                  </p>
                  <div className="space-y-2">
                    {variants.map(v => (
                      <div
                        key={v.id}
                        className="flex items-center gap-3 rounded-xl border border-border bg-bg-dark px-4 py-3"
                      >
                        {/* Color dot */}
                        {v.color_hex ? (
                          <span
                            className="h-9 w-9 shrink-0 rounded-full border-2 border-border shadow-sm"
                            style={{ backgroundColor: v.color_hex }}
                          />
                        ) : (
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-bg-card text-xs font-bold text-text-secondary">
                            {typeIcon(v.variant_type)[0]}
                          </span>
                        )}

                        {/* Name + type */}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-text-primary">{v.name}</p>
                          <p className="text-[11px] text-text-secondary">
                            {typeIcon(v.variant_type)}
                            {v.price_override ? ` · ${v.price_override.toFixed(2)}€` : ''}
                          </p>
                        </div>

                        {/* Stock control — min 44px touch target */}
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleUpdateStock(v.id, Math.max(0, v.stock_quantity - 1))}
                            className="flex h-[44px] w-[44px] items-center justify-center rounded-lg border border-border text-text-secondary transition hover:border-accent hover:text-accent"
                            aria-label="Diminuisci stock"
                          >
                            −
                          </button>
                          <input
                            type="number"
                            min={0}
                            value={v.stock_quantity}
                            onChange={(e) => handleUpdateStock(v.id, parseInt(e.target.value) || 0)}
                            className="h-[44px] w-14 rounded-lg border border-border bg-bg-card text-center text-sm font-bold text-text-primary focus:border-accent focus:outline-none"
                          />
                          <button
                            onClick={() => handleUpdateStock(v.id, v.stock_quantity + 1)}
                            className="flex h-[44px] w-[44px] items-center justify-center rounded-lg border border-border text-text-secondary transition hover:border-accent hover:text-accent"
                            aria-label="Aumenta stock"
                          >
                            +
                          </button>
                        </div>

                        {/* Stock badge */}
                        <span className={`hidden shrink-0 rounded-full px-2 py-1 text-[10px] font-bold sm:block ${
                          v.stock_quantity === 0
                            ? 'bg-red-400/15 text-red-400'
                            : v.stock_quantity <= 3
                              ? 'bg-amber-400/15 text-amber-400'
                              : 'bg-neon-green/15 text-neon-green'
                        }`}>
                          {v.stock_quantity === 0 ? 'Esaurito' : `${v.stock_quantity} pz`}
                        </span>

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(v.id, v.name)}
                          className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-lg text-text-secondary/50 transition hover:text-red-400"
                          aria-label={`Elimina variante ${v.name}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mb-6 rounded-xl border border-dashed border-border p-6 text-center">
                  <p className="text-sm text-text-secondary">Nessuna variante — aggiungine una qui sotto</p>
                </div>
              )}

              {/* ── 3. Form aggiungi variante ── */}
              <div className="rounded-xl border border-accent/20 bg-accent/3 p-5">
                <p className="mb-4 text-sm font-bold text-text-primary">+ Aggiungi variante</p>

                <div className="grid gap-4">
                  {/* Tipo */}
                  <div>
                    <label className="mb-2 block text-xs font-medium text-text-secondary">Tipo variante</label>
                    <div className="flex flex-wrap gap-2">
                      {TYPE_OPTIONS.map(opt => {
                        const Icon = opt.icon
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setNewType(opt.value)}
                            className={`flex h-[44px] items-center gap-1.5 rounded-xl border px-4 text-sm font-semibold transition-all ${
                              newType === opt.value
                                ? 'border-accent bg-accent/15 text-accent'
                                : 'border-border bg-bg-card text-text-secondary hover:border-accent/60'
                            }`}
                          >
                            <Icon size={14} />
                            {opt.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Nome + Preset colori */}
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="text-xs font-medium text-text-secondary">Nome variante *</label>
                      {newType === 'color' && (
                        <button
                          type="button"
                          onClick={() => setShowPresets(p => !p)}
                          className="text-[11px] text-accent underline decoration-dotted hover:no-underline"
                        >
                          {showPresets ? 'Nascondi preset' : 'Colori preset →'}
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder={newType === 'color' ? 'es. Nero Opaco' : newType === 'size' ? 'es. XL' : 'es. Red Linear'}
                      className="h-[44px] w-full rounded-xl border border-border bg-bg-dark px-4 text-sm text-text-primary placeholder:text-text-secondary/40 focus:border-accent focus:outline-none"
                    />

                    {/* Preset colors grid */}
                    {showPresets && newType === 'color' && (
                      <div className="mt-2 grid grid-cols-6 gap-2">
                        {PRESET_COLORS.map(preset => (
                          <button
                            key={preset.hex}
                            type="button"
                            onClick={() => applyPreset(preset)}
                            title={preset.name}
                            className={`relative h-[44px] w-full rounded-xl border-2 transition-all hover:scale-105 ${
                              newHex === preset.hex ? 'border-accent scale-110' : 'border-border'
                            }`}
                            style={{ backgroundColor: preset.hex }}
                          >
                            {newHex === preset.hex && (
                              <Check size={14} className="absolute inset-0 m-auto text-white drop-shadow" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Color hex picker */}
                  {newType === 'color' && (
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-text-secondary">Colore HEX</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={newHex}
                          onChange={(e) => setNewHex(e.target.value)}
                          className="h-[44px] w-[44px] cursor-pointer rounded-xl border border-border bg-transparent p-0.5"
                        />
                        <input
                          type="text"
                          value={newHex}
                          onChange={(e) => setNewHex(e.target.value)}
                          placeholder="#1a1a1a"
                          className="h-[44px] flex-1 rounded-xl border border-border bg-bg-dark px-4 font-mono text-sm text-text-primary focus:border-accent focus:outline-none"
                        />
                        {/* Live preview */}
                        <span
                          className="h-[44px] w-[44px] shrink-0 rounded-xl border-2 border-border shadow-sm"
                          style={{ backgroundColor: newHex }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Stock + Prezzo override */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-text-secondary">Stock iniziale</label>
                      <input
                        type="number"
                        min={0}
                        value={newStock}
                        onChange={(e) => setNewStock(parseInt(e.target.value) || 0)}
                        className="h-[44px] w-full rounded-xl border border-border bg-bg-dark px-4 text-sm text-text-primary focus:border-accent focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                        Prezzo variante € <span className="text-text-secondary/50">(opzionale)</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={newPrice}
                        onChange={(e) => setNewPrice(e.target.value)}
                        placeholder={selectedProduct?.price_current.toFixed(2)}
                        className="h-[44px] w-full rounded-xl border border-border bg-bg-dark px-4 text-sm text-text-primary placeholder:text-text-secondary/40 focus:border-accent focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Submit */}
                  <button
                    type="button"
                    onClick={handleAddVariant}
                    disabled={saving || !newName.trim()}
                    className="flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-accent text-base font-bold text-bg-dark shadow-lg shadow-accent/20 transition-all hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {saving ? (
                      <><div className="h-4 w-4 animate-spin rounded-full border-2 border-bg-dark border-t-transparent" /> Salvataggio...</>
                    ) : (
                      <><Plus size={18} /> Aggiungi variante</>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  )
}
