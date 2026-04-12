'use client';

import { ShieldCheck, Truck, BadgeCheck, Headphones } from 'lucide-react';

const SIGNALS = [
  { icon: ShieldCheck, label: 'Pagamento sicuro',     sub: 'Carte & bonifico' },
  { icon: Truck,       label: 'Spedizione EU',        sub: 'In tutta Europa' },
  { icon: BadgeCheck,  label: 'Prodotti verificati',   sub: 'Fonti certificate' },
  { icon: Headphones,  label: 'Supporto rapido',       sub: 'WhatsApp attivo' },
] as const;

export default function TrustBar() {
  return (
    <section className="border-y border-zinc-800/60 bg-zinc-900/30">
      <div className="mx-auto max-w-6xl px-4 py-4">
        {/* Mobile: horizontal scroll */}
        <div className="flex md:hidden gap-6 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
          {SIGNALS.map(({ icon: Icon, label, sub }) => (
            <div key={label} className="flex items-center gap-2.5 shrink-0">
              <div className="flex items-center justify-center w-8 h-8 rounded-sm bg-cyan-500/10 border border-cyan-500/20">
                <Icon size={15} className="text-cyan-400" />
              </div>
              <div>
                <p className="font-mono text-[11px] font-bold text-zinc-200 whitespace-nowrap">{label}</p>
                <p className="font-mono text-[9px] text-zinc-500 whitespace-nowrap">{sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop: flex row */}
        <div className="hidden md:flex items-center justify-between">
          {SIGNALS.map(({ icon: Icon, label, sub }) => (
            <div key={label} className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-9 h-9 rounded-sm bg-cyan-500/10 border border-cyan-500/20">
                <Icon size={16} className="text-cyan-400" />
              </div>
              <div>
                <p className="font-mono text-xs font-bold text-zinc-200">{label}</p>
                <p className="font-mono text-[10px] text-zinc-500">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
