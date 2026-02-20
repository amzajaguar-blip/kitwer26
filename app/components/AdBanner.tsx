'use client'

import { useEffect, useRef } from 'react'
import { ADSENSE_CLIENT_ID, AD_SLOTS, isAdsenseEnabled } from '@/lib/adsense-config'

type AdSlot = keyof typeof AD_SLOTS

interface AdBannerProps {
  slot: AdSlot
  format?: 'horizontal' | 'rectangle' | 'leaderboard'
  className?: string
}

export default function AdBanner({ slot, format = 'horizontal', className = '' }: AdBannerProps) {
  const adRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isAdsenseEnabled() && adRef.current) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({})
      } catch {
        // AdSense non ancora caricato
      }
    }
  }, [])

  const heightClass = {
    horizontal: 'h-[90px] md:h-[90px]',
    rectangle: 'h-[250px] md:h-[250px]',
    leaderboard: 'h-[50px] md:h-[90px]',
  }[format]

  // Dev mode: placeholder elegante
  if (!isAdsenseEnabled()) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg border border-dashed border-border bg-bg-card/50 ${heightClass} ${className}`}
      >
        <span className="text-xs text-text-secondary/40 select-none">
          Spazio Pubblicitario
        </span>
      </div>
    )
  }

  // Production: AdSense reale
  return (
    <div ref={adRef} className={`overflow-hidden ${className}`}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={ADSENSE_CLIENT_ID}
        data-ad-slot={AD_SLOTS[slot]}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  )
}
