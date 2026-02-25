import { supabase } from '@/lib/supabase'
import { Truck, ShieldCheck, RotateCcw } from 'lucide-react'
import Navbar from './components/Navbar'
import QuizCard from './components/QuizCard'
import HomeClient from './components/HomeClient'
import { Suspense } from 'react'
import type { Product } from '@/types/supabase'

// No cache — dati sempre freschi da Supabase
export const revalidate = 0

async function getProducts(): Promise<Product[]> {
  const { data } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })
  return data ?? []
}

interface SiteSettings {
  hero_title: string
  hero_subtitle: string
}

async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const { data } = await supabase
      .from('site_settings')
      .select('hero_title, hero_subtitle')
      .eq('id', 1)
      .single()
    return data ?? { hero_title: '', hero_subtitle: '' }
  } catch {
    return { hero_title: '', hero_subtitle: '' }
  }
}

const MACRO_CATEGORIES = [
  {
    key: 'audio',
    emoji: '🎧',
    label: 'AUDIO',
    sub: 'Cuffie, Mic, DAC',
    gradient: 'from-violet-500/20 to-violet-500/0',
    border: 'hover:border-violet-500/50',
  },
  {
    key: 'streaming',
    emoji: '🎥',
    label: 'STREAMING',
    sub: 'Webcam, Deck, Luci',
    gradient: 'from-sky-500/20 to-sky-500/0',
    border: 'hover:border-sky-500/50',
  },
  {
    key: 'gaming',
    emoji: '🎮',
    label: 'GAMING',
    sub: 'Tastiere, Mouse, Sedie',
    gradient: 'from-emerald-500/20 to-emerald-500/0',
    border: 'hover:border-emerald-500/50',
  },
  {
    key: 'smarthome',
    emoji: '🏠',
    label: 'SMART HOME',
    sub: 'LED, Sensori, Robot',
    gradient: 'from-orange-500/20 to-orange-500/0',
    border: 'hover:border-orange-500/50',
  },
  {
    key: 'accessori',
    emoji: '🔌',
    label: 'ACCESSORI',
    sub: 'Cavi, Hub, Stand',
    gradient: 'from-rose-500/20 to-rose-500/0',
    border: 'hover:border-rose-500/50',
  },
]

