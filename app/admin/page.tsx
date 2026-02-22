'use client'

import { useState, useEffect, useRef } from 'react'

const MARGIN = 0.20 // 20% markup sul prezzo base

const CATEGORIES = [
  'Mouse Gaming',
  'Tastiere Gaming',
  'Monitor Gaming',
  'Cuffie Gaming',
  'Sedie da Gaming',
  'Scrivanie Gaming',
  'Microfoni',
  'Webcam',
  'Controller',
  'Mousepad',
  'Headset',
  'Streaming',
  'Illuminazione',
  'Accessori',
  'Setup Completo',
]

interface BundleItemForm {
  product_id: string
  title: string
  quantity: number
  price: number
}

interface GeneratedProduct {
  title: string
  slug: string
  description: string
  category: string
  specs: Record<string, string | number | boolean>
  price_current: number
  price_original: number | null
  meta_title: string
  meta_description: string
  image_url?: string
  is_bundle: boolean
  bundle_items: BundleItemForm[]
}

interface TopProduct {
  slug: string
  title: string
  count: number
}

interface KitProductItem {
  product_id: string
  title: string
  quantity: number
  price: number
}

export default function AdminPage() {
  const [inputMode, setInputMode] = useState<'text' | 'url'>('text')
  const [rawText, setRawText] = useState('')
  const [productUrl, setProductUrl] = useState('')
  const [product, setProduct] = useState<GeneratedProduct | null>(null)
  const [basePrice, setBasePrice] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const pendingImageUrl = useRef<string | null>(null)

  // Top3 analytics
  const [top3, setTop3] = useState<TopProduct[]>([])

  // Image upload (dentro Step 2 — prodotto generato)
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Step 2 standalone — caricamento immagine indipendente
  const [standaloneUrl, setStandaloneUrl] = useState('')
  const [standaloneUploading, setStandaloneUploading] = useState(false)
  const [standaloneCopied, setStandaloneCopied] = useState(false)
  const [standaloneDragging, setStandaloneDragging] = useState(false)
  const standaloneInputRef = useRef<HTMLInputElement>(null)

  // Kit creator
  const [kitOpen, setKitOpen] = useState(false)
  const [kitTitle, setKitTitle] = useState('')
  const [kitSlug, setKitSlug] = useState('')
  const [kitDescription, setKitDescription] = useState('')
  const [kitDiscount, setKitDiscount] = useState(5)
  const [kitProducts, setKitProducts] = useState<KitProductItem[]>([])
  const [kitSearch, setKitSearch] = useState('')
  const [kitSearchResults, setKitSearchResults] = useState<{ id: string; title: string; slug: string; price_current: number }[]>([])
  const [kitSearching, setKitSearching] = useState(false)
  const [kitSaving, setKitSaving] = useState(false)
  // Aggiunta manuale prodotto (sostituisce prompt())
  const [manualId, setManualId] = useState('')
  const [manualTitle, setManualTitle] = useState('')
  const [manualPrice, setManualPrice] = useState('')
  const [showManualForm, setShowManualForm] = useState(false)
  const [kitError, setKitError] = useState('')
  const [kitSuccess, setKitSuccess] = useState('')

  useEffect(() => {
    fetchTop3()
  }, [])

  async function fetchTop3() {
    try {
      const res = await fetch('/api/admin/analytics')
      const data = await res.json()
      if (res.ok) setTop3(data.top3 ?? [])
    } catch { /* silenzioso */ }
  }

  async function handleGenerate() {
    setError('')
    setSuccess('')
    setProduct(null)
    setLoading(true)
    pendingImageUrl.current = null

    try {
      let textToSend = rawText

      // Modalità URL: prima fetcha la pagina, poi passa il testo a DeepSeek
      if (inputMode === 'url') {
        if (!productUrl.startsWith('http')) {
          setError('Inserisci un URL valido (es: https://www.amazon.it/...)')
          return
        }
        setLoadingStep('Scaricando la pagina prodotto...')
        const fetchRes = await fetch('/api/admin/fetch-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: productUrl }),
        })
        const fetchData = await fetchRes.json()
        if (!fetchRes.ok) {
          setError(fetchData.error || 'Errore nel recupero URL')
          return
        }
        textToSend = fetchData.text
        if (fetchData.imageUrl) {
          pendingImageUrl.current = fetchData.imageUrl
        }
      }

      setLoadingStep('DeepSeek sta generando il prodotto...')
      const res = await fetch('/api/admin/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: textToSend }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Errore generazione')
        return
      }

      const aiPrice = data.product.price_current ?? 0
      const priceWithMargin = parseFloat((aiPrice * (1 + MARGIN)).toFixed(2))
      setBasePrice(String(aiPrice))
      setProduct({
        is_bundle: false,
        bundle_items: [],
        ...data.product,
        price_current: priceWithMargin,
        // Pre-popola immagine da og:image se disponibile e DeepSeek non ne ha trovata
        image_url: data.product.image_url || pendingImageUrl.current || undefined,
      })
    } catch {
      setError('Errore di rete')
    } finally {
      setLoading(false)
      setLoadingStep('')
    }
  }

  async function handleSave() {
    if (!product) return
    setError('')
    setSuccess('')
    setSaving(true)

    try {
      const res = await fetch('/api/admin/save-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Errore salvataggio')
        return
      }

      const path = product.is_bundle ? 'bundles' : 'products'
      setSuccess(`Salvato! → /${path}/${data.product.slug}`)
      setProduct(null)
      setRawText('')
    } catch {
      setError('Errore di rete')
    } finally {
      setSaving(false)
    }
  }

  function handleFieldChange(field: keyof GeneratedProduct, value: string | number | null) {
    if (!product) return
    setProduct({ ...product, [field]: value })
  }

  async function handleImageUpload(file: File) {
    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/admin/upload-image', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Errore upload immagine')
        return
      }
      handleFieldChange('image_url', data.url)
    } catch {
      setError('Errore upload immagine')
    } finally {
      setUploadingImage(false)
    }
  }

  async function handleStandaloneUpload(file: File) {
    if (!file.type.startsWith('image/')) { setError('Solo file immagine (jpg, png, webp...)'); return }
    setStandaloneUploading(true)
    setStandaloneUrl('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/admin/upload-image', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Errore upload'); return }
      setStandaloneUrl(data.url)
    } catch {
      setError('Errore upload immagine')
    } finally {
      setStandaloneUploading(false)
    }
  }

  async function copyStandaloneUrl() {
    await navigator.clipboard.writeText(standaloneUrl)
    setStandaloneCopied(true)
    setTimeout(() => setStandaloneCopied(false), 2000)
  }

  // Kit slug auto-derivato dal title
  function handleKitTitleChange(v: string) {
    setKitTitle(v)
    setKitSlug(
      v.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
    )
  }

  async function searchProducts(query: string) {
    if (query.length < 2) { setKitSearchResults([]); return }
    setKitSearching(true)
    try {
      const res = await fetch(`/api/admin/products-search?q=${encodeURIComponent(query)}`)
      if (res.ok) {
        const data = await res.json()
        setKitSearchResults(data.products ?? [])
      } else {
        setKitSearchResults([])
      }
    } catch {
      setKitSearchResults([])
    } finally {
      setKitSearching(false)
    }
  }

  function addKitProduct(p: { id: string; title: string; slug: string; price_current: number }) {
    if (kitProducts.find((kp) => kp.product_id === p.id)) return
    setKitProducts((prev) => [...prev, { product_id: p.id, title: p.title, quantity: 1, price: p.price_current }])
    setKitSearch('')
    setKitSearchResults([])
  }

  function removeKitProduct(productId: string) {
    setKitProducts((prev) => prev.filter((p) => p.product_id !== productId))
  }

  function updateKitQty(productId: string, qty: number) {
    setKitProducts((prev) => prev.map((p) => p.product_id === productId ? { ...p, quantity: Math.max(1, qty) } : p))
  }

  const kitTotal = kitProducts.reduce((sum, p) => sum + p.price * p.quantity, 0)
  const kitDiscounted = kitTotal > 0 ? Math.floor(kitTotal * (1 - kitDiscount / 100)) + 0.99 : 0

  async function handleCreateKit() {
    setKitError('')
    setKitSuccess('')
    if (!kitTitle || !kitSlug || !kitDescription || kitProducts.length === 0) {
      setKitError('Compila tutti i campi e aggiungi almeno un prodotto')
      return
    }
    setKitSaving(true)
    try {
      const res = await fetch('/api/admin/create-kit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: kitTitle,
          slug: kitSlug,
          description: kitDescription,
          product_ids: kitProducts.map((p) => ({ product_id: p.product_id, quantity: p.quantity })),
          discount_pct: kitDiscount,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setKitError(data.error || 'Errore creazione kit')
        return
      }
      setKitSuccess(`Kit creato! → /kits/${data.kit.slug} (${data.kit.price_current.toFixed(2)}€)`)
      setKitTitle('')
      setKitSlug('')
      setKitDescription('')
      setKitProducts([])
      setKitDiscount(5)
    } catch {
      setKitError('Errore di rete')
    } finally {
      setKitSaving(false)
    }
  }

  // Margine calcolato
  const baseNum = parseFloat(basePrice)
  const margin = product && !isNaN(baseNum) && baseNum > 0
    ? product.price_current - baseNum
    : null
  const marginPct = margin !== null && baseNum > 0
    ? ((margin / baseNum) * 100).toFixed(0)
    : null

  return (
    <div className="min-h-screen bg-bg-dark">
      {/* Header */}
      <header className="border-b border-border bg-bg-card">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-xl font-bold text-text-primary">Admin &middot; Command Center</h1>
            <p className="text-xs text-text-secondary">Incolla specs → DeepSeek genera → Salva</p>
          </div>
          <div className="flex gap-2">
            <a href="/admin/storefront" className="rounded-lg border border-border px-3 py-2 text-sm text-text-secondary hover:text-accent">
              🎨 Aspetto
            </a>
            <a href="/admin/customers" className="rounded-lg border border-border px-3 py-2 text-sm text-text-secondary hover:text-accent">
              Clienti
            </a>
            <a href="/admin/orders" className="rounded-lg border border-border px-3 py-2 text-sm text-text-secondary hover:text-accent">
              Ordini
            </a>
            <a href="/" className="rounded-lg border border-border px-3 py-2 text-sm text-text-secondary hover:text-accent">
              ← Sito
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        {/* Status messages */}
        {error && (
          <div className="mb-6 rounded-lg border border-badge-red/30 bg-badge-red/10 px-4 py-3 text-sm text-badge-red">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 rounded-lg border border-badge-green/30 bg-badge-green/10 px-4 py-3 text-sm text-badge-green">
            {success}
          </div>
        )}

        {/* Top 3 Prodotti Visti Oggi */}
        <div className="mb-8 rounded-xl border border-border bg-bg-card p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Top 3 prodotti più visti oggi
          </p>
          {top3.length === 0 ? (
            <p className="text-sm text-text-secondary">Nessuna visita registrata oggi.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {top3.map((p, i) => (
                <div key={p.slug} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/20 text-xs font-bold text-accent">
                      {i + 1}
                    </span>
                    <a
                      href={`/products/${p.slug}`}
                      target="_blank"
                      className="text-sm font-medium text-text-primary hover:text-accent"
                    >
                      {p.title}
                    </a>
                  </div>
                  <span className="text-sm font-bold text-accent">{p.count} visite</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Step 1: Raw Input */}
        <section className="mb-8 rounded-xl border border-border bg-bg-card p-6">
          <h2 className="mb-1 text-sm font-semibold text-accent">Step 1</h2>
          <p className="mb-4 text-lg font-bold text-text-primary">Inserisci prodotto</p>

          {/* Tab selector */}
          <div className="mb-5 flex gap-2">
            <button
              onClick={() => { setInputMode('text'); setError('') }}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                inputMode === 'text'
                  ? 'bg-accent text-bg-dark'
                  : 'border border-border text-text-secondary hover:border-accent hover:text-accent'
              }`}
            >
              ✏️ Testo libero
            </button>
            <button
              onClick={() => { setInputMode('url'); setError('') }}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                inputMode === 'url'
                  ? 'bg-accent text-bg-dark'
                  : 'border border-border text-text-secondary hover:border-accent hover:text-accent'
              }`}
            >
              🔗 Da URL prodotto
            </button>
          </div>

          {/* Modalità testo */}
          {inputMode === 'text' && (
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={"Esempio:\nLogitech G Pro X Superlight 2\nSensore HERO 2 44K DPI\n2000Hz polling rate\n60g wireless\nBatteria 95 ore\nPrezzo: €139.99\n\nIncolla qui specifiche da Amazon, schede tecniche, review..."}
              className="mb-4 w-full resize-y rounded-lg border border-border bg-bg-dark px-4 py-3 text-sm leading-relaxed text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:outline-none"
              rows={8}
            />
          )}

          {/* Modalità URL */}
          {inputMode === 'url' && (
            <div className="mb-4">
              <label className="mb-2 block text-xs font-medium text-text-secondary">
                Link prodotto (Amazon, AliExpress, scheda tecnica, qualsiasi pagina web)
              </label>
              <input
                type="url"
                value={productUrl}
                onChange={(e) => setProductUrl(e.target.value)}
                placeholder="https://www.amazon.it/Logitech-Pro-X-Superlight/dp/..."
                className="w-full rounded-lg border border-border bg-bg-dark px-4 py-3 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:outline-none"
              />
              <p className="mt-2 text-xs text-text-secondary">
                Il server scarica la pagina, estrae il testo e DeepSeek genera il prodotto.
                L&apos;immagine og:image viene pre-compilata automaticamente.
              </p>
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={
              loading ||
              (inputMode === 'text' && rawText.trim().length < 10) ||
              (inputMode === 'url' && !productUrl.startsWith('http'))
            }
            className="flex items-center gap-2 rounded-xl bg-neon-purple px-6 py-3 text-sm font-bold text-white transition-all hover:bg-neon-purple/80 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {loadingStep || 'Elaborando...'}
              </>
            ) : (
              'Genera con AI ✨'
            )}
          </button>
        </section>

        {/* Step 2: Carica Immagine Prodotto */}
        <section className="mb-8 rounded-xl border border-border bg-bg-card p-6">
          <h2 className="mb-1 text-sm font-semibold text-accent">Step 2</h2>
          <p className="mb-4 text-lg font-bold text-text-primary">Carica Immagine Prodotto</p>

          {/* Drop Zone */}
          <div
            onClick={() => standaloneInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setStandaloneDragging(true) }}
            onDragLeave={() => setStandaloneDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setStandaloneDragging(false)
              const file = e.dataTransfer.files?.[0]
              if (file) handleStandaloneUpload(file)
            }}
            className={`relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed transition-colors ${
              standaloneDragging
                ? 'border-accent bg-accent/5'
                : 'border-border bg-bg-dark hover:border-accent/50 hover:bg-accent/3'
            } ${standaloneUploading ? 'pointer-events-none opacity-60' : ''} ${standaloneUrl ? 'py-4' : 'py-10'}`}
          >
            {standaloneUploading ? (
              <div className="flex flex-col items-center gap-2">
                <svg className="h-8 w-8 animate-spin text-accent" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-sm text-text-secondary">Caricamento in corso...</span>
              </div>
            ) : standaloneUrl ? (
              <div className="flex w-full items-center gap-4 px-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={standaloneUrl} alt="Anteprima" className="h-20 w-20 rounded-lg border border-border object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-xs font-medium text-badge-green">✓ Immagine caricata</p>
                  <p className="truncate text-xs text-text-secondary">{standaloneUrl}</p>
                </div>
              </div>
            ) : (
              <>
                <svg className="h-10 w-10 text-text-secondary/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <div className="text-center">
                  <p className="text-sm font-medium text-text-primary">Trascina qui l&apos;immagine</p>
                  <p className="text-xs text-text-secondary">oppure clicca per scegliere • JPG, PNG, WEBP • max 5 MB</p>
                </div>
              </>
            )}
          </div>

          <input
            ref={standaloneInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleStandaloneUpload(file)
              e.target.value = ''
            }}
          />

          {/* URL copiabile */}
          {standaloneUrl && (
            <div className="mt-3 flex gap-2">
              <input
                readOnly
                value={standaloneUrl}
                className="flex-1 rounded-lg border border-border bg-bg-dark px-3 py-2 text-xs text-text-secondary focus:border-accent focus:outline-none"
              />
              <button
                onClick={copyStandaloneUrl}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition hover:border-accent hover:text-accent"
              >
                {standaloneCopied ? '✓ Copiato!' : 'Copia URL'}
              </button>
              <button
                onClick={() => { setStandaloneUrl(''); standaloneInputRef.current?.click() }}
                className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary transition hover:border-badge-red/50 hover:text-badge-red"
              >
                Sostituisci
              </button>
            </div>
          )}
        </section>

        {/* Step 2b: Preview & Edit (appare dopo generazione AI) */}
        {product && (
          <section className="mb-8 rounded-xl border border-accent/30 bg-bg-card p-6">
            <h2 className="mb-1 text-sm font-semibold text-accent">Step 2</h2>
            <p className="mb-6 text-lg font-bold text-text-primary">Rivedi e modifica</p>

            <div className="grid gap-4">
              {/* Title */}
              <Field label="Titolo" value={product.title} onChange={(v) => handleFieldChange('title', v)} />

              {/* Slug */}
              <Field label="Slug (URL)" value={product.slug} onChange={(v) => handleFieldChange('slug', v)} />

              {/* Category */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">Categoria</label>
                <select
                  value={CATEGORIES.includes(product.category) ? product.category : '__custom__'}
                  onChange={(e) => {
                    if (e.target.value !== '__custom__') handleFieldChange('category', e.target.value)
                    else handleFieldChange('category', '')
                  }}
                  className="w-full rounded-lg border border-border bg-bg-dark px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
                >
                  <option value="" disabled>Scegli una categoria...</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  <option value="__custom__">✏️ Personalizzata...</option>
                </select>
                {/* Input libero se la categoria non è nella lista */}
                {!CATEGORIES.includes(product.category) && (
                  <input
                    type="text"
                    value={product.category}
                    onChange={(e) => handleFieldChange('category', e.target.value)}
                    placeholder="Scrivi la categoria personalizzata..."
                    className="mt-2 w-full rounded-lg border border-accent/40 bg-bg-dark px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:outline-none"
                    autoFocus
                  />
                )}
              </div>

              {/* Prices */}
              <div className="rounded-lg border border-border bg-bg-dark p-4">
                <p className="mb-3 text-xs font-medium text-text-secondary">Prezzi — margine {Math.round(MARGIN * 100)}% applicato automaticamente</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-text-secondary">Prezzo base / affiliato (€)</label>
                    <input
                      type="number"
                      value={basePrice}
                      onChange={(e) => {
                        const base = e.target.value
                        setBasePrice(base)
                        const parsed = parseFloat(base)
                        if (!isNaN(parsed)) {
                          handleFieldChange('price_current', parseFloat((parsed * (1 + MARGIN)).toFixed(2)))
                        }
                      }}
                      className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-accent">Prezzo vendita +{Math.round(MARGIN * 100)}% (€)</label>
                    <input
                      type="number"
                      value={String(product.price_current)}
                      onChange={(e) => handleFieldChange('price_current', parseFloat(e.target.value) || 0)}
                      className="w-full rounded-lg border border-accent/40 bg-bg-card px-3 py-2 text-sm font-semibold text-accent focus:border-accent focus:outline-none"
                    />
                  </div>
                  <Field
                    label="Prezzo Originale (€)"
                    value={String(product.price_original ?? '')}
                    onChange={(v) => handleFieldChange('price_original', v ? parseFloat(v) : null)}
                    type="number"
                    placeholder="Opzionale"
                  />
                </div>

                {/* Margin Calculator */}
                <div className="mt-3 rounded-lg bg-bg-card px-3 py-2 text-sm">
                  {margin !== null && marginPct !== null ? (
                    <span className="font-semibold text-badge-green">
                      Margine lordo: +{margin.toFixed(2)}€ (+{marginPct}%)
                    </span>
                  ) : (
                    <span className="text-text-secondary">Margine: — (imposta il prezzo base)</span>
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">Descrizione</label>
                <textarea
                  value={product.description}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  className="w-full resize-y rounded-lg border border-border bg-bg-dark px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
                  rows={5}
                />
              </div>

              {/* Image URL + Upload */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">Immagine Prodotto</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={product.image_url ?? ''}
                    onChange={(e) => handleFieldChange('image_url', e.target.value)}
                    placeholder="https://..."
                    className="flex-1 rounded-lg border border-border bg-bg-dark px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary transition hover:border-accent hover:text-accent disabled:opacity-40"
                  >
                    {uploadingImage ? 'Upload...' : 'Carica foto'}
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleImageUpload(file)
                    e.target.value = ''
                  }}
                />
                {product.image_url && (
                  <div className="mt-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={product.image_url}
                      alt="Anteprima prodotto"
                      className="h-32 w-auto rounded-lg border border-border object-cover"
                    />
                  </div>
                )}
              </div>

              {/* SEO */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Meta Title (SEO)" value={product.meta_title} onChange={(v) => handleFieldChange('meta_title', v)} />
                <Field label="Meta Description (SEO)" value={product.meta_description} onChange={(v) => handleFieldChange('meta_description', v)} />
              </div>

              {/* Specs JSON */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">Specifiche (JSON)</label>
                <textarea
                  value={JSON.stringify(product.specs, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value)
                      setProduct({ ...product, specs: parsed })
                    } catch { /* ignora JSON invalido durante la digitazione */ }
                  }}
                  className="w-full resize-y rounded-lg border border-border bg-bg-dark px-3 py-2 font-mono text-xs text-text-primary focus:border-accent focus:outline-none"
                  rows={6}
                />
              </div>

              {/* Bundle Toggle */}
              <div className="rounded-lg border border-border bg-bg-dark p-4">
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={product.is_bundle ?? false}
                    onChange={(e) => setProduct({
                      ...product,
                      is_bundle: e.target.checked,
                      bundle_items: e.target.checked ? (product.bundle_items ?? []) : [],
                    })}
                    className="h-4 w-4 rounded border-border bg-bg-dark accent-accent"
                  />
                  <span className="text-sm font-medium text-text-primary">Questo è un Bundle</span>
                </label>

                {product.is_bundle && (
                  <div className="mt-4">
                    <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                      Bundle Items (JSON) — [{'{'}product_id, title, quantity, price{'}'}]
                    </label>
                    <textarea
                      value={JSON.stringify(product.bundle_items ?? [], null, 2)}
                      onChange={(e) => {
                        try {
                          const parsed = JSON.parse(e.target.value)
                          setProduct({ ...product, bundle_items: parsed })
                        } catch { /* ignora JSON invalido */ }
                      }}
                      placeholder={'[\n  { "product_id": "", "title": "Mouse Gaming", "quantity": 1, "price": 139.99 }\n]'}
                      className="w-full resize-y rounded-lg border border-border bg-bg-card px-3 py-2 font-mono text-xs text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:outline-none"
                      rows={6}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Save Button */}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-accent px-8 py-3 text-sm font-bold text-bg-dark shadow-lg shadow-accent/20 transition-all hover:bg-accent-hover hover:shadow-accent/30 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Salvataggio in corso...
                  </>
                ) : (
                  '✓ Conferma e Salva su Supabase'
                )}
              </button>
              <button
                type="button"
                onClick={() => { setProduct(null); setError('') }}
                disabled={saving}
                className="rounded-xl border border-border px-6 py-3 text-sm text-text-secondary transition hover:text-text-primary disabled:opacity-40"
              >
                Annulla
              </button>
            </div>
          </section>
        )}

        {/* Step 3: Crea Kit */}
        <section className="rounded-xl border border-border bg-bg-card">
          {/* Accordion header — type="button" esplicito evita submit accidentali */}
          <button
            type="button"
            onClick={() => setKitOpen((v) => !v)}
            className="flex w-full items-center justify-between px-6 py-4 text-left"
            aria-expanded={kitOpen}
          >
            <div>
              <h2 className="text-sm font-semibold text-accent">Step 3</h2>
              <p className="text-lg font-bold text-text-primary">Crea Kit / Bundle con sconto</p>
            </div>
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-lg font-bold text-text-secondary transition hover:border-accent hover:text-accent">
              {kitOpen ? '−' : '+'}
            </span>
          </button>

          {kitOpen && (
            <div className="border-t border-border px-6 pb-6 pt-5">
              {kitError && (
                <div className="mb-4 rounded-lg border border-badge-red/30 bg-badge-red/10 px-4 py-3 text-sm text-badge-red">
                  {kitError}
                </div>
              )}
              {kitSuccess && (
                <div className="mb-4 rounded-lg border border-badge-green/30 bg-badge-green/10 px-4 py-3 text-sm text-badge-green">
                  {kitSuccess}
                </div>
              )}

              <div className="grid gap-4">
                {/* Kit Title */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-text-secondary">Kit Title</label>
                  <input
                    type="text"
                    value={kitTitle}
                    onChange={(e) => handleKitTitleChange(e.target.value)}
                    placeholder="Setup Streaming Pro"
                    className="w-full rounded-lg border border-border bg-bg-dark px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
                  />
                </div>

                {/* Kit Slug */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-text-secondary">Slug (auto)</label>
                  <input
                    type="text"
                    value={kitSlug}
                    onChange={(e) => setKitSlug(e.target.value)}
                    className="w-full rounded-lg border border-border bg-bg-dark px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
                  />
                </div>

                {/* Kit Description */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-text-secondary">Descrizione</label>
                  <textarea
                    value={kitDescription}
                    onChange={(e) => setKitDescription(e.target.value)}
                    placeholder="Kit completo per lo streaming professionale..."
                    className="w-full resize-y rounded-lg border border-border bg-bg-dark px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
                    rows={3}
                  />
                </div>

                {/* Discount */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                    Sconto kit: {kitDiscount}%
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={30}
                    step={1}
                    value={kitDiscount}
                    onChange={(e) => setKitDiscount(Number(e.target.value))}
                    className="w-full accent-accent"
                  />
                  <div className="mt-1 flex justify-between text-xs text-text-secondary">
                    <span>0%</span><span>15%</span><span>30%</span>
                  </div>
                </div>

                {/* Product Search */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                    Aggiungi prodotti al kit
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={kitSearch}
                      onChange={(e) => {
                        setKitSearch(e.target.value)
                        searchProducts(e.target.value)
                      }}
                      placeholder="Cerca prodotto per nome..."
                      className="w-full rounded-lg border border-border bg-bg-dark px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
                    />
                    {kitSearching && (
                      <span className="absolute right-3 top-2.5 text-xs text-text-secondary">...</span>
                    )}
                    {kitSearchResults.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-bg-card shadow-lg">
                        {kitSearchResults.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => addKitProduct(p)}
                            className="flex w-full items-center justify-between px-3 py-2.5 text-sm transition hover:bg-bg-dark"
                          >
                            <span className="text-text-primary">{p.title}</span>
                            <span className="ml-3 shrink-0 font-semibold text-accent">{p.price_current.toFixed(2)}€</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Aggiunta manuale — sostituisce prompt() */}
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => setShowManualForm((v) => !v)}
                      className="text-xs text-accent underline decoration-dotted hover:no-underline"
                    >
                      {showManualForm ? '− chiudi' : '+ aggiungi manualmente con UUID'}
                    </button>
                    {showManualForm && (
                      <div className="mt-2 rounded-lg border border-border bg-bg-dark p-3">
                        <p className="mb-2 text-xs font-medium text-text-secondary">Inserisci i dati del prodotto</p>
                        <div className="grid gap-2">
                          <input
                            type="text"
                            value={manualId}
                            onChange={(e) => setManualId(e.target.value)}
                            placeholder="UUID prodotto (es: a1b2c3d4-...)"
                            className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 font-mono text-xs text-text-primary focus:border-accent focus:outline-none"
                          />
                          <input
                            type="text"
                            value={manualTitle}
                            onChange={(e) => setManualTitle(e.target.value)}
                            placeholder="Nome prodotto"
                            className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
                          />
                          <div className="flex gap-2">
                            <input
                              type="number"
                              value={manualPrice}
                              onChange={(e) => setManualPrice(e.target.value)}
                              placeholder="Prezzo €"
                              className="w-32 rounded-lg border border-border bg-bg-card px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (!manualId.trim() || !manualTitle.trim() || !manualPrice) return
                                addKitProduct({
                                  id: manualId.trim(),
                                  title: manualTitle.trim(),
                                  slug: '',
                                  price_current: parseFloat(manualPrice) || 0,
                                })
                                setManualId('')
                                setManualTitle('')
                                setManualPrice('')
                                setShowManualForm(false)
                              }}
                              disabled={!manualId.trim() || !manualTitle.trim() || !manualPrice}
                              className="rounded-lg bg-accent px-4 py-2 text-sm font-bold text-bg-dark disabled:opacity-40"
                            >
                              Aggiungi
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Kit Products List */}
                {kitProducts.length > 0 && (
                  <div className="rounded-lg border border-border bg-bg-dark p-3">
                    <p className="mb-2 text-xs font-medium text-text-secondary">
                      Prodotti nel kit ({kitProducts.length})
                    </p>
                    <div className="space-y-2">
                      {kitProducts.map((p) => (
                        <div key={p.product_id} className="flex items-center gap-3">
                          <span className="flex-1 truncate text-sm text-text-primary">{p.title}</span>
                          <span className="shrink-0 text-xs text-text-secondary">{p.price.toFixed(2)}€</span>
                          <input
                            type="number"
                            min={1}
                            value={p.quantity}
                            onChange={(e) => updateKitQty(p.product_id, parseInt(e.target.value) || 1)}
                            className="w-14 rounded border border-border bg-bg-card px-2 py-1 text-center text-sm text-text-primary focus:border-accent focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => removeKitProduct(p.product_id)}
                            className="shrink-0 text-lg leading-none text-badge-red/60 transition hover:text-badge-red"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Price Preview */}
                    <div className="mt-4 rounded-lg bg-bg-card p-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-text-secondary">Totale senza sconto:</span>
                        <span className="text-text-primary line-through">{kitTotal.toFixed(2)}€</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-sm">
                        <span className="font-medium text-accent">Con sconto -{kitDiscount}%:</span>
                        <span className="text-lg font-bold text-accent">{kitDiscounted.toFixed(2)}€</span>
                      </div>
                      <div className="mt-1 text-xs text-badge-green">
                        Risparmio: {(kitTotal - kitDiscounted).toFixed(2)}€
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleCreateKit}
                  disabled={kitSaving || kitProducts.length === 0}
                  className="rounded-xl bg-accent px-8 py-3 text-sm font-bold text-bg-dark transition-all hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {kitSaving ? 'Creando kit...' : `Crea Kit${kitProducts.length > 0 ? ` (${kitProducts.length} prodotti)` : ''}`}
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

function Field({
  label, value, onChange, type = 'text', placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-text-secondary">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-bg-dark px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
      />
    </div>
  )
}
