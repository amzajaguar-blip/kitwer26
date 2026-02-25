import { supabase } from '@/lib/supabase'

interface BannerData {
  promo_banner_enabled: boolean
  promo_banner_image: string
  promo_banner_link: string
  promo_banner_text: string
}

async function getBanner(): Promise<BannerData | null> {
  try {
    const { data } = await supabase
      .from('site_settings')
      .select('promo_banner_enabled, promo_banner_image, promo_banner_link, promo_banner_text')
      .eq('id', 1)
      .single()
    return data ?? null
  } catch {
    return null
  }
}

export default async function PromoBanner({ className = '' }: { className?: string }) {
  const banner = await getBanner()

  // Banner disabilitato o non configurato
  if (!banner || !banner.promo_banner_enabled) return null

  const href = banner.promo_banner_link || '/'

  // Banner con immagine custom
  if (banner.promo_banner_image) {
    return (
      <a
        href={href}
        className={`group relative block overflow-hidden rounded-2xl border border-border transition hover:border-accent/40 ${className}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={banner.promo_banner_image}
          alt={banner.promo_banner_text || 'Promo Kitwer26'}
          className="w-full object-cover"
          style={{ maxHeight: '250px', minHeight: '120px' }}
        />
        {banner.promo_banner_text && (
          <div className="absolute inset-0 flex items-end bg-gradient-to-t from-bg-dark/80 via-transparent to-transparent p-4">
            <span className="text-sm font-bold text-white drop-shadow-lg md:text-base">
              {banner.promo_banner_text}
            </span>
          </div>
        )}
      </a>
    )
  }

  // Banner senza immagine — CTA grafico interno
  return (
    <a
      href={href}
      className={`group relative block overflow-hidden rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/10 via-bg-card to-neon-purple/10 p-6 transition hover:border-accent/50 hover:shadow-lg hover:shadow-accent/10 ${className}`}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent" />
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent/10 blur-2xl" />

      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">
            Offerte Esclusive
          </p>
          <h3 className="mt-1 text-lg font-bold leading-tight text-text-primary">
            {banner.promo_banner_text || 'Scopri i Migliori Deal Gaming'}
          </h3>
          <p className="mt-1 text-sm text-text-secondary">
            Mouse, tastiere, monitor — prezzi aggiornati ogni giorno
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-bg-dark shadow-lg shadow-accent/20 transition group-hover:bg-accent-hover sm:self-center">
          Vedi Offerte
          <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </span>
      </div>
    </a>
  )
}
