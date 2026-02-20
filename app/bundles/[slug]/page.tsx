import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Check, AlertTriangle, Package, Shield, Truck } from 'lucide-react'
import BundleCheckoutForm from '@/app/components/BundleCheckoutForm'
import type { Metadata } from 'next'
import type { BundleItem } from '@/types/supabase'

export const revalidate = 3600

interface PageProps {
  params: Promise<{ slug: string }>
}

async function getBundle(slug: string) {
  const { data } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .eq('is_bundle', true)
    .single()
  return data
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const bundle = await getBundle(slug)
  if (!bundle) return { title: 'Bundle non trovato' }

  return {
    title: bundle.meta_title ?? `${bundle.title} | Kitwer26`,
    description: bundle.meta_description ?? bundle.description.slice(0, 160),
    openGraph: {
      title: bundle.title,
      description: bundle.description.slice(0, 160),
      images: bundle.image_url ? [bundle.image_url] : [],
    },
  }
}

export default async function BundlePage({ params }: PageProps) {
  const { slug } = await params
  const bundle = await getBundle(slug)
  if (!bundle) notFound()

  const items: BundleItem[] = bundle.bundle_items ?? []
  const totalValue = items.reduce((sum: number, item: BundleItem) => sum + item.price * item.quantity, 0)
  const savings = totalValue > 0 ? totalValue - bundle.price_current : 0

  return (
    <main className="min-h-screen bg-bg-dark">
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border px-4 py-20 md:py-28">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-neon-purple/10" />
        <div className="relative mx-auto max-w-3xl text-center">
          <span className="mb-4 inline-block rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-xs font-semibold text-accent">
            Bundle Esclusivo
          </span>
          <h1 className="mb-6 text-4xl font-bold leading-tight text-text-primary md:text-5xl lg:text-6xl">
            Diventa Streamer
            <span className="block text-accent">in 48 ore</span>
          </h1>
          <p className="mx-auto max-w-xl text-lg text-text-secondary">
            {bundle.description}
          </p>

          {bundle.image_url && (
            <div className="mx-auto mt-10 max-w-lg overflow-hidden rounded-2xl border border-border bg-bg-card">
              <img
                src={bundle.image_url}
                alt={bundle.title}
                className="h-full w-full object-contain p-8"
              />
            </div>
          )}
        </div>
      </section>

      {/* PROBLEM */}
      <section className="border-b border-border px-4 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-8 text-center text-2xl font-bold text-text-primary md:text-3xl">
            Perché comprare pezzi singoli è un errore
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { icon: AlertTriangle, title: 'Compatibilità incerta', desc: 'Rischi di comprare componenti che non funzionano bene insieme.' },
              { icon: AlertTriangle, title: 'Tempo perso in ricerche', desc: 'Ore a confrontare recensioni, specifiche e prezzi su decine di siti.' },
              { icon: AlertTriangle, title: 'Costi nascosti', desc: 'Cavi, adattatori e accessori mancanti che fanno lievitare il totale.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-xl border border-border bg-bg-card p-5">
                <Icon className="mb-3 h-6 w-6 text-badge-red" />
                <h3 className="mb-2 font-semibold text-text-primary">{title}</h3>
                <p className="text-sm text-text-secondary">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SOLUTION */}
      <section className="border-b border-border px-4 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-2 text-center text-2xl font-bold text-text-primary md:text-3xl">
            {bundle.title}
          </h2>
          <p className="mb-10 text-center text-text-secondary">
            Tutto quello che ti serve, testato e ottimizzato insieme.
          </p>

          <div className="rounded-2xl border border-accent/30 bg-bg-card p-6 md:p-8">
            <div className="mb-6 flex items-center gap-2 text-sm font-semibold text-accent">
              <Package className="h-5 w-5" />
              Cosa include il bundle
            </div>

            <div className="space-y-3">
              {items.map((item, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-border bg-bg-dark px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 flex-shrink-0 text-badge-green" />
                    <span className="text-sm font-medium text-text-primary">
                      {item.title}
                      {item.quantity > 1 && <span className="text-text-secondary"> x{item.quantity}</span>}
                    </span>
                  </div>
                  <span className="text-sm text-text-secondary">{item.price.toFixed(2)}€</span>
                </div>
              ))}
            </div>

            {/* Trust badges */}
            <div className="mt-6 flex flex-wrap justify-center gap-4 text-xs text-text-secondary">
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-badge-green" /> Ottimizzato
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-badge-green" /> Testato
              </span>
              <span className="flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-badge-green" /> Garanzia
              </span>
              <span className="flex items-center gap-1.5">
                <Truck className="h-4 w-4 text-badge-green" /> Spedizione Gratuita
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* PRICE ANCHORING + CTA */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-lg">
          {/* Price anchoring */}
          <div className="mb-8 rounded-2xl border border-accent/30 bg-bg-card p-6 text-center">
            {totalValue > 0 && (
              <div className="mb-2">
                <span className="text-sm text-text-secondary">Valore totale dei singoli prodotti: </span>
                <span className="text-xl text-text-secondary line-through">{totalValue.toFixed(2)}€</span>
              </div>
            )}
            <div className="mb-1">
              <span className="text-sm text-text-secondary">Prezzo Bundle: </span>
              <span className="text-4xl font-bold text-accent">{bundle.price_current.toFixed(2)}€</span>
            </div>
            {savings > 0 && (
              <span className="inline-block rounded-full bg-badge-green/20 px-3 py-1 text-sm font-bold text-badge-green">
                Risparmi {savings.toFixed(2)}€
              </span>
            )}
            <p className="mt-3 text-xs text-text-secondary">IVA inclusa • Spedizione gratuita</p>
          </div>

          {/* Checkout form */}
          <BundleCheckoutForm productId={bundle.id} />
        </div>
      </section>
    </main>
  )
}
