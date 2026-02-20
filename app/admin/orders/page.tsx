'use client'

import { useState, useEffect } from 'react'

interface OrderWithProduct {
  id: string
  product_id: string
  customer_name: string
  customer_email: string
  shipping_address: string
  total_amount: number
  payment_status: 'open' | 'paid' | 'failed'
  mollie_id: string | null
  created_at: string
  products: { title: string; price_current: number } | null
}

const STATUS_STYLES: Record<string, string> = {
  paid: 'bg-badge-green/20 text-badge-green',
  open: 'bg-accent/20 text-accent',
  failed: 'bg-badge-red/20 text-badge-red',
}

const STATUS_LABELS: Record<string, string> = {
  paid: 'Pagato',
  open: 'In attesa',
  failed: 'Fallito',
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderWithProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'paid' | 'open' | 'failed'>('all')

  useEffect(() => {
    fetchOrders()
  }, [])

  async function fetchOrders() {
    try {
      const res = await fetch('/api/admin/orders')
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Errore caricamento ordini')
        return
      }
      setOrders(data.orders)
    } catch {
      setError('Errore di rete')
    } finally {
      setLoading(false)
    }
  }

  async function copyAddress(orderId: string, address: string) {
    await navigator.clipboard.writeText(address)
    setCopied(orderId)
    setTimeout(() => setCopied(null), 2000)
  }

  const filtered = filter === 'all' ? orders : orders.filter(o => o.payment_status === filter)
  const paidTotal = orders
    .filter(o => o.payment_status === 'paid')
    .reduce((sum, o) => sum + o.total_amount, 0)
  const paidCount = orders.filter(o => o.payment_status === 'paid').length

  return (
    <div className="min-h-screen bg-bg-dark">
      {/* Header */}
      <header className="border-b border-border bg-bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-xl font-bold text-text-primary">Ordini</h1>
            <p className="text-xs text-text-secondary">
              {paidCount} ordini pagati &middot; Totale incassato: {paidTotal.toFixed(2)}€
            </p>
          </div>
          <div className="flex gap-2">
            <a href="/admin" className="rounded-lg border border-border px-3 py-2 text-sm text-text-secondary hover:text-accent">
              Prodotti
            </a>
            <a href="/" className="rounded-lg border border-border px-3 py-2 text-sm text-text-secondary hover:text-accent">
              ← Sito
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {error && (
          <div className="mb-6 rounded-lg border border-badge-red/30 bg-badge-red/10 px-4 py-3 text-sm text-badge-red">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 flex gap-2">
          {(['all', 'paid', 'open', 'failed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                filter === f
                  ? 'bg-accent text-bg-dark'
                  : 'border border-border text-text-secondary hover:text-accent'
              }`}
            >
              {f === 'all' ? 'Tutti' : STATUS_LABELS[f]} {f !== 'all' && `(${orders.filter(o => o.payment_status === f).length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-20 text-center text-text-secondary">Caricamento ordini...</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-lg font-bold text-text-primary">Nessun ordine</p>
            <p className="text-sm text-text-secondary">Gli ordini appariranno qui dopo il primo acquisto.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((order) => (
              <div key={order.id} className="rounded-xl border border-border bg-bg-card p-4 md:p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  {/* Left: product + customer */}
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_STYLES[order.payment_status]}`}>
                        {STATUS_LABELS[order.payment_status]}
                      </span>
                      <span className="text-xs text-text-secondary">
                        {new Date(order.created_at).toLocaleDateString('it-IT', {
                          day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-text-primary">
                      {order.products?.title ?? 'Prodotto eliminato'}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {order.customer_name} &middot; {order.customer_email}
                    </p>
                  </div>

                  {/* Right: amount + actions */}
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-accent">{order.total_amount.toFixed(2)}€</span>

                    {order.payment_status === 'paid' && (
                      <button
                        onClick={() => copyAddress(order.id, order.shipping_address)}
                        className="rounded-lg border border-border px-3 py-2 text-xs text-text-secondary transition hover:border-accent hover:text-accent"
                      >
                        {copied === order.id ? 'Copiato!' : 'Copia Indirizzo'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Shipping address (visible for paid) */}
                {order.payment_status === 'paid' && (
                  <div className="mt-3 rounded-lg bg-bg-dark px-3 py-2 text-xs text-text-secondary">
                    <span className="font-medium text-text-primary">Spedire a: </span>
                    {order.shipping_address}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
