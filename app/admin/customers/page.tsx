'use client'

import { useState, useEffect } from 'react'
import { Mail, Phone, MapPin, ShoppingBag, ChevronDown, ChevronUp } from 'lucide-react'

interface Order {
  id: string
  product_id: string
  customer_name: string
  customer_email: string
  customer_phone: string
  shipping_address: string
  total_amount: number
  payment_status: string
  mollie_id: string | null
  tracking_id: string | null
  created_at: string
  products: { title: string; price_current: number } | null
}

interface Customer {
  email: string
  name: string
  phone: string
  shipping_address: string
  orders: Order[]
  totalSpent: number
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
  open:      'Lead / Incompleto',
  failed:    'Fallito',
  purchased: 'Acquistato',
  shipped:   'Spedito',
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('it-IT', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function groupByEmail(orders: Order[]): Customer[] {
  const map = new Map<string, Customer>()
  for (const o of orders) {
    const key = o.customer_email.toLowerCase()
    if (!map.has(key)) {
      map.set(key, {
        email: o.customer_email,
        name: o.customer_name,
        phone: o.customer_phone,
        shipping_address: o.shipping_address,
        orders: [],
        totalSpent: 0,
      })
    }
    const c = map.get(key)!
    c.orders.push(o)
    // conta solo ordini pagati/acquistati/spediti
    if (['paid', 'purchased', 'shipped'].includes(o.payment_status)) {
      c.totalSpent += o.total_amount
    }
    // aggiorna nome/telefono con il più recente
    if (new Date(o.created_at) >= new Date(c.orders[0]?.created_at ?? 0)) {
      c.name = o.customer_name
      c.phone = o.customer_phone || c.phone
    }
  }
  // Ordina: prima i clienti con ordini pagati, poi per data desc
  return Array.from(map.values()).sort((a, b) => {
    const aPaid = a.orders.some(o => ['paid', 'purchased', 'shipped'].includes(o.payment_status))
    const bPaid = b.orders.some(o => ['paid', 'purchased', 'shipped'].includes(o.payment_status))
    if (aPaid && !bPaid) return -1
    if (!aPaid && bPaid) return 1
    return new Date(b.orders[0].created_at).getTime() - new Date(a.orders[0].created_at).getTime()
  })
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-border bg-bg-card p-5">
      <div className="mb-3 flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-border" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-40 rounded bg-border" />
          <div className="h-3 w-56 rounded bg-border" />
        </div>
      </div>
      <div className="h-3 w-48 rounded bg-border" />
    </div>
  )
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => { fetchCustomers() }, [])

  async function fetchCustomers() {
    try {
      const res = await fetch('/api/admin/orders')
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Errore caricamento'); return }
      setCustomers(groupByEmail(data.orders ?? []))
    } catch {
      setError('Errore di rete')
    } finally {
      setLoading(false)
    }
  }

