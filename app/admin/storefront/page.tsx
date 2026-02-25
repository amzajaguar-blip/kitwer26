'use client'

import { useState, useEffect, useRef } from 'react'

interface SiteSettings {
  id: number
  logo_url: string
  hero_title: string
  hero_subtitle: string
  promo_banner_enabled: boolean
  promo_banner_image: string
  promo_banner_link: string
  promo_banner_text: string
  updated_at: string
}

const DEFAULT: SiteSettings = {
  id: 1,
  logo_url: '',
  hero_title: '',
  hero_subtitle: '',
  promo_banner_enabled: false,
  promo_banner_image: '',
  promo_banner_link: '/',
  promo_banner_text: '',
  updated_at: '',
}

export default function StorefrontPage() {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [dragging, setDragging] = useState(false)
  const [draggingBanner, setDraggingBanner] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  async function fetchSettings() {
    try {
      const res = await fetch('/api/admin/site-settings')
      const data = await res.json()
      if (res.ok && data.settings) setSettings(data.settings)
      else setError(data.error || 'Errore caricamento impostazioni')
    } catch {
      setError('Errore di rete')
    } finally {
      setLoading(false)
    }
  }

  async function handleLogoUpload(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('Solo file immagine (PNG, SVG, WEBP, JPG)')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File troppo grande (max 5 MB)')
      return
    }
    setError('')
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('bucket', 'logos')
      const res = await fetch('/api/admin/upload-image', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Errore upload logo'); return }
      setSettings(s => ({ ...s, logo_url: data.url }))
    } catch {
      setError('Errore upload logo')
    } finally {
      setUploading(false)
    }
  }

  async function handleBannerUpload(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('Solo file immagine (PNG, WEBP, JPG)')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('File troppo grande (max 8 MB)')
      return
    }
    setError('')
    setUploadingBanner(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('bucket', 'logos')
      const res = await fetch('/api/admin/upload-image', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Errore upload banner'); return }
      setSettings(s => ({ ...s, promo_banner_image: data.url }))
    } catch {
      setError('Errore upload banner')
    } finally {
      setUploadingBanner(false)
    }
  }

  async function handleSave() {
    setError('')
    setSuccess('')
    setSaving(true)
    try {
      const res = await fetch('/api/admin/site-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logo_url: settings.logo_url,
          hero_title: settings.hero_title,
          hero_subtitle: settings.hero_subtitle,
          promo_banner_enabled: settings.promo_banner_enabled,
          promo_banner_image: settings.promo_banner_image,
          promo_banner_link: settings.promo_banner_link,
          promo_banner_text: settings.promo_banner_text,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Errore salvataggio'); return }
      setSettings(data.settings)
      setSuccess('Pubblicato! Le modifiche sono live.')
    } catch {
      setError('Errore di rete')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-dark">

      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-bg-dark/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-xl font-bold text-text-primary">🎨 Aspetto Sito</h1>
            <p className="text-xs text-text-secondary">Logo, testi e banner promo — live editing</p>
          </div>
          <div className="flex gap-2">
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-border px-3 py-2 text-sm text-text-secondary transition hover:border-accent hover:text-accent"
            >
              Anteprima →
            </a>
            <a
              href="/admin"
              className="rounded-lg border border-border px-3 py-2 text-sm text-text-secondary transition hover:text-text-primary"
            >
              ← Admin
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">

        {/* Feedback */}
        {error && (
          <div className="mb-6 rounded-xl border border-badge-red/30 bg-badge-red/10 px-4 py-3 text-sm text-badge-red">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 rounded-xl border border-badge-green/30 bg-badge-green/10 px-4 py-3 text-sm text-badge-green">
            ✓ {success}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-6">

            {/* ── LOGO ───────────────────────────────────── */}
            <div className="relative overflow-hidden rounded-2xl border border-border bg-bg-card p-6">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent" />
              <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-accent/5 blur-3xl" />

              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-accent">Brand</p>
              <p className="mb-6 text-lg font-bold text-text-primary">Logo del Sito</p>

              <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex h-20 w-48 shrink-0 items-center justify-center rounded-xl border border-border bg-bg-dark px-4">
                  {settings.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={settings.logo_url}
                      alt="Logo attuale"
                      className="max-h-12 max-w-40 object-contain"
                    />
                  ) : (
                    <div className="text-center">
                      <span className="block text-xl font-bold text-accent">Kitwer26</span>
                      <span className="text-xs text-text-secondary">GAMING</span>
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-medium text-text-primary">
                    {settings.logo_url ? '✓ Logo personalizzato attivo' : 'Logo testuale (default)'}
                  </p>
                  <p className="mt-0.5 text-xs text-text-secondary">
                    Consigliato: PNG/SVG trasparente · 200×60 px · max 5 MB
                  </p>
                  <p className="mt-0.5 text-xs text-text-secondary">
                    Su mobile viene mostrato a max 40 px di altezza — tienilo leggibile
                  </p>
                </div>
              </div>

              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setDragging(false)
                  const file = e.dataTransfer.files?.[0]
                  if (file) handleLogoUpload(file)
                }}
                className={`flex cursor-pointer select-none flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-8 transition-all focus:outline-none focus:ring-2 focus:ring-accent/40 ${
                  dragging
                    ? 'border-accent bg-accent/8 scale-[1.01]'
                    : 'border-border bg-bg-dark hover:border-accent/50 hover:bg-accent/3'
                } ${uploading ? 'pointer-events-none opacity-50' : ''}`}
              >
                {uploading ? (
                  <>
                    <div className="h-7 w-7 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                    <span className="text-sm text-text-secondary">Caricamento logo...</span>
                  </>
                ) : (
                  <>
                    <svg className="h-9 w-9 text-text-secondary/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    <div className="text-center">
                      <p className="text-sm font-medium text-text-primary">Trascina il logo qui</p>
                      <p className="text-xs text-text-secondary">oppure clicca per scegliere · PNG · SVG · WEBP</p>
                    </div>
                  </>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleLogoUpload(file)
                  e.target.value = ''
                }}
              />

              {settings.logo_url && (
                <div className="mt-3 flex items-center gap-2">
                  <input
                    readOnly
                    value={settings.logo_url}
                    className="min-w-0 flex-1 rounded-lg border border-border bg-bg-dark px-3 py-2 text-xs text-text-secondary"
                  />
                  <button
                    onClick={() => setSettings(s => ({ ...s, logo_url: '' }))}
                    className="shrink-0 rounded-lg border border-border px-3 py-2 text-xs text-badge-red/70 transition hover:border-badge-red/40 hover:text-badge-red"
                  >
                    Rimuovi
                  </button>
                </div>
              )}
            </div>

            {/* ── HERO TESTI ─────────────────────────────── */}
            <div className="relative overflow-hidden rounded-2xl border border-border bg-bg-card p-6">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-neon-purple/60 to-transparent" />
              <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-neon-purple/5 blur-3xl" />

              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-accent">Hero</p>
              <p className="mb-6 text-lg font-bold text-text-primary">Testi Principali Homepage</p>

              <div className="space-y-5">
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-xs font-medium text-text-secondary">Titolo principale</label>
                    <span className={`text-xs ${settings.hero_title.length > 70 ? 'text-badge-red' : 'text-text-secondary/50'}`}>
                      {settings.hero_title.length}/80
                    </span>
                  </div>
                  <input
                    type="text"
                    value={settings.hero_title}
                    onChange={(e) => setSettings(s => ({ ...s, hero_title: e.target.value }))}
                    maxLength={80}
                    placeholder="Il Setup dei Tuoi Sogni"
                    className="w-full rounded-xl border border-border bg-bg-dark px-4 py-3 text-sm text-text-primary placeholder:text-text-secondary/40 transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-text-secondary">Sottotitolo</label>
                  <textarea
                    value={settings.hero_subtitle}
                    onChange={(e) => setSettings(s => ({ ...s, hero_subtitle: e.target.value }))}
                    rows={3}
                    placeholder="Periferiche premium per veri gamer..."
                    className="w-full resize-y rounded-xl border border-border bg-bg-dark px-4 py-3 text-sm text-text-primary placeholder:text-text-secondary/40 transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  />
                </div>

                <div className="rounded-xl border border-border bg-bg-dark p-5">
                  <p className="mb-3 text-xs font-medium uppercase tracking-wider text-text-secondary/60">
                    Anteprima Hero (mobile)
                  </p>
                  <div className="mx-auto max-w-xs text-center">
                    <h1 className="text-xl font-bold leading-tight text-text-primary">
                      {settings.hero_title || <span className="text-text-secondary/30">Titolo principale...</span>}
                    </h1>
                    <p className="mt-2 text-xs leading-relaxed text-text-secondary">
                      {settings.hero_subtitle || <span className="text-text-secondary/30">Sottotitolo...</span>}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── BANNER PROMO ────────────────────────────── */}
            <div className="relative overflow-hidden rounded-2xl border border-border bg-bg-card p-6">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-neon-green/60 to-transparent" />
              <div className="pointer-events-none absolute -right-20 -bottom-10 h-52 w-52 rounded-full bg-neon-green/5 blur-3xl" />

              <div className="mb-6 flex items-start justify-between">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-neon-green">Pubblicità Interna</p>
                  <p className="text-lg font-bold text-text-primary">Banner Promo</p>
                  <p className="mt-1 text-xs text-text-secondary">
                    Appare nella pagina prodotto in sostituzione AdSense. Puoi linkare a una categoria o promozione.
                  </p>
                </div>
                {/* Toggle abilitato */}
                <button
                  onClick={() => setSettings(s => ({ ...s, promo_banner_enabled: !s.promo_banner_enabled }))}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus:outline-none ${
                    settings.promo_banner_enabled ? 'bg-neon-green' : 'bg-border'
                  }`}
                  role="switch"
                  aria-checked={settings.promo_banner_enabled}
                >
                  <span className={`inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    settings.promo_banner_enabled ? 'translate-x-5' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              <div className={`space-y-5 transition-opacity duration-200 ${settings.promo_banner_enabled ? 'opacity-100' : 'pointer-events-none opacity-40'}`}>

                {/* Immagine banner */}
                <div>
                  <label className="mb-2 block text-xs font-medium text-text-secondary">
                    Immagine Banner <span className="text-text-secondary/50">(opzionale — consigliato 1200×400 px)</span>
                  </label>

                  {settings.promo_banner_image ? (
                    <div className="relative overflow-hidden rounded-xl border border-border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={settings.promo_banner_image}
                        alt="Banner preview"
                        className="max-h-48 w-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-end bg-gradient-to-t from-bg-dark/60 to-transparent p-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => bannerInputRef.current?.click()}
                            className="rounded-lg bg-bg-dark/80 px-3 py-1.5 text-xs font-semibold text-text-primary backdrop-blur transition hover:bg-bg-card"
                          >
                            Cambia
                          </button>
                          <button
                            onClick={() => setSettings(s => ({ ...s, promo_banner_image: '' }))}
                            className="rounded-lg bg-badge-red/80 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur transition hover:bg-badge-red"
                          >
                            Rimuovi
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => bannerInputRef.current?.click()}
                      onKeyDown={(e) => e.key === 'Enter' && bannerInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); setDraggingBanner(true) }}
                      onDragLeave={() => setDraggingBanner(false)}
                      onDrop={(e) => {
                        e.preventDefault()
                        setDraggingBanner(false)
                        const file = e.dataTransfer.files?.[0]
                        if (file) handleBannerUpload(file)
                      }}
                      className={`flex cursor-pointer select-none flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-10 transition-all focus:outline-none focus:ring-2 focus:ring-neon-green/40 ${
                        draggingBanner
                          ? 'border-neon-green bg-neon-green/8 scale-[1.01]'
                          : 'border-border bg-bg-dark hover:border-neon-green/40 hover:bg-neon-green/3'
                      } ${uploadingBanner ? 'pointer-events-none opacity-50' : ''}`}
                    >
                      {uploadingBanner ? (
                        <>
                          <div className="h-7 w-7 animate-spin rounded-full border-2 border-neon-green border-t-transparent" />
                          <span className="text-sm text-text-secondary">Caricamento banner...</span>
                        </>
                      ) : (
                        <>
                          <svg className="h-9 w-9 text-text-secondary/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                          </svg>
                          <div className="text-center">
                            <p className="text-sm font-medium text-text-primary">Carica immagine banner</p>
                            <p className="text-xs text-text-secondary">PNG · JPG · WEBP · max 8 MB</p>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  <input
                    ref={bannerInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleBannerUpload(file)
                      e.target.value = ''
                    }}
                  />
                </div>

                {/* Testo / headline */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                    Testo / Headline <span className="text-text-secondary/50">(opzionale)</span>
                  </label>
                  <input
                    type="text"
                    value={settings.promo_banner_text}
                    onChange={(e) => setSettings(s => ({ ...s, promo_banner_text: e.target.value }))}
                    maxLength={100}
                    placeholder="es. Scopri i Migliori Deal Gaming 🎮"
                    className="w-full rounded-xl border border-border bg-bg-dark px-4 py-3 text-sm text-text-primary placeholder:text-text-secondary/40 transition focus:border-neon-green focus:outline-none focus:ring-2 focus:ring-neon-green/20"
                  />
                  <p className="mt-1 text-xs text-text-secondary/50">
                    Appare sovrapposto all&apos;immagine (in basso) oppure come titolo del banner grafico
                  </p>
                </div>

                {/* Link */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-text-secondary">Link destinazione</label>
                  <input
                    type="text"
                    value={settings.promo_banner_link}
                    onChange={(e) => setSettings(s => ({ ...s, promo_banner_link: e.target.value }))}
                    placeholder="/ oppure /?category=Mouse+Gaming"
                    className="w-full rounded-xl border border-border bg-bg-dark px-4 py-3 text-sm text-text-primary placeholder:text-text-secondary/40 transition focus:border-neon-green focus:outline-none focus:ring-2 focus:ring-neon-green/20"
                  />
                  <p className="mt-1 text-xs text-text-secondary/50">
                    Usa un path relativo (es. <code className="text-accent">/?category=Mouse+Gaming</code>) o URL assoluto
                  </p>
                </div>

                {/* Preview banner senza immagine */}
                {!settings.promo_banner_image && (
                  <div className="rounded-xl border border-border bg-bg-dark p-4">
                    <p className="mb-3 text-xs font-medium uppercase tracking-wider text-text-secondary/60">
                      Anteprima Banner (senza immagine)
                    </p>
                    <div className="relative overflow-hidden rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/10 via-bg-card to-neon-purple/10 p-5">
                      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent" />
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-accent">Offerte Esclusive</p>
                          <h3 className="mt-0.5 text-sm font-bold text-text-primary">
                            {settings.promo_banner_text || 'Scopri i Migliori Deal Gaming'}
                          </h3>
                        </div>
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-bg-dark">
                          Vedi Offerte →
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── SAVE BAR ───────────────────────────────── */}
            <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center sm:justify-between">
              {settings.updated_at ? (
                <p className="text-xs text-text-secondary">
                  Ultimo salvataggio: {new Date(settings.updated_at).toLocaleString('it-IT', {
                    day: '2-digit', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              ) : (
                <span />
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-accent px-8 py-3 text-sm font-bold text-bg-dark shadow-lg shadow-accent/20 transition-all hover:bg-accent-hover hover:shadow-accent/30 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-bg-dark border-t-transparent" />
                    Pubblicando...
                  </>
                ) : (
                  '✓ Salva e Pubblica'
                )}
              </button>
            </div>

          </div>
        )}
      </main>
    </div>
  )
}
