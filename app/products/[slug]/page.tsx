import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import TechSpecsTable from '@/app/components/TechSpecsTable'
import AdBanner from '@/app/components/AdBanner'
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
  const product = await getProduct(slug)
  if (!product) notFound()

  const discount = product.price_original
    ? Math.round((1 - product.price_current / product.price_original) * 100)
    : 0

  return (
    <main className="min-h-screen bg-bg-dark">
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
              <img
                src={product.image_url}
                alt={product.title}
                className="h-full w-full object-contain p-8"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-text-secondary text-6xl">
                🎮
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-col gap-6">
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
            </div>

            {/* Description */}
            <div className="text-sm leading-relaxed text-text-secondary">
              {product.description}
            </div>
          </div>
        </div>

        {/* Ad Banner - tra descrizione e specs */}
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