  const filtered = search.trim()
    ? customers.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.email.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search)
      )
    : customers

  const paidCustomers = customers.filter(c =>
    c.orders.some(o => ['paid', 'purchased', 'shipped'].includes(o.payment_status))
  )
  const leadCustomers = customers.filter(c =>
    c.orders.every(o => !['paid', 'purchased', 'shipped'].includes(o.payment_status))
  )

  return (
    <div className="min-h-screen bg-bg-dark">
      {/* Header */}
      <header className="border-b border-border bg-bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-xl font-bold text-text-primary">Clienti</h1>
            <p className="text-xs text-text-secondary">
              {paidCustomers.length} clienti paganti &middot; {leadCustomers.length} lead
            </p>
          </div>
          <div className="flex gap-2">
            <a href="/admin/orders" className="rounded-lg border border-border px-3 py-2 text-sm text-text-secondary hover:text-accent">
              Ordini
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

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-border bg-bg-card p-4">
            <p className="text-2xl font-bold text-accent">{customers.length}</p>
            <p className="text-xs text-text-secondary">Totale clienti</p>
          </div>
          <div className="rounded-xl border border-badge-green/30 bg-badge-green/5 p-4">
            <p className="text-2xl font-bold text-badge-green">{paidCustomers.length}</p>
            <p className="text-xs text-text-secondary">Clienti paganti</p>
          </div>
          <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
            <p className="text-2xl font-bold text-accent">{leadCustomers.length}</p>
            <p className="text-xs text-text-secondary">Lead / Incompleti</p>
          </div>
          <div className="rounded-xl border border-neon-green/30 bg-neon-green/5 p-4">
            <p className="text-2xl font-bold text-neon-green">
              {customers.reduce((s, c) => s + c.totalSpent, 0).toFixed(0)}€
            </p>
            <p className="text-xs text-text-secondary">Totale incassato</p>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6 relative">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cerca per nome, email, telefono..."
            className="w-full rounded-xl border border-border bg-bg-card py-3 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-secondary/50 transition focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20"
          />
        </div>

        {/* Customer List */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-lg font-bold text-text-primary">
              {search ? 'Nessun risultato' : 'Nessun cliente ancora'}
            </p>
            <p className="text-sm text-text-secondary">
              {search ? 'Prova con un termine diverso.' : 'I clienti appariranno dopo il primo ordine.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(customer => {
              const isPaying = customer.orders.some(o => ['paid', 'purchased', 'shipped'].includes(o.payment_status))
              const isExpanded = expanded === customer.email
              const initials = customer.name
                .split(' ')
                .map(w => w[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()

              return (
                <div
                  key={customer.email}
                  className={`rounded-xl border bg-bg-card transition-all ${
                    isPaying ? 'border-badge-green/30' : 'border-border'
                  }`}
                >
                  {/* Customer Header */}
                  <div className="p-4 md:p-5">
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                        isPaying ? 'bg-badge-green/20 text-badge-green' : 'bg-accent/15 text-accent'
                      }`}>
                        {initials || '?'}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-text-primary">{customer.name}</p>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                            isPaying ? 'bg-badge-green/20 text-badge-green' : 'bg-accent/15 text-accent'
                          }`}>
                            {isPaying ? 'Cliente' : 'Lead'}
                          </span>
                          <span className="rounded-full bg-border/60 px-2 py-0.5 text-xs text-text-secondary">
                            {customer.orders.length} ordine{customer.orders.length !== 1 ? 'i' : ''}
                          </span>
                          {customer.totalSpent > 0 && (
                            <span className="rounded-full bg-badge-green/10 px-2 py-0.5 text-xs font-bold text-badge-green">
                              {customer.totalSpent.toFixed(2)}€
                            </span>
                          )}
                        </div>

                        {/* Contact info */}
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
                          <a
                            href={`mailto:${customer.email}`}
                            className="flex items-center gap-1.5 text-xs text-text-secondary transition hover:text-accent"
                          >
                            <Mail size={11} />
                            <span className="break-all">{customer.email}</span>
                          </a>
                          {customer.phone && (
                            <a
                              href={`tel:${customer.phone.replace(/\s/g, '')}`}
                              className="flex items-center gap-1.5 text-xs text-text-secondary transition hover:text-neon-green"
                            >
                              <Phone size={11} />
                              {customer.phone}
                            </a>
                          )}
                          {customer.shipping_address && (
                            <span className="flex items-center gap-1.5 text-xs text-text-secondary">
                              <MapPin size={11} />
                              {customer.shipping_address}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Contact CTA + Toggle */}
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        {/* Contact buttons — big targets for mobile */}
                        <div className="flex gap-2">
                          <a
                            href={`mailto:${customer.email}`}
                            className="flex h-10 w-10 items-center justify-center rounded-xl border border-accent/30 bg-accent/10 text-accent transition hover:bg-accent/20"
                            title="Invia Email"
                          >
                            <Mail size={16} />
                          </a>
                          {customer.phone && (
                            <a
                              href={`tel:${customer.phone.replace(/\s/g, '')}`}
                              className="flex h-10 w-10 items-center justify-center rounded-xl border border-neon-green/30 bg-neon-green/10 text-neon-green transition hover:bg-neon-green/20"
                              title="Chiama Cliente"
                            >
                              <Phone size={16} />
                            </a>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => setExpanded(isExpanded ? null : customer.email)}
                          className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary transition hover:border-accent hover:text-accent"
                        >
                          <ShoppingBag size={12} />
                          Ordini
                          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Order History (expanded) */}
                  {isExpanded && (
                    <div className="border-t border-border">
                      <div className="p-4 md:p-5">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-secondary">
                          Storico Ordini
                        </p>
                        <div className="space-y-2">
                          {customer.orders.map(order => (
                            <div
                              key={order.id}
                              className="rounded-xl border border-border bg-bg-dark p-3"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <div className="mb-1 flex flex-wrap items-center gap-2">
                                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_STYLES[order.payment_status] ?? 'bg-border text-text-secondary'}`}>
                                      {STATUS_LABELS[order.payment_status] ?? order.payment_status}
                                    </span>
                                    <span className="text-xs text-text-secondary">
                                      {formatDate(order.created_at)}
                                    </span>
                                  </div>
                                  <p className="text-sm font-medium text-text-primary">
                                    {order.products?.title ?? 'Prodotto eliminato'}
                                  </p>
                                  <p className="mt-0.5 text-xs text-text-secondary">
                                    ID: {order.id.slice(0, 8).toUpperCase()}
                                    {order.mollie_id && ` · Mollie: ${order.mollie_id}`}
                                    {order.tracking_id && ` · Tracking: ${order.tracking_id}`}
                                  </p>
                                </div>
                                <span className="shrink-0 text-base font-bold text-accent">
                                  {order.total_amount.toFixed(2)}€
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
