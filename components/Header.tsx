'use client';

import Image from 'next/image';
import { ShoppingBag } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import TickerBar from './TickerBar';
import LocaleSelector from './LocaleSelector';

export default function Header() {
  const { totalItems, openCart } = useCart();

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
            <span className="font-mono text-[8px] tracking-widest text-zinc-600 uppercase hidden sm:block">
              SECURE
            </span>
          </div>
          <LocaleSelector />
        </div>

        {/* Logo centrato */}
        <div className="absolute left-1/2 -translate-x-1/2">
          <Image
            src="/LOGOKITWER.png"
            alt="Kitwer26"
            width={160}
            height={56}
            className="h-12 w-auto object-contain"
            priority
          />
        </div>

        {/* Cart */}
        <button
          onClick={openCart}
          className="relative w-10 h-10 flex items-center justify-center rounded-sm border border-zinc-700/60 hover:border-cyan-500/50 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition-all active:scale-95 min-h-[44px] min-w-[44px]"
          aria-label="Carrello"
        >
          <ShoppingBag size={18} />
          {totalItems > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-orange-500 text-black font-mono text-[9px] font-black rounded-sm flex items-center justify-center px-1 leading-none">
              {totalItems > 99 ? '99+' : totalItems}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
