'use client';

import Image from 'next/image';
import TickerBar from './TickerBar';
import LocaleSelector from './LocaleSelector';

/**
 * Header — Affiliate-First Mode (2026-04-14)
 * Carrello interno disabilitato. Nessun link a /checkout.
 */
export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex flex-col border-b border-zinc-800/80 bg-zinc-950/95 backdrop-blur-xl">
      {/* Ticker */}
      <TickerBar />

      {/* Main nav row */}
      <div className="h-16 flex items-center justify-between px-4">

        {/* Left — scan status chip + locale selector */}
        <div className="flex items-center gap-3 w-10">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />
            <span className="font-mono text-[8px] tracking-widest text-th-subtle uppercase hidden sm:block">
              SECURE
            </span>
          </div>
          <LocaleSelector />
        </div>

        {/* Logo centrato */}
        <div className="absolute left-1/2 -translate-x-1/2">
          <Image
            src="/icon.png"
            alt="Kitwer26"
            width={160}
            height={56}
            className="h-12 w-auto object-contain"
            priority
          />
        </div>

        {/* Placeholder a destra per mantenere il layout bilanciato */}
        <div className="w-10" />
      </div>
    </header>
  );
}
