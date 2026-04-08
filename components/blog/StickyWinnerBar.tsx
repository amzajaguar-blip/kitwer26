'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, ExternalLink, Trophy } from 'lucide-react';
import { formatEur } from '@/lib/utils/price';
import type { BlogProductData } from '@/lib/blog/db';

interface StickyWinnerBarProps {
  product:     BlogProductData;
  winnerLabel: string;
}

export default function StickyWinnerBar({ product, winnerLabel }: StickyWinnerBarProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setVisible(window.scrollY > 500);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const buyUrl = product.affiliate_url ?? '#';
  const price  = formatEur(product.price);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-0 left-0 right-0 z-50 border-t border-orange-500/40 bg-zinc-950/95 backdrop-blur-md md:hidden"
        >
          <div className="flex items-center gap-3 px-4 py-3">
            {/* Trophy + label */}
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-center gap-1.5 font-mono text-xs text-orange-400 uppercase tracking-widest">
                <Trophy className="h-3 w-3 shrink-0" />
                <span className="truncate">Vincitore: {winnerLabel}</span>
              </div>
              {price && (
                <span className="font-mono text-lg font-extrabold text-white">{price}</span>
              )}
            </div>

            {/* Buy button */}
            {buyUrl !== '#' && (
              <a
                href={buyUrl}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="inline-flex shrink-0 items-center gap-2 rounded-none border border-orange-500 bg-orange-500 px-4 py-2.5 font-mono text-sm font-extrabold uppercase tracking-widest text-zinc-950 transition-opacity active:opacity-80"
              >
                <Zap className="h-4 w-4" />
                Acquista
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
