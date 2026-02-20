'use client'

import { useState } from 'react'

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

export default function AdminPage() {
  const [rawText, setRawText] = useState('')
  const [product, setProduct] = useState<GeneratedProduct | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleGenerate() {
    setError('')
    setSuccess('')
    setProduct(null)
    setLoading(true)

    try {
      const res = await fetch('/api/admin/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Errore generazione')
        return
      }

      setProduct({ is_bundle: false, bundle_items: [], ...data.product })
    } catch {
      setError('Errore di rete')
    } finally {
      setLoading(false)
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

  return (
    <div className="min-h-screen bg-bg-dark">
      {/* Header */}
      <header className="border-b border-border bg-bg-card">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-xl font-bold text-text-primary">Admin &middot; Quick Add</h1>
            <p className="text-xs text-text-secondary">Incolla specs → DeepSeek genera → Salva</p>
          </div>
          <div className="flex gap-2">
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

        {/* Step 1: Raw Input */}
        <section className="mb-8 rounded-xl border border-border bg-bg-card p-6">
          <h2 className="mb-1 text-sm font-semibold text-accent">Step 1</h2>
          <p className="mb-4 text-lg font-bold text-text-primary">Incolla i dati tecnici grezzi</p>

          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={"Esempio:\nLogitech G Pro X Superlight 2\nSensore HERO 2 44K DPI\n2000Hz polling rate\n60g wireless\nBatteria 95 ore\nPrezzo: €139.99\n\nIncolla qui specifiche da Amazon, schede tecniche, review..."}
            className="mb-4 w-full resize-y rounded-lg border border-border bg-bg-dark px-4 py-3 text-sm leading-relaxed text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:outline-none"
            rows={8}
          />

          <button
            onClick={handleGenerate}
            disabled={loading || rawText.trim().length < 10}
            className="rounded-xl bg-neon-purple px-6 py-3 text-sm font-bold text-white transition-all hover:bg-neon-purple/80 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'Generando con DeepSeek...' : 'Genera con AI'}
          </button>
        </section>

        {/* Step 2: Preview & Edit */}
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
              <Field label="Categoria" value={product.category} onChange={(v) => handleFieldChange('category', v)} />

              {/* Prices */}
              <div className="grid grid-cols-2 gap-4">
                <Field
                  label="Prezzo Corrente (€)"
                  value={String(product.price_current)}
                  onChange={(v) => handleFieldChange('price_current', parseFloat(v) || 0)}
                  type="number"
                />
                <Field
                  label="Prezzo Originale (€)"
                  value={String(product.price_original ?? '')}
                  onChange={(v) => handleFieldChange('price_original', v ? parseFloat(v) : null)}
                  type="number"
                  placeholder="Opzionale"
                />
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

              {/* Image URL */}
              <Field
                label="URL Immagine"
                value={product.image_url ?? ''}
                onChange={(v) => handleFieldChange('image_url', v)}
                placeholder="https://..."
              />

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
                onClick={handleSave}
                disabled={saving}
                className="rounded-xl bg-accent px-8 py-3 text-sm font-bold text-bg-dark transition-all hover:bg-accent-hover disabled:opacity-40"
              >
                {saving ? 'Salvando...' : 'Conferma e Salva su Supabase'}
              </button>
              <button
                onClick={() => { setProduct(null); setError('') }}
                className="rounded-xl border border-border px-6 py-3 text-sm text-text-secondary hover:text-text-primary"
              >
                Annulla
              </button>
            </div>
          </section>
        )}
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
