'use client';

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden px-4 pt-16 pb-20 sm:pt-24 sm:pb-28">
      {/* Blueprint grid bg */}
      <div className="pointer-events-none absolute inset-0 blueprint-grid opacity-60" />

      {/* Cyan glow — top center */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-72 w-[480px] blur-3xl opacity-20"
        style={{ background: 'radial-gradient(ellipse, #06b6d4 0%, transparent 70%)' }}
      />
      {/* Orange glow — bottom right */}
      <div
        className="pointer-events-none absolute right-0 bottom-0 h-48 w-64 blur-3xl opacity-15"
        style={{ background: 'radial-gradient(ellipse, #f97316 0%, transparent 70%)' }}
      />

      <div className="relative mx-auto max-w-2xl text-center">
        {/* Status chip */}
        <div className="inline-flex items-center gap-2 mb-8 px-3 py-1.5 rounded-sm border border-cyan-500/30 bg-cyan-500/5">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="font-mono text-[10px] tracking-[0.25em] text-cyan-400 uppercase">
            Secure Connection Established
          </span>
        </div>

        {/* Main title */}
        <h1 className="font-mono font-extrabold text-5xl sm:text-6xl md:text-7xl leading-none tracking-tight mb-4" style={{ color: '#ff9a3e' }}>
          KITWER26
        </h1>

        {/* Subtitle */}
        <p className="mt-3 text-base sm:text-lg font-sans font-medium text-th-subtle tracking-wide">
          Premium Hardware &amp; Simulation Gear
        </p>

        {/* Stats row */}
        <div className="flex items-center justify-center gap-8 mt-8 mb-10">
          {[
            { val: '600+',   label: 'ASSET TATTICI' },
            { val: 'BUNDLE', label: 'CONFIGURAZIONI ELITE' },
            { val: '24H',    label: 'SUPPORTO ATTIVO' },
          ].map(({ val, label }) => (
            <div key={label} className="text-center">
              <p className="font-mono font-bold text-2xl text-orange-400">{val}</p>
              <p className="font-mono text-[9px] tracking-widest text-th-subtle uppercase mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* CTAs — usa scrollIntoView per non inquinare l'URL con hash (#products)
             che causerebbe auto-scroll al reload successivo */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-10 py-4 font-mono font-bold text-sm tracking-widest uppercase text-black bg-orange-500 hover:bg-orange-400 active:scale-95 transition-all rounded-sm shadow-[0_0_24px_rgba(249,115,22,0.45)] hover:shadow-[0_0_36px_rgba(249,115,22,0.65)]"
          >
            [ SHOP NOW ]
          </button>
          <button
            type="button"
            onClick={() => document.getElementById('bundles')?.scrollIntoView({ behavior: 'smooth' })}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-10 py-4 font-mono font-bold text-sm tracking-widest uppercase text-cyan-400 border border-cyan-500/40 hover:bg-cyan-500/10 hover:border-cyan-400 active:scale-95 transition-all rounded-sm"
          >
            [ VEDI I BUNDLE ]
          </button>
        </div>
      </div>
    </section>
  );
}
