'use client'

import { useState, useEffect, useRef } from 'react'

interface SiteSettings {
  id: number
  logo_url: string
  hero_title: string
  hero_subtitle: string
  updated_at: string
}

const DEFAULT: SiteSettings = {
  id: 1,
  logo_url: '',
  hero_title: '',
  hero_subtitle: '',
  updated_at: '',
}

export default function StorefrontPage() {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Errore salvataggio'); return }
      setSettings(data.settings)
      setSuccess('Pubblicato! Le modifiche sono live sulla homepage.')
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
            <p className="text-xs text-text-secondary">Logo e testi della homepage — live editing</p>
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
              {/* Glow line top */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent" />
              {/* Ambient glow */}
              <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-accent/5 blur-3xl" />

              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-accent">Brand</p>
              <p className="mb-6 text-lg font-bold text-text-primary">Logo del Sito</p>

              {/* Preview corrente */}
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

              {/* Drop zone */}
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

              {/* URL corrente + remove */}
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
                {/* Titolo */}
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

                {/* Sottotitolo */}
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

                {/* Live preview */}
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