export default async function Home() {
  const [products, siteSettings] = await Promise.all([getProducts(), getSiteSettings()])

  return (
    <div className="min-h-screen bg-bg-dark">
      <Navbar />

      {/* ── HERO ──────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border bg-bg-dark px-4 py-10 md:py-16">
        {/* Ambient gradient background */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-20 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-accent/8 blur-[80px]" />
          <div className="absolute -bottom-10 right-1/4 h-48 w-48 rounded-full bg-neon-purple/8 blur-[60px]" />
        </div>

        <div className="relative mx-auto max-w-3xl text-center">
          {/* Logo mark — compact, hero */}
          <div className="mb-4 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://layehkivpxlscamgfive.supabase.co/storage/v1/object/public/logos/logo1-removebg-preview.png"
              alt="Kitwer26"
              className="h-16 w-16 object-contain"
            />
          </div>

          {/* Eyebrow pill */}
          <span className="mb-4 inline-block rounded-full border border-accent/30 bg-accent/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-wider text-accent">
            Gaming Hardware &amp; Streaming Gear
          </span>

          {/* Headline — punchy & impactful */}
          {siteSettings.hero_title ? (
            <h1 className="mb-3 text-[clamp(1.85rem,6vw,3.5rem)] font-black leading-[1.1] tracking-tight text-text-primary">
              {siteSettings.hero_title}
            </h1>
          ) : (
            <h1 className="mb-3 text-[clamp(1.85rem,6vw,3.5rem)] font-black leading-[1.1] tracking-tight text-text-primary">
              Potenzia il Tuo Setup.
              <span className="block text-accent">Domina il Gioco.</span>
            </h1>
          )}

          <p className="mx-auto mb-7 max-w-xl text-[clamp(0.875rem,2.5vw,1.05rem)] leading-relaxed text-text-secondary">
            {siteSettings.hero_subtitle ||
              'Mouse, monitor, microfoni e streaming gear ai prezzi migliori. Spedizione assicurata — qualità verificata prima della partenza.'}
          </p>

        </div>
      </section>

      {/* ── 5 MACRO-CATEGORIE ─────────────────────────── */}
      <section className="border-b border-border bg-bg-dark px-4 py-6">
        <div className="mx-auto max-w-7xl">
          <p className="mb-4 text-center text-xs font-semibold uppercase tracking-wider text-text-secondary/50">
            Esplora per Categoria
          </p>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5 md:gap-3">
            {MACRO_CATEGORIES.map((cat) => (
              <a
                key={cat.key}
                href={`/?macro=${cat.key}`}
                className={[
                  'group relative flex flex-col items-center gap-2 overflow-hidden rounded-2xl border border-border p-4 text-center',
                  'transition-all duration-200',
                  'hover:scale-[1.03] hover:shadow-[0_4px_20px_rgba(0,0,0,0.4)]',
                  cat.border,
                  'md:p-5',
                ].join(' ')}
                style={{ background: '#111116' }}
              >
                {/* Gradient bg */}
                <div className={`pointer-events-none absolute inset-0 bg-gradient-to-b ${cat.gradient} opacity-0 transition-opacity duration-200 group-hover:opacity-100`} />

                <span className="relative text-3xl leading-none md:text-4xl">{cat.emoji}</span>
                <div className="relative">
                  <p className="text-[11px] font-black uppercase tracking-widest text-text-primary">
                    {cat.label}
                  </p>
                  <p className="mt-0.5 hidden text-[10px] text-text-secondary/60 sm:block">
                    {cat.sub}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRUST BADGES ──────────────────────────────── */}
      <section className="border-b border-border bg-bg-card/30">
        <div className="mx-auto flex max-w-7xl flex-wrap justify-center gap-6 px-4 py-3.5 md:gap-12">
          {[
            { icon: Truck,       text: 'Spedizione Assicurata' },
            { icon: ShieldCheck, text: 'Pagamento Sicuro SSL' },
            { icon: RotateCcw,   text: 'Reso 14 Giorni' },
          ].map(({ icon: Icon, text }) => (
            <span key={text} className="flex items-center gap-2 text-xs font-medium text-text-secondary">
              <Icon className="h-3.5 w-3.5 text-accent" />
              {text}
            </span>
          ))}
        </div>
      </section>

      {/* ── PRODUCT GRID (live search + client-side filter) ─────────── */}
      <Suspense
        fallback={
          <div className="mx-auto max-w-7xl px-4 py-10">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-square animate-pulse rounded-2xl" style={{ background: '#111116' }} />
              ))}
            </div>
          </div>
        }
      >
        <HomeClient initialProducts={products} />
      </Suspense>

      {/* ── QUIZ CTA ──────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 pb-16">
        <QuizCard />
      </section>

      {/* ── FOOTER ────────────────────────────────────── */}
      <footer className="border-t border-border bg-bg-dark px-4 py-12">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://layehkivpxlscamgfive.supabase.co/storage/v1/object/public/logos/logo1-removebg-preview.png"
                alt="Kitwer26"
                className="h-10 w-10 object-contain"
              />
              <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                Hardware gaming e streaming gear. Prezzi aggiornati, spedizione sicura.
              </p>
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-neon-green/20 bg-neon-green/5 px-3 py-2.5">
                <Truck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neon-green" />
                <div>
                  <p className="text-[11px] font-semibold text-neon-green">Spedizione Standard: 7–14 giorni lavorativi</p>
                  <p className="text-[10px] text-text-secondary">Controllo qualità incluso prima della partenza</p>
                </div>
              </div>
            </div>

            {/* Categorie */}
            <div>
              <h5 className="mb-4 text-xs font-bold uppercase tracking-wider text-text-secondary/60">Categorie</h5>
              <ul className="space-y-3 text-sm">
                {MACRO_CATEGORIES.map((cat) => (
                  <li key={cat.key}>
                    <a href={`/?macro=${cat.key}`} className="text-text-secondary transition hover:text-accent">
                      {cat.emoji} {cat.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Supporto */}
            <div>
              <h5 className="mb-4 text-xs font-bold uppercase tracking-wider text-text-secondary/60">Supporto</h5>
              <ul className="space-y-3 text-sm">
                <li><a href="/contact" className="text-text-secondary transition hover:text-accent">Contattaci</a></li>
                <li><a href="mailto:kitwer26@zohomail.eu" className="text-text-secondary transition hover:text-accent">kitwer26@zohomail.eu</a></li>
                <li><a href="tel:+393756443391" className="text-text-secondary transition hover:text-accent">+39 375 644 3391</a></li>
              </ul>
            </div>

            {/* Legale */}
            <div>
              <h5 className="mb-4 text-xs font-bold uppercase tracking-wider text-text-secondary/60">Legale</h5>
              <ul className="space-y-3 text-sm">
                <li><a href="/terms" className="text-text-secondary transition hover:text-accent">Termini e Condizioni</a></li>
                <li><a href="/privacy" className="text-text-secondary transition hover:text-accent">Privacy Policy</a></li>
              </ul>
            </div>
          </div>

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
