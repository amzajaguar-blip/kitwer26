'use client';

import { useState, useEffect, useRef } from 'react';
import { CheckCircle2, Zap } from 'lucide-react';
import { useIntl } from '@/context/InternationalizationContext';

// ── Bundle data ───────────────────────────────────────────────────────────────
interface BundleProduct { name: string; price: number }
interface Bundle {
  id:          string;
  title:       string;
  subtitle:    string;
  badge:       string;
  badgeColor:  'orange' | 'amber' | 'cyan' | 'purple';
  description: string;
  products:    BundleProduct[];
  cta:         string;
  highlight:   string;
}

const BUNDLES: Bundle[] = [
  {
    id:          'cold-storage',
    title:       'COLD STORAGE FORTRESS',
    subtitle:    'TARGET: CRYPTO HOLDER',
    badge:       'DEFCON 1',
    badgeColor:  'orange',
    description: 'Il trifoglio della custodia cripto offline. Firma le transazioni in aria, archivia il seed in titanio e blocca i segnali RF. Nessuna minaccia digitale può raggiungerti.',
    products: [
      { name: 'Ledger Nano X',                      price: 149 },
      { name: 'Cryptotag Zeus Titanium',             price: 89  },
      { name: 'Mission Darkness Faraday Pouch',      price: 49  },
    ],
    cta:       'ACQUISTA BUNDLE',
    highlight: 'Protezione Totale 360° · Firma offline · Seed indistruttibile',
  },
  {
    id:          'blackout-immunity',
    title:       'BLACKOUT IMMUNITY',
    subtitle:    'TARGET: POWER & PREPPING',
    badge:       'DEFCON 1',
    badgeColor:  'orange',
    description: 'Energia garantita quando la rete cade. UPS enterprise per il desktop, carica solare per il mobile, torcia tattica per il blackout totale. Il tuo bunker non si spegne mai.',
    products: [
      { name: 'APC Back-UPS Pro 1500VA',             price: 199 },
      { name: 'Hiluckey Solar Charger 26800mAh',     price: 59  },
      { name: 'Olight Perun Mini',                   price: 49  },
    ],
    cta:       'ACQUISTA BUNDLE',
    highlight: 'Autonomia totale · Backup solare · Zero blackout',
  },
  {
    id:          'ghost-operator',
    title:       'GHOST OPERATOR',
    subtitle:    'TARGET: PRIVACY FIRST',
    badge:       'DEFCON 1',
    badgeColor:  'orange',
    description: 'Autenticazione fisica a due fattori, nessuna impronta digitale sul monitor, accesso biometrico ai dati. Operativo silenzioso, tracce zero.',
    products: [
      { name: 'Yubico YubiKey 5 NFC',               price: 55  },
      { name: 'Privacy Screen Filter 15.6"',         price: 35  },
      { name: 'Lexar JumpDrive Fingerprint 128GB',   price: 45  },
    ],
    cta:       'ACQUISTA BUNDLE',
    highlight: 'Zero tracce · 2FA hardware · Accesso biometrico',
  },
  {
    id:          'apex-command',
    title:       'APEX COMMAND CENTER',
    subtitle:    'PRO RACING SETUP',
    badge:       'DEFCON 0 — ELITE TIER',
    badgeColor:  'amber',
    description: 'Non limitarti a giocare, pilota. Setup professionale per feedback estremo e realismo totale. Plug-and-Play per i principali simulatori (iRacing, Assetto Corsa). La pista ti aspetta.',
    products: [
      { name: 'Next Level Racing F-GT Lite Cockpit', price: 389 },
      { name: 'Yaheetech Racing Seat Support',       price: 89  },
      { name: 'Thrustmaster TH8A Shifter Real-Feel', price: 179 },
    ],
    cta:       'ACQUISTA BUNDLE',
    highlight: 'Compatibile con la maggior parte dei volanti Direct Drive sul mercato',
  },
];

