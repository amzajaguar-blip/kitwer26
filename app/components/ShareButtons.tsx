'use client'

import { useState } from 'react'

interface Props {
  title: string
}

export default function ShareButtons({ title }: Props) {
  const [copied, setCopied] = useState(false)

  const getUrl = () => (typeof window !== 'undefined' ? window.location.href : '')

  function shareWhatsApp() {
    const url = getUrl()
    window.open(`https://wa.me/?text=${encodeURIComponent(`${title} — ${url}`)}`, '_blank')
  }

  async function copyForTikTok() {
    await navigator.clipboard.writeText(getUrl())
    // Apre TikTok dopo aver copiato il link da incollare nella bio/caption
    window.open('https://www.tiktok.com/', '_blank')
  }

  async function copyLink() {
    await navigator.clipboard.writeText(getUrl())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-text-secondary">Condividi:</span>

      {/* WhatsApp */}
      <button
        onClick={shareWhatsApp}
        title="Invia su WhatsApp"
        className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-bg-dark transition-colors hover:border-[#25D366]/50 hover:bg-[#25D366]/10"
      >
        <svg className="h-4 w-4" fill="#25D366" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.847L0 24l6.335-1.508A11.944 11.944 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0m0 21.9a9.9 9.9 0 01-5.031-1.368l-.361-.214-3.741.981.998-3.648-.235-.374A9.86 9.86 0 012.1 12c0-5.468 4.432-9.9 9.9-9.9 5.469 0 9.9 4.432 9.9 9.9 0 5.468-4.431 9.9-9.9 9.9" />
        </svg>
      </button>

      {/* TikTok — copia URL + apre app */}
      <button
        onClick={copyForTikTok}
        title="Copia link per TikTok"
        className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-bg-dark transition-colors hover:border-white/20 hover:bg-white/5"
      >
        <svg className="h-4 w-4 text-text-primary" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.85a8.25 8.25 0 004.83 1.55V6.95a4.85 4.85 0 01-1.06-.26z" />
        </svg>
      </button>

      {/* Copy Link */}
      <button
        onClick={copyLink}
        title="Copia link"
        className="flex h-8 items-center gap-1.5 rounded-full border border-border bg-bg-dark px-3 text-xs text-text-secondary transition-colors hover:border-accent/40 hover:text-accent"
      >
        {copied ? (
          <>
            <svg className="h-3 w-3 text-badge-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-badge-green">Copiato!</span>
          </>
        ) : (
          <>
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copia link
          </>
        )}
      </button>
    </div>
  )
}
