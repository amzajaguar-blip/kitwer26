'use client';

import { Package, Truck, ShieldCheck } from 'lucide-react';

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden px-4 pt-14 pb-16 sm:pt-20 sm:pb-24 bg-zinc-950">
      {/* Dot-grid pattern bg */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(6,182,212,0.5) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Cyan glow -- top center */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-72 w-[480px] blur-3xl opacity-20"
        style={{ background: 'radial-gradient(ellipse, #00D4FF 0%, transparent 70%)' }}
      />
      {/* Accent glow -- bottom right */}
      <div
        className="pointer-events-none absolute right-0 bottom-0 h-48 w-64 blur-3xl opacity-10"
        style={{ background: 'radial-gradient(ellipse, #a855f7 0%, transparent 70%)' }}
      />

      <div className="relative mx-auto max-w-2xl text-center">
        {/* Status chip */}
        <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-sm border border-cyan-500/30 bg-cyan-500/5">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="font-mono text-[10px] tracking-[0.25em] text-cyan-400 uppercase">
            catalogo attivo
          </span>
        </div>

        {/* Main title */}
        <h1 className="font-mono font-extrabold text-4xl sm:text-5xl md:text-6xl leading-[1.1] tracking-tight mb-4 text-white">
          Il Gear che Vuoi.{' '}
          <span className="block sm:inline" style={{ color: '#00D4FF' }}>
            Il Prezzo che Meriti.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-2 text-base sm:text-lg font-sans text-zinc-400 max-w-xl mx-auto leading-relaxed">
          4.790 prodotti tech selezionati &mdash; FPV, Crypto, 3D Printing, Smart Home.
        </p>

        {/* Stats row */}
        <div className="flex items-center justify-center gap-6 sm:gap-10 mt-8 mb-8">
          {[
            { icon: Package,     val: '4.790+',          label: 'PRODOTTI' },
            { icon: Truck,       val: 'Spedizione EU',   label: 'EUROPA' },
            { icon: ShieldCheck, val: 'Pagamento Sicuro', label: 'CERTIFICATO' },
          ].map(({ icon: Icon, val, label }) => (
            <div key={label} className="text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Icon size={14} className="text-cyan-400 shrink-0" />
                <p className="font-mono font-bold text-sm sm:text-base text-white whitespace-nowrap">
                  {val}
                </p>
              </div>
              <p className="font-mono text-[8px] tracking-widest text-zinc-500 uppercase">
                {label}
              </p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('products');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 font-mono font-bold text-sm tracking-widest uppercase text-black rounded-sm transition-all active:scale-95"
            style={{
              background: '#00D4FF',
              boxShadow: '0 0 24px rgba(0,212,255,0.35), 0 0 48px rgba(0,212,255,0.15)',
            }}
          >
            Esplora il Catalogo &rarr;
          </button>
        </div>
      </div>
    </section>
  );
}
