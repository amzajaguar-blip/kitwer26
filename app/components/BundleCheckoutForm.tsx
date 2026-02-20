'use client'

import { useState } from 'react'

interface BundleCheckoutFormProps {
  productId: string
  buttonLabel?: string
}

export default function BundleCheckoutForm({
  productId,
  buttonLabel = 'Voglio Questo Setup',
}: BundleCheckoutFormProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/checkout/mollie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: productId,
          customer_name: name,
          customer_email: email,
          shipping_address: address,
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
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-badge-red/30 bg-badge-red/10 px-4 py-3 text-sm text-badge-red">
          {error}
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-xs font-medium text-text-secondary">Nome e Cognome</label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Sara Rossi"
          className="w-full rounded-lg border border-border bg-bg-dark px-4 py-3 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-text-secondary">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="sara@email.com"
          className="w-full rounded-lg border border-border bg-bg-dark px-4 py-3 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-text-secondary">Indirizzo di Spedizione</label>
        <textarea
          required
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Via Roma 1, 20121 Milano (MI)"
          rows={3}
          className="w-full resize-none rounded-lg border border-border bg-bg-dark px-4 py-3 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-accent px-8 py-4 text-lg font-bold text-bg-dark transition-all hover:bg-accent-hover hover:shadow-lg hover:shadow-accent/20 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? 'Reindirizzamento al pagamento...' : `${buttonLabel} →`}
      </button>

      <p className="text-center text-xs text-text-secondary">
        Pagamento sicuro tramite Mollie. I tuoi dati sono protetti.
      </p>
    </form>
  )
}
