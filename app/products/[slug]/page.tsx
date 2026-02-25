import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import TechSpecsTable from '@/app/components/TechSpecsTable'
import PromoBanner from '@/app/components/PromoBanner'
import ProductAnalyticsTracker from '@/app/components/ProductAnalyticsTracker'
import BundleCheckoutForm from '@/app/components/BundleCheckoutForm'
import FomoBar from '@/app/components/FomoBar'
import StickyBuyBar from '@/app/components/StickyBuyBar'
import ShareButtons from '@/app/components/ShareButtons'
import ProductGallery from '@/app/components/ProductGallery'
import AddToCartButton from '@/app/components/AddToCartButton'
import VariantSelector from '@/app/components/VariantSelector'
import type { ProductVariant } from '@/app/components/VariantSelector'
import ProductVariantControls from '@/app/components/ProductVariantControls'
import { ProductGalleryProvider } from '@/app/context/ProductGalleryContext'
import type { Metadata } from 'next'
import { Star, Truck, ShieldCheck, RotateCcw, CheckCircle2 } from 'lucide-react'

// Dati sempre freschi da Supabase
export const revalidate = 0

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

async function getVariants(productId: string): Promise<ProductVariant[]> {
  const { data } = await supabase
    .from('product_variants')
    .select('id, variant_type, name, color_hex, price_override, stock_quantity, image_url, sort_order')
    .eq('product_id', productId)
    .order('sort_order')
    .order('created_at')
  return data ?? []
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
      images: product.image_url
        ? [product.image_url.split(',')[0].trim()]
        : [],
    },
  }
}

// Placeholder reviews data
const REVIEWS = [
  {
    id: 1,
    name: 'Marco T.',
    date: 'Gennaio 2026',
    rating: 5,
    title: 'Qualità eccellente, supera le aspettative',
    body: 'Prodotto arrivato perfettamente imballato e in ottime condizioni. La qualità costruttiva è top, si vede la differenza rispetto a prodotti simili. Consigliato!',
    verified: true,
  },
  {
    id: 2,
    name: 'Sara M.',
    date: 'Febbraio 2026',
    rating: 5,
    title: 'Setup completato, finalmente!',
    body: 'Stavo cercando questo prodotto da mesi a un prezzo ragionevole. Kitwer26 me lo ha fatto trovare con uno sconto ottimo. Spedizione rapida e tracciabile.',
    verified: true,
  },
  {
    id: 3,
    name: 'Luca B.',
    date: 'Gennaio 2026',
    rating: 4,
    title: 'Ottimo prodotto, packaging curato',
    body: 'Molto soddisfatto dell\'acquisto. Il prodotto corrisponde esattamente alla descrizione. Packaging curatissimo, zero danni durante il trasporto.',
    verified: true,
  },
  {
    id: 4,
    name: 'Giulia R.',
    date: 'Dicembre 2025',
    rating: 5,
    title: 'Lo uso da due mesi, zero problemi',
    body: 'Acquistato per migliorare il mio setup streaming. Funziona alla perfezione da quando l\'ho ricevuto. Nessun difetto, nessun problema. Tornerò ad acquistare.',
    verified: true,
  },
  {
    id: 5,
    name: 'Alessandro F.',
    date: 'Dicembre 2025',
    rating: 4,
    title: 'Rapporto qualità/prezzo imbattibile',
    body: 'Avevo dubbi inizialmente ma alla fine sono rimasto piacevolmente sorpreso. La qualità è quella promessa e il prezzo era davvero competitivo rispetto ai competitor.',
    verified: false,
  },
]

