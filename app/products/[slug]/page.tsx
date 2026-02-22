import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import TechSpecsTable from '@/app/components/TechSpecsTable'
import AdBanner from '@/app/components/AdBanner'
import ProductAnalyticsTracker from '@/app/components/ProductAnalyticsTracker'
import BundleCheckoutForm from '@/app/components/BundleCheckoutForm'
import FomoBar from '@/app/components/FomoBar'
import StickyBuyBar from '@/app/components/StickyBuyBar'
import ShareButtons from '@/app/components/ShareButtons'
import type { Metadata } from 'next'

// ISR: rigenera ogni ora
export const revalidate = 3600

interface PageProps {
  params: Promise<{ slug: string }>
}

async function getProduct(slug: string) {
  const { data } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .single()
  return data
}

async function getRelatedKits(limit = 2) {
  const { data } = await supabase
    .from('kits')
    .select('id, title, slug, description, price_current, price_original')
    .order('created_at', { ascending: false })
    .limit(limit)
  return data ?? []
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const product = await getProduct(slug)
  if (!product) return { title: 'Prodotto non trovato' }

  return {
    title: product.meta_title ?? `${product.title} | Kitwer26`,
    description: product.meta_description ?? product.description.slice(0, 160),
    openGraph: {
      title: product.title,
      description: product.description.slice(0, 160),
      images: product.image_url ? [product.image_url] : [],
    },
  }
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params
  const [product, kits] = await Promise.all([getProduct(slug), getRelatedKits()])
  if (!product) notFound()

  const discount = product.price_original
    ? Math.round((1 - product.price_current / product.price_original) * 100)
    : 0

  return (
    <main className="min-h-screen bg-bg-dark pb-24 md:pb-0">
      <ProductAnalyticsTracker
        productSlug={product.slug}
        productTitle={product.title}
        productId={product.id}
      />

      {/* Sticky Buy Bar — mobile only, appare quando il form è fuori viewport */}
      {product.is_direct_sell && (
        <StickyBuyBar
          title={product.title}
          price={product.price_current}
          targetId="buy-form"
        />
      )}

      {/* Breadcrumb */}
      <div className="mx-auto max-w-4xl px-4 pt-6">
        <nav className="text-sm text-text-secondary">
          <a href="/" className="hover:text-accent">Home</a>
          <span className="mx-2">/</span>
          <span className="text-text-primary">{product.category}</span>
        </nav>
      </div>

      <article className="mx-auto max-w-4xl px-4 py-8">
        <div className="grid gap-8 md:grid-cols-2">
          {/* Image */}
          <div className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-bg-card">
            {product.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.image_url}
                alt={product.title}
                className="h-full w-full object-contain p-8"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-6xl text-text-secondary">
                🎮
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-col gap-5">
            <div>
              <span className="mb-2 inline-block rounded-full bg-border px-3 py-1 text-xs text-text-secondary">
                {product.category}
              </span>
              <h1 className="text-2xl font-bold text-text-primary md:text-3xl">
                {product.title}
              </h1>
            </div>

            {/* Price block */}
            <div className="rounded-xl border border-border bg-bg-card p-4">
              {product.is_direct_sell && (
                <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-badge-green/15 px-3 py-1">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-badge-green" />
                  <span className="text-xs font-semibold text-badge-green">Disponibilità Immediata</span>
                </div>
              )}
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-accent">
                  {product.price_current.toFixed(2)}€
                </span>
                {product.price_original && product.price_original > product.price_current && (
                  <>
                    <span className="text-lg text-text-secondary line-through">
                      {product.price_original.toFixed(2)}€
                    </span>
                    <span className="rounded-full bg-badge-green px-2 py-0.5 text-xs font-bold text-white">
                      -{discount}%
                    </span>
                  </>
                )}
              </div>
              <p className="mt-1 text-xs text-text-secondary">
                Prezzo aggiornato • IVA inclusa
              </p>
              {product.is_direct_sell && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-neon-green/5 px-3 py-2 text-xs text-neon-green">
                  <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                  </svg>
                  <span>
                    <span className="font-semibold">Consegna stimata:</span>{' '}
                    Elaborazione 2-3gg + Spedizione 5-9gg lavorativi
                  </span>
                </div>
              )}
            </div>

            {/* FOMO — social proof + urgency */}
            {product.is_direct_sell && <FomoBar productId={product.id} />}

            {/* Description */}
            <div className="text-sm leading-relaxed text-text-secondary">
              {product.description}
            </div>

            {/* Buy Now form — solo se is_direct_sell */}
            {product.is_direct_sell && (
              <div id="buy-form" className="rounded-xl border border-accent/20 bg-bg-card p-5">
                <p className="mb-4 text-sm font-semibold text-text-primary">Acquista Ora</p>
                <BundleCheckoutForm
                  productId={product.id}
                  productSlug={product.slug}
                  productTitle={product.title}
                  buttonLabel="Acquista Ora"
                />
              </div>
            )}

            {/* Share Buttons */}
            <ShareButtons title={product.title} />
          </div>
        </div>

        {/* Upsell — Kits */}
        {kits.length > 0 && (
          <section className="mt-12">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-accent">Risparmia di più</p>
                <h2 className="text-xl font-bold text-text-primary">Completa il tuo Setup</h2>
              </div>
              <a href="/" className="text-sm text-text-secondary hover:text-accent">Vedi tutti →</a>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {kits.map((kit) => {
                const kitDiscount = kit.price_original && kit.price_original > kit.price_current
                  ? Math.round((1 - kit.price_current / kit.price_original) * 100)
                  : null
                return (
                  <a
                    key={kit.id}
                    href={`/kits/${kit.slug}`}
                    className="group relative overflow-hidden rounded-2xl border border-border bg-bg-card p-5 transition-all hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5"
                  >
                    {/* Glow accent top */}
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />

                    <div className="mb-3 flex items-start justify-between gap-2">
                      <span className="text-2xl">🎮</span>
                      {kitDiscount && (
                        <span className="rounded-full bg-accent/15 px-2.5 py-1 text-xs font-bold text-accent">
                          -{kitDiscount}% Bundle
                        </span>
                      )}
                    </div>

                    <h3 className="mb-1 font-bold text-text-primary group-hover:text-accent transition-colors">
                      {kit.title}
                    </h3>
                    <p className="mb-3 line-clamp-2 text-xs text-text-secondary">
                      {kit.description}
                    </p>

                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-accent">{kit.price_current.toFixed(2)}€</span>
                      {kit.price_original && (
                        <span className="text-sm text-text-secondary line-through">
                          {kit.price_original.toFixed(2)}€
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex items-center gap-1 text-xs font-medium text-accent">
                      <span>Scopri il kit</span>
                      <svg className="h-3 w-3 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </a>
                )
              })}
            </div>
          </section>
        )}

        {/* Ad Banner */}
        <div className="mt-10">
          <AdBanner slot="productInline" format="rectangle" />
        </div>

        {/* Tech Specs */}
        <div className="mt-8">
          <TechSpecsTable specs={product.specs} />
        </div>
      </article>
    </main>
  )
}
