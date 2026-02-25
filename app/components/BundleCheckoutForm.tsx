'use client'

import { useState } from 'react'
import { Phone, Lock, ShieldCheck, Truck, CreditCard, Mail } from 'lucide-react'
import { trackBuyClick } from '@/lib/analytics'

const SUPPORT_PHONE = '+39 3756443391'
const SUPPORT_EMAIL = 'kitwer26@zohomail.eu'

interface BundleCheckoutFormProps {
  productId: string
  productSlug?: string
  productTitle?: string
  buttonLabel?: string
}

export default function BundleCheckoutForm({
  productId,
  productSlug = '',
  productTitle = '',
  buttonLabel = 'Procedi al Pagamento Sicuro 💳',
}: BundleCheckoutFormProps) {
  const [name, setName]       = useState('')
  const [email, setEmail]     = useState('')
  const [phone, setPhone]     = useState('')
  const [street, setStreet]   = useState('')
  const [civic, setCivic]     = useState('')
  const [cap, setCap]         = useState('')
  const [city, setCity]       = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    trackBuyClick(productSlug, productTitle, productId)

    const shipping_address = `${street} ${civic}, ${cap} ${city}`.trim()

    try {
      const res = await fetch('/api/checkout/mollie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: productId,
          customer_name: name,
          customer_email: email,
          customer_phone: phone,
          shipping_address,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Errore durante il checkout')
        return
      }

      if (data.paymentUrl) {
        window.location.href = data.paymentUrl
      }
    } catch {
      setError('Errore di rete. Riprova.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-badge-red/30 bg-badge-red/10 px-4 py-3 text-sm text-badge-red">
            <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
            </svg>
            {error}
          </div>
        )}

        {/* ── Sezione Dati Personali ─────────────────────── */}
        <div className="rounded-xl border border-border bg-bg-dark/40 p-4">
          <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-text-secondary">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
            Dati Personali
          </p>
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">Nome e Cognome *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sara Rossi"
                className="w-full rounded-lg border border-border bg-bg-card px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/40 transition focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">Email *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="sara@email.com"
                  className="w-full rounded-lg border border-border bg-bg-card px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/40 transition focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">Telefono</label>
                <div className="relative">
                  <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary/60" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+39 333 000 0000"
                    className="w-full rounded-lg border border-border bg-bg-card py-2.5 pl-8 pr-4 text-sm text-text-primary placeholder:text-text-secondary/40 transition focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Sezione Indirizzo Spedizione ───────────────── */}
        <div className="rounded-xl border border-border bg-bg-dark/40 p-4">
          <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-text-secondary">
            <Truck size={12} />
            Indirizzo di Spedizione
          </p>
          <div className="space-y-3">
            {/* Via + Civico */}
            <div className="grid grid-cols-[1fr_80px] gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">Via / Piazza *</label>
                <input
                  type="text"
                  required
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="Via Roma"
                  className="w-full rounded-lg border border-border bg-bg-card px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/40 transition focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">Civico *</label>
                <input
                  type="text"
                  required
                  value={civic}
                  onChange={(e) => setCivic(e.target.value)}
                  placeholder="14"
                  className="w-full rounded-lg border border-border bg-bg-card px-3 py-2.5 text-center text-sm text-text-primary placeholder:text-text-secondary/40 transition focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20"
                />
              </div>
            </div>

            {/* CAP + Città */}
            <div className="grid grid-cols-[100px_1fr] gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">CAP *</label>
                <input
                  type="text"
                  required
                  maxLength={5}
                  value={cap}
                  onChange={(e) => setCap(e.target.value.replace(/\D/g, '').slice(0, 5))}
                  placeholder="20121"
                  className="w-full rounded-lg border border-border bg-bg-card px-3 py-2.5 text-center text-sm text-text-primary placeholder:text-text-secondary/40 transition focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">Città *</label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Milano"
                  className="w-full rounded-lg border border-border bg-bg-card px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/40 transition focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Consenso Privacy & Termini ────────────────── */}
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-bg-dark/40 px-4 py-3">
          <input
            type="checkbox"
            required
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-border accent-accent"
          />
          <span className="text-xs leading-relaxed text-text-secondary">
            Ho letto e accetto i{' '}
            <a href="/terms" target="_blank" className="font-semibold text-accent underline decoration-dotted hover:no-underline">
              Termini e Condizioni
            </a>{' '}
            e la{' '}
            <a href="/privacy" target="_blank" className="font-semibold text-accent underline decoration-dotted hover:no-underline">
              Privacy Policy
            </a>.
            Confermo di avere almeno 18 anni. *
          </span>
        </label>

        {/* ── Bottone Pagamento ──────────────────────────── */}
        <div>
          <button
            type="submit"
            disabled={loading || !acceptedTerms}
            className="group relative w-full overflow-hidden rounded-xl bg-accent px-8 py-4 text-base font-bold text-bg-dark shadow-lg shadow-accent/25 transition-all hover:bg-accent-hover hover:shadow-accent/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {/* Shimmer effect */}
            {!loading && (
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            )}
            <span className="relative flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Reindirizzamento a Mollie...
                </>
              ) : (
                <>
                  <CreditCard size={18} />
                  {buttonLabel}
                </>
              )}
            </span>
          </button>

          {/* Security note */}
          <p className="mt-2 flex items-start gap-1.5 text-center text-xs leading-relaxed text-text-secondary/70">
            <Lock size={10} className="mt-0.5 shrink-0 text-badge-green" />
            Verrai reindirizzato al circuito crittografato di Mollie per inserire i dati della carta o usare Apple Pay / Google Pay.
          </p>
        </div>
      </form>

      {/* ── Trust Badges ──────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col items-center gap-1.5 rounded-xl border border-badge-green/20 bg-badge-green/5 px-2 py-3 text-center">
          <Lock size={15} className="text-badge-green" />
          <span className="text-[10px] font-semibold text-badge-green">SSL 256-bit</span>
          <span className="text-[9px] text-text-secondary">Crittografato</span>
        </div>
        <div className="flex flex-col items-center gap-1.5 rounded-xl border border-accent/20 bg-accent/5 px-2 py-3 text-center">
          <ShieldCheck size={15} className="text-accent" />
          <span className="text-[10px] font-semibold text-accent">Garanzia</span>
          <span className="text-[9px] text-text-secondary">30 giorni</span>
        </div>
        <div className="flex flex-col items-center gap-1.5 rounded-xl border border-neon-green/20 bg-neon-green/5 px-2 py-3 text-center">
          <Truck size={15} className="text-neon-green" />
          <span className="text-[10px] font-semibold text-neon-green">Spedizione</span>
          <span className="text-[9px] text-text-secondary">7-14 giorni lavorativi</span>
        </div>
      </div>

      {/* ── Google-style Support Widget ───────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-bg-card">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />

        <div className="p-4">
          <div className="mb-3 flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 ring-1 ring-accent/20">
              <Phone size={16} className="text-accent" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">Assistenza Ordini</p>
              <p className="text-xs text-text-secondary">Risposta in 48 ore • 7 giorni su 7</p>
            </div>
            <span className="ml-auto flex items-center gap-1 rounded-full bg-badge-green/15 px-2.5 py-1">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-badge-green" />
              <span className="text-[10px] font-bold text-badge-green">Online</span>
            </span>
          </div>

          <div className="flex gap-2">
            <a
              href={`tel:${SUPPORT_PHONE.replace(/\s/g, '')}`}
              className="flex flex-1 items-center justify-center rounded-xl border border-border bg-bg-dark px-3 py-2.5 text-sm font-semibold text-text-primary transition hover:border-accent/40 hover:bg-bg-hover hover:text-accent"
            >
              {SUPPORT_PHONE}
            </a>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-accent/25 bg-accent/8 px-4 py-2.5 text-sm font-semibold text-accent transition hover:bg-accent/15"
            >
              <Mail size={14} />
              Email
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