function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={size}
          className={s <= rating ? 'fill-amber-400 text-amber-400' : 'fill-none text-border'}
        />
      ))}
    </div>
  )
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params
  const product = await getProduct(slug)
  if (!product) notFound()
  const [kits, variants] = await Promise.all([getRelatedKits(), getVariants(product.id)])

  // Prima immagine — usata nei componenti che accettano una sola URL
  const firstImageUrl = product.image_url?.split(',')[0]?.trim() || undefined

  // Parse colonna 'sizes': può essere string[] (JSONB/text[]) o stringa CSV
  const rawSizes = product.sizes
  const sizes: string[] = Array.isArray(rawSizes)
    ? (rawSizes as string[]).filter(Boolean)
    : typeof rawSizes === 'string' && rawSizes.trim()
      ? rawSizes.split(',').map((s: string) => s.trim()).filter(Boolean)
      : []

  // Parse colonna 'colors': stesso formato di sizes
  const rawColors = product.colors
  const colors: string[] = Array.isArray(rawColors)
    ? (rawColors as string[]).filter(Boolean)
    : typeof rawColors === 'string' && rawColors.trim()
      ? rawColors.split(',').map((c: string) => c.trim()).filter(Boolean)
      : []

  // imageUrls già parsato — serve a ProductVariantControls per la sincronizzazione gallery
  const imageUrls = product.image_url
    ? product.image_url.split(',').map((u: string) => u.trim()).filter(Boolean)
    : []

  const discount = product.price_original
    ? Math.round((1 - product.price_current / product.price_original) * 100)
    : 0

  const avgRating = 4.8
  const totalReviews = REVIEWS.length

  return (
    <main className="min-h-screen bg-bg-dark pb-24 md:pb-0">
      <ProductAnalyticsTracker
        productSlug={product.slug}
        productTitle={product.title}
        productId={product.id}
      />

      {/* Sticky Buy Bar — mobile only */}
      <StickyBuyBar
        productId={product.id}
        title={product.title}
        price={product.price_current}
        imageUrl={firstImageUrl}
        slug={product.slug}
        targetId={product.is_direct_sell ? 'buy-form' : undefined}
        isDirectSell={product.is_direct_sell}
      />

      {/* Breadcrumb */}
      <div className="mx-auto max-w-5xl px-4 pt-6">
        <nav className="text-sm text-text-secondary">
          <a href="/" className="hover:text-accent">Home</a>
          <span className="mx-2">/</span>
          <span className="text-text-primary">{product.category}</span>
        </nav>
      </div>

      <article className="mx-auto max-w-5xl px-4 py-8">
        <ProductGalleryProvider>
        <div className="grid gap-10 md:grid-cols-2">

          {/* ── GALLERY ─────────────────────────────────── */}
          <ProductGallery imageUrl={product.image_url} title={product.title} />

          {/* ── INFO ────────────────────────────────────── */}
          <div className="flex flex-col gap-5">

            {/* Category + Title */}
            <div>
              <span className="mb-2 inline-block rounded-full bg-border px-3 py-1 text-xs text-text-secondary">
                {product.category}
              </span>
              <h1 className="text-2xl font-bold leading-tight text-text-primary md:text-[1.85rem]">
                {product.title}
              </h1>

              {/* Rating summary */}
              <div className="mt-2 flex items-center gap-2">
                <StarRating rating={5} size={14} />
                <span className="text-sm font-semibold text-text-primary">{avgRating}</span>
                <span className="text-sm text-text-secondary">({totalReviews} recensioni)</span>
              </div>
            </div>

            {/* ── Price block ── */}
            <div className="rounded-xl border border-border bg-bg-card p-4">
              {product.is_direct_sell && (
                <>
                  <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-badge-green/15 px-3 py-1">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-badge-green" />
                    <span className="text-xs font-semibold text-badge-green">Disponibilità Immediata</span>
                  </div>
                  {/* Stock scarcity bar */}
                  <div className="mb-3">
                    <div className="mb-1 flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-badge-red">⚠ Solo pochi pezzi disponibili</span>
                      <span className="text-text-secondary">Magazzino quasi esaurito</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-badge-red to-accent transition-all"
                        style={{ width: '28%' }}
                      />
                    </div>
                  </div>
                </>
              )}
              {!product.is_direct_sell && (
                <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-badge-green/15 px-3 py-1">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-badge-green" />
                  <span className="text-xs font-semibold text-badge-green">Disponibilità Immediata</span>
                </div>
              )}

              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-bold text-accent">
                  {product.price_current.toFixed(2)}€
                </span>
                {product.price_original && product.price_original > product.price_current && (
                  <>
                    <span className="text-lg text-text-secondary line-through">
                      {product.price_original.toFixed(2)}€
                    </span>
                    <span className="rounded-full bg-badge-green px-2.5 py-0.5 text-sm font-bold text-white">
                      -{discount}%
                    </span>
                  </>
                )}
              </div>
              <p className="mt-1 text-xs text-text-secondary">Prezzo aggiornato · IVA inclusa</p>

              {/* Shipping badge — TASK 3 text */}
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-neon-green/20 bg-neon-green/5 px-3 py-2.5">
                <Truck className="mt-0.5 h-4 w-4 shrink-0 text-neon-green" />
                <div>
                  <p className="text-xs font-semibold text-neon-green">
                    Spedizione Standard Assicurata: 7–14 giorni lavorativi
                  </p>
                  <p className="mt-0.5 text-[11px] text-text-secondary">
                    Controllo qualità incluso prima della partenza
                  </p>
                </div>
              </div>
            </div>

            {/* FOMO — social proof + urgency */}
            {product.is_direct_sell && <FomoBar productId={product.id} />}

            {/* Description */}
            <div className="text-sm leading-relaxed text-text-secondary">
              {product.description}
            </div>

            {/* Trust pills */}
            <div className="flex flex-wrap gap-2">
              {[
                { icon: ShieldCheck, text: 'Garanzia 30 giorni' },
                { icon: RotateCcw, text: 'Reso gratuito 14gg' },
                { icon: CheckCircle2, text: 'Qualità verificata' },
              ].map(({ icon: Icon, text }) => (
                <span
                  key={text}
                  className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[11px] font-medium text-text-secondary"
                >
                  <Icon size={12} className="text-accent" />
                  {text}
                </span>
              ))}
            </div>

            {/* ── VARIANTI / MISURE / COLORI / ADD TO CART ── */}
            {variants.length > 0 ? (
              <VariantSelector
                variants={variants}
                basePrice={product.price_current}
                productId={product.id}
                productTitle={product.title}
                productSlug={product.slug}
                productImageUrl={firstImageUrl}
              />
            ) : (sizes.length > 0 || colors.length > 0) ? (
              <ProductVariantControls
                sizes={sizes}
                colors={colors}
                imageUrls={imageUrls}
                productId={product.id}
                productTitle={product.title}
                productPrice={product.price_current}
                productSlug={product.slug}
              />
            ) : (
              <AddToCartButton
                productId={product.id}
                productTitle={product.title}
                productPrice={product.price_current}
                productImageUrl={firstImageUrl}
                productSlug={product.slug}
              />
            )}

            {/* Buy Now form — solo se is_direct_sell */}
            {product.is_direct_sell && (
              <div id="buy-form" className="rounded-xl border border-accent/20 bg-bg-card p-5">
                <p className="mb-1 text-sm font-bold text-text-primary">Acquista Ora — Pagamento Diretto</p>
                <p className="mb-4 text-xs text-text-secondary">Compila i dati e vai al checkout sicuro Mollie</p>
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
        </ProductGalleryProvider>

        {/* ── REVIEWS SECTION ─────────────────────────────── */}
        <section className="mt-16">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-accent">Feedback verificato</p>
              <h2 className="text-xl font-bold text-text-primary">Recensioni Clienti</h2>
            </div>
            {/* Rating summary box */}
            <div className="shrink-0 rounded-2xl border border-border bg-bg-card px-5 py-3 text-center">
              <p className="text-3xl font-bold text-text-primary">{avgRating}</p>
              <StarRating rating={5} size={14} />
              <p className="mt-1 text-xs text-text-secondary">{totalReviews} recensioni</p>
            </div>
          </div>

          {/* Rating bars */}
          <div className="mb-8 space-y-2">
            {[
              { stars: 5, pct: 78 },
              { stars: 4, pct: 16 },
              { stars: 3, pct: 4 },
              { stars: 2, pct: 1 },
              { stars: 1, pct: 1 },
            ].map(({ stars, pct }) => (
              <div key={stars} className="flex items-center gap-3">
                <span className="w-4 text-right text-xs text-text-secondary">{stars}</span>
                <Star size={11} className="shrink-0 fill-amber-400 text-amber-400" />
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full bg-amber-400"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-7 text-xs text-text-secondary">{pct}%</span>
              </div>
            ))}
          </div>

          {/* Review cards */}
          <div className="grid gap-4 sm:grid-cols-2">
            {REVIEWS.map((review) => (
              <div
                key={review.id}
                className="relative overflow-hidden rounded-2xl border border-border bg-bg-card p-5"
              >
                {/* Top glow */}
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />

                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/15 text-sm font-bold text-accent">
                        {review.name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-text-primary">{review.name}</p>
                        <p className="text-[11px] text-text-secondary">{review.date}</p>
                      </div>
                    </div>
                  </div>
                  {review.verified && (
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-badge-green/10 px-2 py-0.5 text-[10px] font-semibold text-badge-green">
                      <CheckCircle2 size={9} />
                      Verificato
                    </span>
                  )}
                </div>

                <StarRating rating={review.rating} size={13} />
                <p className="mt-2 text-sm font-semibold text-text-primary">{review.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-text-secondary">{review.body}</p>
              </div>
            ))}
          </div>

          {/* CTA to leave a review */}
          <div className="mt-6 rounded-2xl border border-dashed border-border p-6 text-center">
            <p className="text-sm font-semibold text-text-primary">Hai acquistato questo prodotto?</p>
            <p className="mt-1 text-xs text-text-secondary">
              Condividi la tua esperienza — aiuta altri gamer a scegliere meglio.
            </p>
            <a
              href="mailto:kitwer26@zohomail.eu?subject=Recensione prodotto"
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-text-secondary transition hover:border-accent hover:text-accent"
            >
              Lascia una recensione →
            </a>
          </div>
        </section>

        {/* ── UPSELL KITS ─────────────────────────────────── */}
        {kits.length > 0 && (
          <section className="mt-14">
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
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <span className="text-2xl">🎮</span>
                      {kitDiscount && (
                        <span className="rounded-full bg-accent/15 px-2.5 py-1 text-xs font-bold text-accent">
                          -{kitDiscount}% Bundle
                        </span>
                      )}
                    </div>
                    <h3 className="mb-1 font-bold text-text-primary transition-colors group-hover:text-accent">
                      {kit.title}
                    </h3>
                    <p className="mb-3 line-clamp-2 text-xs text-text-secondary">{kit.description}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-accent">{kit.price_current.toFixed(2)}€</span>
                      {kit.price_original && (
                        <span className="text-sm text-text-secondary line-through">{kit.price_original.toFixed(2)}€</span>
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

        {/* Banner Promo + Tech Specs */}
        <div className="mt-10">
          <PromoBanner />
        </div>
        <div className="mt-8">
          <TechSpecsTable specs={product.specs} />
        </div>
      </article>
    </main>
  )
}
