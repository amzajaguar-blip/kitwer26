import { getServiceClient } from '@/lib/supabase'
import Link from 'next/link'
import Logo from '@/app/components/Logo'

async function getStats() {
  const db = getServiceClient()
  const [{ count: productCount }, ordersResult] = await Promise.all([
    db.from('products').select('*', { count: 'exact', head: true }),
    db.from('orders').select('*', { count: 'exact', head: true }),
  ])
  const orderCount = ordersResult.count ?? 0
  return {
    products: productCount ?? 0,
    orders: orderCount,
  }
}

async function getRecentProducts() {
  const db = getServiceClient()
  const { data } = await db
    .from('products')
    .select('id, title, slug, price_current, category, created_at')
    .order('created_at', { ascending: false })
    .limit(8)
  return data ?? []
}

export default async function AdminDashboardPage() {
  const [stats, recent] = await Promise.all([getStats(), getRecentProducts()])

  return (
    <div className="min-h-screen bg-bg-dark">
      {/* Header */}
      <header className="border-b border-border bg-bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
          <div className="flex items-center gap-4">
            <Logo height={38} showText={true} />
            <div className="h-6 w-px bg-border" />
            <div>
              <p className="text-xs text-text-secondary">Pannello Admin</p>
              <h1 className="text-base font-bold text-text-primary">Dashboard</h1>
            </div>
          </div>
          <nav className="flex items-center gap-2">
            <Link href="/admin" className="rounded-lg border border-border px-3 py-2 text-sm text-text-secondary transition hover:border-accent hover:text-accent">
              + Prodotti
            </Link>
            <Link href="/admin/storefront" className="rounded-lg border border-border px-3 py-2 text-sm text-text-secondary transition hover:border-accent hover:text-accent">
              Aspetto
            </Link>
            <Link href="/" className="rounded-lg border border-border px-3 py-2 text-sm text-text-secondary transition hover:border-accent hover:text-accent">
              ← Sito
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">

        {/* Stats */}
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard
            label="Prodotti attivi"
            value={stats.products}
            icon="📦"
            accent
          />
          <StatCard
            label="Ordini totali"
            value={stats.orders}
            icon="🛒"
          />
          <StatCard
            label="Categorie"
            value={10}
            icon="🏷️"
          />
          <StatCard
            label="Visite oggi"
            value="—"
            icon="👁️"
          />
        </div>

        {/* Quick Actions */}
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <Link
            href="/admin"
            className="flex flex-col items-start gap-3 rounded-2xl border border-accent/40 bg-accent/5 p-5 transition hover:border-accent hover:bg-accent/10"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-xl">
              ✨
            </span>
            <div>
              <p className="font-bold text-text-primary">Aggiungi Prodotto</p>
              <p className="mt-0.5 text-sm text-text-secondary">AI genera da testo o URL</p>
            </div>
          </Link>

          <Link
            href="/admin/storefront"
            className="flex flex-col items-start gap-3 rounded-2xl border border-border bg-bg-card p-5 transition hover:border-accent"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-bg-hover text-xl">
              🎨
            </span>
            <div>
              <p className="font-bold text-text-primary">Aspetto Sito</p>
              <p className="mt-0.5 text-sm text-text-secondary">Logo, hero, promo banner</p>
            </div>
          </Link>

          <Link
            href="/admin/orders"
            className="flex flex-col items-start gap-3 rounded-2xl border border-border bg-bg-card p-5 transition hover:border-accent"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-bg-hover text-xl">
              📋
            </span>
            <div>
              <p className="font-bold text-text-primary">Ordini</p>
              <p className="mt-0.5 text-sm text-text-secondary">Gestisci spedizioni</p>
            </div>
          </Link>
        </div>

        {/* Seed 50 prodotti */}
        <div className="mb-8 rounded-2xl border border-neon-purple/30 bg-neon-purple/5 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-bold text-text-primary">Carica 50 Prodotti BOOM</p>
              <p className="mt-1 text-sm text-text-secondary">
                Esegui <code className="rounded bg-bg-card px-1.5 py-0.5 font-mono text-xs text-accent">npm run seed</code> nel terminale per popolare il catalogo con 50 prodotti gaming selezionati.
              </p>
            </div>
            <div className="shrink-0 rounded-xl border border-neon-purple/40 bg-bg-card px-4 py-2 text-center">
              <p className="text-2xl font-black text-neon-purple">50</p>
              <p className="text-xs text-text-secondary">prodotti pronti</p>
            </div>
          </div>
          <div className="mt-3 rounded-lg bg-bg-card px-4 py-3">
            <p className="font-mono text-xs text-text-secondary">$ npm run seed</p>
            <p className="mt-1 font-mono text-xs text-badge-green">✅ Mouse, Tastiere, Monitor, Cuffie, Streaming Gear, SSD, RAM...</p>
          </div>
        </div>

        {/* Prodotti recenti */}
        {recent.length > 0 && (
          <div>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-text-secondary">
              Ultimi prodotti aggiunti
            </h2>
            <div className="rounded-xl border border-border bg-bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-bg-hover">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">Prodotto</th>
                    <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary md:table-cell">Categoria</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-text-secondary">Prezzo</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-text-secondary">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((p, i) => (
                    <tr key={p.id} className={`border-b border-border last:border-0 ${i % 2 === 0 ? '' : 'bg-bg-hover/30'}`}>
                      <td className="px-4 py-3 font-medium text-text-primary">{p.title}</td>
                      <td className="hidden px-4 py-3 text-text-secondary md:table-cell">
                        <span className="rounded-full bg-bg-hover px-2 py-0.5 text-xs">{p.category}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-accent">
                        {p.price_current.toFixed(2)}€
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/products/${p.slug}`}
                          target="_blank"
                          className="text-xs text-text-secondary transition hover:text-accent"
                        >
                          Vedi →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty state */}
        {recent.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
            <p className="text-4xl">📦</p>
            <p className="mt-3 font-semibold text-text-primary">Nessun prodotto ancora</p>
            <p className="mt-1 text-sm text-text-secondary">Aggiungi il primo prodotto o esegui <code className="text-accent">npm run seed</code></p>
            <Link
              href="/admin"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-bold text-bg-dark transition hover:bg-accent-hover"
            >
              ✨ Aggiungi Prodotto
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
  accent = false,
}: {
  label: string
  value: number | string
  icon: string
  accent?: boolean
}) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? 'border-accent/30 bg-accent/5' : 'border-border bg-bg-card'}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-text-secondary">{label}</p>
        <span className="text-lg">{icon}</span>
      </div>
      <p className={`mt-2 text-3xl font-black ${accent ? 'text-accent' : 'text-text-primary'}`}>
        {value}
      </p>
    </div>
  )
}
