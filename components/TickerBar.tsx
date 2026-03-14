'use client';

import { useEffect, useState } from 'react';
import { useIntl } from '@/context/InternationalizationContext';

export default function TickerBar() {
  const { t } = useIntl();
  const [btcPrice, setBtcPrice] = useState<string>('...');

  useEffect(() => {
    async function fetchBtc() {
      try {
        const res = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
          { next: { revalidate: 60 } } as RequestInit,
        );
        if (!res.ok) return;
        const data = await res.json();
        const price: number = data?.bitcoin?.usd;
        if (price) {
          setBtcPrice(
            '$' + price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
          );
        }
      } catch {
        setBtcPrice('N/A');
      }
    }

    fetchBtc();
    const id = setInterval(fetchBtc, 60_000);
    return () => clearInterval(id);
  }, []);

  const items = [
    `${t('ticker.btcPrice')} ${btcPrice}`,
    t('ticker.securityStatus'),
    t('ticker.newDrop'),
    t('ticker.noLogs'),
    t('ticker.encryption'),
    t('ticker.coldStorage'),
    t('ticker.system'),
    t('ticker.threatLevel'),
  ];

  // Double the array so the seamless loop works
  const tickerText = [...items, ...items].join('   ///   ');

  return (
    <div
      className="h-7 flex items-center overflow-hidden border-b border-purple-500/20 bg-black/40 backdrop-blur-sm"
      aria-hidden="true"
    >
      <div className="flex gap-0 animate-ticker whitespace-nowrap">
        {/* Two copies for seamless loop */}
        <span className="font-mono text-[10px] tracking-widest text-purple-400/80 pr-8">
          {tickerText}
        </span>
        <span className="font-mono text-[10px] tracking-widest text-purple-400/80 pr-8">
          {tickerText}
        </span>
      </div>
    </div>
  );
}
