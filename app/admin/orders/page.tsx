'use client'

import { useState, useEffect } from 'react'

interface TopProduct {
  slug: string
  title: string
  count: number
}

interface OrderWithProduct {
  id: string
  product_id: string
  customer_name: string
  customer_email: string
  customer_phone: string
  shipping_address: string
  total_amount: number
  payment_status: 'open' | 'paid' | 'failed' | 'purchased' | 'shipped'
  mollie_id: string | null
  tracking_id: string | null
  created_at: string
  products: { title: string; price_current: number } | null
}

const STATUS_STYLES: Record<string, string> = {
  paid:      'bg-badge-green/20 text-badge-green',
  open:      'bg-accent/20 text-accent',
  failed:    'bg-badge-red/20 text-badge-red',
  purchased: 'bg-neon-purple/20 text-neon-purple',
  shipped:   'bg-neon-green/20 text-neon-green',
}

const STATUS_LABELS: Record<string, string> = {
  paid:      'Pagato',
  open:      'In attesa',
  failed:    'Fallito',
  purchased: 'Acquistato',
  shipped:   'Spedito',
}

type FilterType = 'all' | 'paid' | 'open' | 'failed' | 'purchased' | 'shipped'

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderWithProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterType>('all')
  const [top3, setTop3] = useState<TopProduct[]>([])

  // Per "Segna Acquistato"
  const [purchasing, setPurchasing] = useState<string | null>(null)
  // Per "Invia Tracking"
  const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>({})
  const [shipping, setShipping] = useState<string | null>(null)
  // Toast feedback
  const [toast, setToast] = useState<{ message: string; type: 'ok' | 'err' } | null>(null)

  useEffect(() => {
    fetchOrders()
    fetchTop3()
  }, [])

  function showToast(message: string, type: 'ok' | 'err') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  async function fetchTop3() {
    try {
      const res = await fetch('/api/admin/analytics')
      const data = await res.json()
      if (res.ok) setTop3(data.top3 ?? [])
    } catch { /* silenzioso */ }
  }

  async function fetchOrders() {
    try {
      const res = await fetch('/api/admin/orders')
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Errore caricamento ordini'); return }
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

  async function handleMarkPurchased(order: OrderWithProduct) {
    setPurchasing(order.id)
    try {
      const res = await fetch('/api/admin/order-purchased', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: order.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        showToast(data.error || 'Errore', 'err')
        return
      }
      // Aggiorna lo stato localmente
      setOrders(prev =>
        prev.map(o => o.id === order.id ? { ...o, payment_status: 'purchased' } : o)
      )
      showToast(
        data.emailSent
          ? `Email inviata a ${order.customer_name}!`
          : `Stato aggiornato (email non inviata: ${data.emailError ?? 'RESEND_API_KEY mancante'})`,
        data.emailSent ? 'ok' : 'err'
      )
    } catch {
      showToast('Errore di rete', 'err')
    } finally {
      setPurchasing(null)
    }
  }

  async function handleShipOrder(order: OrderWithProduct) {
    const trackingId = (trackingInputs[order.id] ?? '').trim()
    if (!trackingId) {
      showToast('Inserisci il numero di tracking prima di inviare.', 'err')
      return
    }
    setShipping(order.id)
    try {
      const res = await fetch('/api/admin/ship-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: order.id, tracking_id: trackingId }),
      })
      const data = await res.json()
      if (!res.ok) {
        showToast(data.error || 'Errore', 'err')
        return
      }
      setOrders(prev =>
        prev.map(o => o.id === order.id ? { ...o, payment_status: 'shipped', tracking_id: trackingId } : o)
      )
      showToast(
        data.emailSent
          ? `Tracking inviato a ${order.customer_name}!`
          : `Stato aggiornato (email non inviata: ${data.emailError ?? 'RESEND_API_KEY mancante'})`,
        data.emailSent ? 'ok' : 'err'
      )
    } catch {
      showToast('Errore di rete', 'err')
    } finally {
      setShipping(null)
    }
  }

  const filtered = filter === 'all' ? orders : orders.filter(o => o.payment_status === filter)
  const paidTotal = orders
    .filter(o => ['paid', 'purchased', 'shipped'].includes(o.payment_status))
    .reduce((sum, o) => sum + o.total_amount, 0)
  const paidCount = orders.filter(o => ['paid', 'purchased', 'shipped'].includes(o.payment_status)).length

  const filterOptions: FilterType[] = ['all', 'paid', 'purchased', 'shipped', 'open', 'failed']

  return (
    <div className="min-h-screen bg-bg-dark">
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-5 right-4 z-50 flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-semibold shadow-xl transition-all ${
          toast.type === 'ok'
            ? 'bg-badge-green text-white'
            : 'bg-badge-red text-white'
        }`}>
          {toast.type === 'ok' ? '✅' : '❌'} {toast.message}
        </div>
      )}

      {/* Header */}
      <header className="border-b border-border bg-bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-xl font-bold text-text-primary">Ordini</h1>
            <p className="text-xs text-text-secondary">
              {paidCount} ordini confermati &middot; Totale: {paidTotal.toFixed(2)}€
            </p>
          </div>
          <div className="flex gap-2">
            <a href="/admin/customers" className="rounded-lg border border-border px-3 py-2 text-sm text-text-secondary hover:text-accent">
              Clienti
            </a>
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

        {/* Top 3 prodotti */}
        <div className="mb-6 rounded-xl border border-border bg-bg-card p-4">
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
                    <a href={`/products/${p.slug}`} target="_blank" className="text-sm font-medium text-text-primary hover:text-accent">
                      {p.title}
                    </a>
                  </div>
                  <span className="text-sm font-bold text-accent">{p.count} visite</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-2">
          {filterOptions.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                filter === f
                  ? 'bg-accent text-bg-dark'
                  : 'border border-border text-text-secondary hover:text-accent'
              }`}
            >
              {f === 'all' ? `Tutti (${orders.length})` : `${STATUS_LABELS[f]} (${orders.filter(o => o.payment_status === f).length})`}
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
                {/* Row 1: status + date + product */}
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
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
                      {order.customer_phone && ` · ${order.customer_phone}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-accent">{order.total_amount.toFixed(2)}€</span>

                    {(['paid', 'purchased', 'shipped'] as const).includes(order.payment_status as 'paid' | 'purchased' | 'shipped') && (
                      <button
                        type="button"
                        onClick={() => copyAddress(order.id, order.shipping_address)}
                        className="rounded-lg border border-border px-3 py-2 text-xs text-text-secondary transition hover:border-accent hover:text-accent"
                      >
                        {copied === order.id ? '✓ Copiato!' : 'Copia Indirizzo'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Shipping address */}
                {(['paid', 'purchased', 'shipped'] as const).includes(order.payment_status as 'paid' | 'purchased' | 'shipped') && (
                  <div className="mt-3 rounded-lg bg-bg-dark px-3 py-2 text-xs text-text-secondary">
                    <span className="font-medium text-text-primary">Spedire a: </span>
                    {order.shipping_address}
                  </div>
                )}

                {/* Tracking shown if shipped */}
                {order.payment_status === 'shipped' && order.tracking_id && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg bg-neon-green/5 px-3 py-2 text-xs">
                    <span className="text-neon-green font-semibold">Tracking:</span>
                    <span className="font-mono text-neon-green">{order.tracking_id}</span>
                  </div>
                )}

                {/* Action: Segna come Acquistato (per ordini paid) */}
                {order.payment_status === 'paid' && (
                  <div className="mt-4 border-t border-border pt-4">
                    <button
                      type="button"
                      onClick={() => handleMarkPurchased(order)}
                      disabled={purchasing === order.id}
                      className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-neon-purple/15 px-4 py-3 text-sm font-semibold text-neon-purple transition hover:bg-neon-purple/25 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto"
                    >
                      {purchasing === order.id ? (
                        <>
                          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Invio in corso...
                        </>
                      ) : (
                        <>🛍️ Segna come Acquistato + Notifica Cliente</>
                      )}
                    </button>
                  </div>
                )}

                {/* Action: Tracking + Spedito (per ordini purchased) */}
                {order.payment_status === 'purchased' && (
                  <div className="mt-4 border-t border-border pt-4">
                    <p className="mb-2 text-xs font-semibold text-text-secondary">Numero di Tracking Corriere</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        inputMode="text"
                        placeholder="es. IT123456789IT"
                        value={trackingInputs[order.id] ?? ''}
                        onChange={e =>
                          setTrackingInputs(prev => ({ ...prev, [order.id]: e.target.value }))
                        }
                        className="min-h-[44px] flex-1 rounded-xl border border-border bg-bg-dark px-4 py-2 font-mono text-sm text-text-primary placeholder:text-text-secondary/40 transition focus:border-neon-green focus:outline-none focus:ring-1 focus:ring-neon-green/20"
                      />
                      <button
                        type="button"
                        onClick={() => handleShipOrder(order)}
                        disabled={shipping === order.id}
                        className="flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-xl bg-neon-green/15 px-4 py-2 text-sm font-semibold text-neon-green transition hover:bg-neon-green/25 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {shipping === order.id ? (
                          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        ) : (
                          <>🚚 Invia Tracking</>
                        )}
                      </button>
                    </div>
                    <p className="mt-1.5 text-[11px] text-text-secondary/60">
                      Il cliente riceverà una mail con il link per tracciare il pacco.
                    </p>
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