// ── Bundle Card ───────────────────────────────────────────────────────────────
function BundleCard({ bundle }: { bundle: Bundle }) {
  const { formatPrice } = useIntl();
  const validProducts = bundle.products.filter(p => p.price && p.price > 0);
  const total         = validProducts.reduce((s, p) => s + p.price, 0);
  const [count, setCount]           = useState(3);
  const [loading, setLoading]       = useState(false);
  const [flashing, setFlashing]     = useState(false);

  // Init random count 2-5 once
  useEffect(() => {
    setCount(Math.floor(Math.random() * 4) + 2);
  }, []);

  const handleHover = () => {
    if (count > 1) {
      setCount((prev) => prev - 1);
      setFlashing(true);
      setTimeout(() => setFlashing(false), 400);
    }
  };

  const handleClick = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  const isElite    = bundle.badgeColor === 'amber';
  const isLast     = count <= 1;

  const borderColor = isElite
    ? 'border-orange-500/50 hover:border-orange-400'
    : 'border-purple-500/40 hover:border-purple-400';

  const glowClass = isElite
    ? 'animate-pulse-glow-orange'
    : 'animate-pulse-glow';

  const badgeCls: Record<Bundle['badgeColor'], string> = {
    orange: 'bg-orange-500/10 border-orange-500/50 text-orange-400',
    amber:  'bg-amber-500/10  border-amber-500/50  text-amber-400',
    cyan:   'bg-cyan-500/10   border-cyan-500/50   text-cyan-400',
    purple: 'bg-purple-500/10 border-purple-500/50 text-purple-400',
  };

  return (
    <div
      className={`relative flex flex-col rounded-sm border ${borderColor} ${glowClass} ${flashing ? 'animate-urgency' : ''} bg-zinc-900 transition-colors duration-200`}
    >
      {/* Top badge */}
      <div className="flex items-start justify-between p-4 pb-2">
        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-sm border font-mono text-[10px] font-bold tracking-widest uppercase ${badgeCls[bundle.badgeColor]}`}>
          <Zap size={10} className="shrink-0" />
          {bundle.badge}
        </div>
        {/* Availability counter */}
        <div className={`font-mono text-[10px] tracking-wide ${isLast ? 'text-red-400 font-bold' : 'text-zinc-500'}`}>
          Bundle: <span className={isLast ? 'text-red-400' : 'text-zinc-400'}>{count}</span>/5
          {isLast && <span className="ml-1 text-red-400">⚠ ULTIMA UNITÀ</span>}
        </div>
      </div>

      <div className="flex-1 px-4 pb-4">
        {/* Title */}
        <h3 className="font-mono font-extrabold text-lg text-white leading-tight">{bundle.title}</h3>
        <p className="font-mono text-[10px] tracking-[0.25em] text-zinc-500 uppercase mt-0.5 mb-3">{bundle.subtitle}</p>

        {/* Description */}
        <p className="text-sm text-zinc-400 font-sans leading-relaxed mb-4">{bundle.description}</p>

        {/* Products */}
        <ul className="space-y-1.5 mb-4">
          {bundle.products.map((p) => (
            <li key={p.name} className="flex items-center gap-2.5">
              <CheckCircle2 size={14} className="shrink-0 text-cyan-500" />
              <span className="text-sm text-zinc-300 font-sans flex-1">{p.name}</span>
              <span className="font-mono text-xs text-zinc-500">{formatPrice(p.price)}</span>
            </li>
          ))}
        </ul>

        {/* Divider + total */}
        <div className="flex items-center justify-between py-2 border-t border-zinc-800 mb-4">
          <span className="font-mono text-xs text-zinc-500 uppercase tracking-widest">Valore totale</span>
          <span className="font-mono font-bold text-xl text-orange-400">
            {total > 0 ? `~${formatPrice(total)}` : 'Prezzo variabile'}
          </span>
        </div>

        {/* Highlight note */}
        <p className="text-[11px] text-zinc-500 font-sans mb-4 leading-snug">
          ✦ {bundle.highlight}
        </p>

        {/* CTA */}
        <button
          onMouseEnter={handleHover}
          onClick={handleClick}
          disabled={loading}
          className="w-full py-3.5 font-mono font-bold text-sm tracking-widest uppercase text-black bg-orange-500 hover:bg-orange-400 disabled:bg-orange-500/50 active:scale-95 transition-all rounded-sm shadow-[0_0_16px_rgba(249,115,22,0.35)] hover:shadow-[0_0_24px_rgba(249,115,22,0.55)]"
        >
          {loading ? '// CONFIGURAZIONE IN CORSO...' : `[ ${bundle.cta} ]`}
        </button>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function BundleSection() {
  return (
    <section id="bundles" className="px-4 py-16 sm:py-20">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-sm border border-purple-500/30 bg-purple-500/5">
          <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse" />
          <span className="font-mono text-[10px] tracking-[0.25em] text-purple-400 uppercase">
            KIT DI SOPRAVVIVENZA DIGITALE
          </span>
        </div>
        <h2 className="font-mono font-extrabold text-3xl sm:text-4xl text-white">
          BUNDLE <span className="text-orange-400">TATTICI</span>
        </h2>
        <p className="mt-2 text-sm text-zinc-500 font-sans">
          Setup pre-configurati testati dal team Kitwer26. Attiva il protocollo giusto per la tua missione.
        </p>
      </div>

      {/* Grid — 1col mobile, 2col tablet, 4col desktop */}
      {/* Mobile: horizontal carousel */}
      <div className="sm:hidden flex gap-4 overflow-x-auto scrollbar-hide pb-4">
        {BUNDLES.map((b) => (
          <div key={b.id} className="flex-shrink-0 w-[85vw]">
            <BundleCard bundle={b} />
          </div>
        ))}
      </div>

      {/* Desktop: grid */}
      <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-7xl mx-auto">
        {BUNDLES.map((b) => (
          <BundleCard key={b.id} bundle={b} />
        ))}
      </div>
    </section>
  );
}
