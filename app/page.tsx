import { supabase } from '@/lib/supabase'
import { Truck, Shield, RotateCcw } from 'lucide-react'
import Navbar from './components/Navbar'
import ProductCard from './components/ProductCard'
import QuizCard from './components/QuizCard'
import type { Product } from '@/types/supabase'

// ISR: rigenera homepage ogni ora (revalidatePath() lo bypassa on-demand)
export const revalidate = 3600

async function getProducts(): Promise<Product[]> {
  const { data } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })
  return data ?? []
}

interface SiteSettings {
  logo_url: string
  hero_title: string
  hero_subtitle: string
}

async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const { data } = await supabase
      .from('site_settings')
      .select('logo_url, hero_title, hero_subtitle')
      .eq('id', 1)
      .single()
    return data ?? { logo_url: '', hero_title: '', hero_subtitle: '' }
  } catch {
    return { logo_url: '', hero_title: '', hero_subtitle: '' }
  }
}

const HERO_DEFAULT = {
  title: 'Le migliori offerte',
  titleAccent: 'per il tuo setup',
  subtitle: 'Confrontiamo i prezzi dei migliori prodotti gaming e streaming. Trova il deal perfetto per mouse, monitor, tastiere e tutto il gear che ti serve.',
}

export default async function Home() {
  const [products, siteSettings] = await Promise.all([getProducts(), getSiteSettings()])

  const categories = Array.from(new Set(products.map((p) => p.category)))

  return (
    <div className="min-h-screen bg-bg-dark">
      <Navbar logoUrl={siteSettings.logo_url || undefined} />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border bg-bg-dark px-4 py-14 md:py-24">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-neon-purple/5" />
        <div className="relative mx-auto max-w-4xl text-center">
          {/* Logo Hero — visibile se caricato dal CMS, altrimenti nascosto */}
          {siteSettings.logo_url && (
            <div className="mb-6 flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={siteSettings.logo_url}
                alt="Kitwer26"
                className="h-24 w-auto object-contain md:h-28"
                style={{ maxHeight: '112px' }}
              />
            </div>
          )}
          <span className="mb-4 inline-block rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-xs font-semibold text-accent">
            Gaming Hardware &amp; Streaming Gear
          </span>
          {siteSettings.hero_title ? (
            /* Titolo personalizzato dal CMS — una sola riga, scaling aggressivo mobile-first */
            <h1 className="mb-5 text-[clamp(1.75rem,6vw,3.75rem)] font-bold leading-tight text-text-primary">
              {siteSettings.hero_title}
            </h1>
          ) : (
            /* Default fallback con accent su seconda riga */
            <h1 className="mb-5 text-[clamp(1.75rem,6vw,3.75rem)] font-bold leading-tight text-text-primary">
              {HERO_DEFAULT.title}
              <span className="block text-accent">{HERO_DEFAULT.titleAccent}</span>
            </h1>
          )}
          <p className="mx-auto mb-8 max-w-2xl text-[clamp(0.9rem,2.5vw,1.125rem)] leading-relaxed text-text-secondary">
            {siteSettings.hero_subtitle || HERO_DEFAULT.subtitle}
          </p>
        </div>
      </section>

      {/* Category Pills */}
      <section className="border-b border-border bg-bg-dark">
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-4 scrollbar-none">
          <span className="flex-shrink-0 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-bg-dark">
            Tutti
          </span>
          {categories.map((cat) => (
            <span
              key={cat}
              className="flex-shrink-0 cursor-pointer rounded-full border border-border px-4 py-2 text-sm text-text-secondary transition hover:border-accent hover:text-accent"
            >
              {cat}
            </span>
          ))}
        </div>
      </section>

      {/* Trust Badges */}
      <section className="border-b border-border bg-bg-card/50">
        <div className="mx-auto flex max-w-7xl flex-wrap justify-center gap-6 px-4 py-4 md:gap-10">
          <span className="flex items-center gap-2 text-xs font-medium text-text-secondary">
            <Truck className="h-4 w-4 text-accent" /> Spedizione Gratuita
          </span>
          <span className="flex items-center gap-2 text-xs font-medium text-text-secondary">
            <Shield className="h-4 w-4 text-accent" /> Pagamento Sicuro
          </span>
          <span className="flex items-center gap-2 text-xs font-medium text-text-secondary">
            <RotateCcw className="h-4 w-4 text-accent" /> Reso Facile 14 Giorni
          </span>
        </div>
      </section>

      {/* Products Grid */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        {products.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
              />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center">
            <p className="mb-2 text-2xl font-bold text-text-primary">Nessun prodotto ancora</p>
            <p className="text-text-secondary">
              Esegui lo script di seed per popolare il database.
            </p>
            <code className="mt-4 inline-block rounded-lg bg-bg-card px-4 py-2 text-sm text-accent">
              npx tsx scripts/seed-gaming.ts
            </code>
          </div>
        )}
      </section>

      {/* Quiz CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-16">
        <QuizCard />
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-bg-dark px-4 py-12">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <span className="text-xl font-bold text-accent">Kitwer26</span>
              <span className="ml-1 text-xs text-text-secondary">GAMING</span>
              <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                Hardware gaming e streaming gear. Prezzi aggiornati, spedizione sicura.
              </p>
            </div>

            {/* Categorie */}
            <div>
              <h5 className="mb-4 text-xs font-bold uppercase tracking-wider text-text-secondary/60">Categorie</h5>
              <ul className="space-y-3 text-sm">
                {categories.slice(0, 5).map((cat) => (
                  <li key={cat}>
                    <a href={`/?category=${encodeURIComponent(cat)}`}
                      className="text-text-secondary transition hover:text-accent">
                      {cat}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Supporto */}
            <div>
              <h5 className="mb-4 text-xs font-bold uppercase tracking-wider text-text-secondary/60">Supporto</h5>
              <ul className="space-y-3 text-sm">
                <li>
                  <a href="/contact" className="text-text-secondary transition hover:text-accent">
                    Contattaci
                  </a>
                </li>
                <li>
                  <a href="mailto:kitwer26@zohomail.eu" className="text-text-secondary transition hover:text-accent">
                    kitwer26@zohomail.eu
                  </a>
                </li>
                <li>
                  <a href="tel:+393756443391" className="text-text-secondary transition hover:text-accent">
                    +39 375 644 3391
                  </a>
                </li>
              </ul>
            </div>

            {/* Legale */}
            <div>
              <h5 className="mb-4 text-xs font-bold uppercase tracking-wider text-text-secondary/60">Legale</h5>
              <ul className="space-y-3 text-sm">
                <li>
                  <a href="/terms" className="text-text-secondary transition hover:text-accent">
                    Termini e Condizioni
                  </a>
                </li>
                <li>
                  <a href="/privacy" className="text-text-secondary transition hover:text-accent">
                    Privacy Policy
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-xs text-text-secondary sm:flex-row">
            <span>&copy; 2026 Kitwer26 &middot; Gaming Hardware &amp; Streaming Gear</span>
            <div className="flex gap-4">
              <a href="/privacy" className="transition hover:text-accent">Privacy</a>
              <a href="/terms" className="transition hover:text-accent">Termini</a>
              <a href="/contact" className="transition hover:text-accent">Contatti</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
