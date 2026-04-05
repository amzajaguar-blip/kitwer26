'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Shield,
  ExternalLink,
  AlertTriangle,
  ChevronRight,
  Package,
  Zap,
  Lock,
  Cpu,
  Radio,
  Camera,
} from 'lucide-react';
import type { ResolvedBundle } from '@/lib/bundles';
import { useIntl } from '@/context/InternationalizationContext';

// ── Color map per badgeColor ──────────────────────────────────────────────────

const COLOR = {
  orange: {
    pill:    'text-orange-400 border-orange-500/50 bg-orange-500/10',
    glow:    'shadow-[0_0_28px_rgba(249,115,22,0.25)]',
    border:  'border-orange-500/40',
    text:    'text-orange-400',
    bg:      'bg-orange-500/10',
    dot:     'bg-orange-400',
    priceText: 'text-orange-400',
  },
  amber: {
    pill:    'text-amber-400 border-amber-500/50 bg-amber-500/10',
    glow:    'shadow-[0_0_28px_rgba(245,158,11,0.25)]',
    border:  'border-amber-500/40',
    text:    'text-amber-400',
    bg:      'bg-amber-500/10',
    dot:     'bg-amber-400',
    priceText: 'text-amber-400',
  },
  cyan: {
    pill:    'text-cyan-400 border-cyan-500/50 bg-cyan-500/10',
    glow:    'shadow-[0_0_28px_rgba(6,182,212,0.25)]',
    border:  'border-cyan-500/40',
    text:    'text-cyan-400',
    bg:      'bg-cyan-500/10',
    dot:     'bg-cyan-400',
    priceText: 'text-cyan-400',
  },
  purple: {
    pill:    'text-purple-400 border-purple-500/50 bg-purple-500/10',
    glow:    'shadow-[0_0_28px_rgba(168,85,247,0.25)]',
    border:  'border-purple-500/40',
    text:    'text-purple-400',
    bg:      'bg-purple-500/10',
    dot:     'bg-purple-400',
    priceText: 'text-purple-400',
  },
} as const;

// ── Icona per slot label ──────────────────────────────────────────────────────

function SlotIcon({ label }: { label: string }) {
  const l = label.toLowerCase();
  if (l.includes('wallet') || l.includes('seed') || l.includes('storage')) return <Lock size={11} />;
  if (l.includes('gpu') || l.includes('cpu'))    return <Cpu  size={11} />;
  if (l.includes('ram') || l.includes('ddr'))    return <Zap  size={11} />;
  if (l.includes('security') || l.includes('key') || l.includes('faraday') || l.includes('rfid'))
    return <Shield size={11} />;
  if (l.includes('camera') || l.includes('telecam')) return <Camera size={11} />;
  if (l.includes('comm') || l.includes('comms'))     return <Radio  size={11} />;
  return <Package size={11} />;
}

// ── Animazioni ───────────────────────────────────────────────────────────────

const fadeUp = (delay = 0) => ({
  initial:    { opacity: 0, y: 20 },
  animate:    { opacity: 1, y: 0 },
  transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as [number, number, number, number], delay },
});

// ── Componente principale ─────────────────────────────────────────────────────

export default function BundlePageClient({ bundle }: { bundle: ResolvedBundle }) {
  const c = COLOR[bundle.badgeColor];
  const { convertPrice } = useIntl();

  return (
    <div className="relative bg-zinc-950 blueprint-grid min-h-screen">

      {/* Corner frame — tactical aesthetic */}
      <div className="pointer-events-none fixed inset-4 z-0">
        <span className="absolute top-0 left-0  w-8 h-8 border-t-2 border-l-2 border-orange-500/30" />
        <span className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-orange-500/30" />
        <span className="absolute bottom-0 left-0  w-8 h-8 border-b-2 border-l-2 border-orange-500/30" />
        <span className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-orange-500/30" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-10">

        {/* ── Breadcrumb ─────────────────────────────────────────────────── */}
        <nav aria-label="breadcrumb" className="flex items-center gap-1.5 font-mono text-[9px] tracking-[0.3em] text-th-subtle uppercase mb-6 select-none">
          <Link href="/"          className="hover:text-cyan-400 transition-colors">HOME</Link>
          <ChevronRight size={9} className="shrink-0" />
          <Link href="/#bundles"  className="hover:text-cyan-400 transition-colors">BUNDLES</Link>
          <ChevronRight size={9} className="shrink-0" />
          <span className="text-th-subtle truncate max-w-[180px]">{bundle.id.toUpperCase()}</span>
        </nav>

        {/* Back button */}
        <Link
          href="/#bundles"
          className="inline-flex items-center gap-2 font-mono text-[11px] tracking-widest text-th-subtle hover:text-cyan-400 transition-colors mb-8"
        >
          <ArrowLeft size={13} />
          TORNA AI BUNDLE STRATEGICI
        </Link>

        {/* ── HERO HEADER ──────────────────────────────────────────────────── */}
        <motion.header {...fadeUp(0)} className="mb-10">

          {/* Badge pill */}
          <span className={`inline-flex items-center gap-2 font-mono text-[9px] tracking-[0.35em] uppercase border px-3 py-1 mb-5 ${c.pill}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${c.dot} animate-pulse`} />
            {bundle.badge}
          </span>

          {/* Title */}
          <h1 className="font-mono font-extrabold text-3xl sm:text-5xl text-white leading-tight tracking-tight mb-3">
            {bundle.title}
          </h1>

          {/* Subtitle */}
          <p className="font-mono text-xs tracking-[0.35em] text-th-subtle uppercase mb-5">
            {bundle.subtitle}
          </p>

          {/* Description */}
          <p className="text-th-subtle text-base leading-relaxed max-w-2xl mb-5">
            {bundle.description}
          </p>

          {/* Highlight pill */}
          <div className={`inline-flex items-center gap-2 border px-4 py-2 ${c.border} ${c.bg}`}>
            <Shield size={12} className={c.text} />
            <span className={`font-mono text-[10px] tracking-widest uppercase ${c.text}`}>
              {bundle.highlight}
            </span>
          </div>
        </motion.header>

        {/* ── SEPARATORE ───────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-8">
          <div className="h-px flex-1 bg-zinc-800" />
          <span className="font-mono text-[8px] tracking-[0.5em] text-th-subtle uppercase select-none">
            COMPONENTI DEL BUNDLE
          </span>
          <div className="h-px flex-1 bg-zinc-800" />
        </div>

        {/* ── PRODUCT SLOTS GRID ───────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {bundle.products.map((product, i) => (
            <motion.article
              key={product.id}
              {...fadeUp(i * 0.1 + 0.15)}
              className="border border-zinc-800 bg-zinc-900/60 flex flex-col hover:border-zinc-700 transition-colors"
            >
              {/* Slot header */}
              <div className={`flex items-center gap-2 px-4 py-2 border-b border-zinc-800 ${c.bg}`}>
                <span className={c.text}><SlotIcon label={bundle.slotLabels[i]} /></span>
                <span className="font-mono text-[8px] tracking-[0.3em] text-th-subtle uppercase">
                  SLOT {String(i + 1).padStart(2, '0')} — {bundle.slotLabels[i]}
                </span>
              </div>

              {/* Product image */}
              <div className="w-full aspect-square bg-zinc-950 flex items-center justify-center overflow-hidden border-b border-zinc-800/40">
                {product.image_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-contain p-4"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 opacity-20">
                    <Package size={32} className="text-th-subtle" />
                    <span className="font-mono text-[8px] text-th-subtle tracking-widest">NO IMAGE</span>
                  </div>
                )}
              </div>

              {/* Product info */}
              <div className="flex flex-col gap-3 p-4 flex-1">
                <p className="font-sans text-sm text-white leading-snug line-clamp-3">
                  {product.name}
                </p>

                {/* Price */}
                <div className="mt-auto pt-3 border-t border-zinc-800/60 flex items-baseline gap-2">
                  <span className={`font-mono text-lg font-extrabold ${c.priceText}`}>
                    {convertPrice(product.price)}
                  </span>
                  <span className="font-mono text-[9px] text-th-subtle uppercase tracking-widest">
                    / unità
                  </span>
                </div>

                {/* CTA Amazon */}
                {product.product_url ? (
                  <a
                    href={product.product_url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="flex items-center justify-center gap-2 py-2.5 border border-zinc-700 hover:border-cyan-500/60 hover:text-cyan-400 text-th-subtle transition-colors font-mono text-[10px] tracking-widest uppercase"
                  >
                    <ExternalLink size={11} />
                    ACQUISTA SU AMAZON
                  </a>
                ) : (
                  <div className="py-2.5 border border-zinc-800 text-th-subtle text-center font-mono text-[10px] tracking-widest uppercase">
                    LINK NON DISPONIBILE
                  </div>
                )}
              </div>
            </motion.article>
          ))}
        </div>

        {/* ── PRICING SUMMARY PANEL ────────────────────────────────────────── */}
        <motion.section
          {...fadeUp(0.45)}
          aria-label="Riepilogo prezzi bundle"
          className={`border ${c.border} ${c.bg} ${c.glow} p-6 mb-6`}
        >
          <p className="font-mono text-[8px] tracking-[0.45em] text-th-subtle uppercase mb-4">
            — RIEPILOGO PREZZI BUNDLE —
          </p>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">

            {/* Pricing */}
            <div>
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="font-mono text-4xl font-extrabold text-white">
                  {convertPrice(bundle.bundlePrice)}
                </span>
                <span className="font-mono text-lg text-th-subtle line-through">
                  {convertPrice(bundle.barratoPrice)}
                </span>
                <span className={`font-mono text-xs font-bold px-2 py-1 border ${c.text} ${c.bg} ${c.border}`}>
                  RISPARMIO {bundle.discountPct}%
                </span>
              </div>
              <p className="font-mono text-[10px] text-th-subtle mt-2 tracking-widest">
                VALORE TOTALE COMPONENTI: {convertPrice(bundle.totalValue)}
              </p>
            </div>

            {/* Scarcity alert */}
            <div className="flex items-start gap-3 border border-red-500/30 bg-red-500/5 px-5 py-4 shrink-0">
              <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-mono text-[8px] tracking-[0.35em] text-red-400/80 uppercase mb-1">
                  DISPONIBILITÀ CRITICA
                </p>
                <p className="font-mono text-2xl font-extrabold text-red-300 leading-none">
                  {bundle.scarcityUnits}
                </p>
                <p className="font-mono text-[8px] text-red-400/60 uppercase tracking-widest mt-0.5">
                  {bundle.scarcityUnits === 1 ? 'UNITÀ RIMASTA' : 'UNITÀ RIMASTE'}
                </p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* ── NOTE OPERATIVE (AFFILIATE DISCLOSURE + SEO TEXT) ─────────────── */}
        <motion.section {...fadeUp(0.55)} className="border border-zinc-800/50 bg-zinc-900/30 p-6 mb-8">
          <p className="font-mono text-[8px] tracking-[0.45em] text-th-subtle uppercase mb-4">
            [ INTELLIGENCE BRIEFING ]
          </p>
          <div className="space-y-3 text-th-subtle text-sm leading-relaxed">
            <p>
              Il bundle <strong className="text-white">{bundle.title}</strong> è stato progettato
              da KITWER26 come soluzione integrata per{' '}
              <strong className="text-white">
                {bundle.subtitle.replace('TARGET: ', '').toLowerCase()}
              </strong>
              . Ogni componente è selezionato secondo criteri di affidabilità documentata,
              supply chain verificata e rapporto qualità/protezione ottimale.
            </p>
            <p>
              I link di acquisto puntano direttamente ad{' '}
              <strong className="text-white">Amazon IT</strong> tramite il programma
              di affiliazione ufficiale. Ogni prodotto è acquistabile singolarmente —
              il bundle rappresenta la combinazione ottimale curata dai nostri analisti
              per massimizzare la protezione a parità di budget.
            </p>
            <p className="text-th-subtle text-xs font-mono tracking-wider">
              KITWER26 riceve una commissione sugli acquisti effettuati tramite i link presenti
              in questa pagina, senza costi aggiuntivi per l&apos;acquirente.{' '}
              <Link href="/legal" className="underline hover:text-th-subtle transition-colors">
                Legal &amp; Affiliate Disclosure
              </Link>
            </p>
          </div>
        </motion.section>

        {/* ── FOOTER NAVIGATION ────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-6 border-t border-zinc-800">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-mono text-xs text-th-subtle hover:text-cyan-400 transition-colors"
          >
            <ArrowLeft size={12} />
            TORNA AL DATABASE PRINCIPALE
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/#bundles"
              className="font-mono text-[10px] text-th-subtle hover:text-white transition-colors tracking-widest uppercase"
            >
              TUTTI I BUNDLE
            </Link>
            <span className="text-zinc-800">·</span>
            <Link
              href="/about"
              className="font-mono text-[10px] text-th-subtle hover:text-white transition-colors tracking-widest uppercase"
            >
              CHI SIAMO
            </Link>
            <span className="text-zinc-800">·</span>
            <Link
              href="/legal"
              className="font-mono text-[10px] text-th-subtle hover:text-white transition-colors tracking-widest uppercase underline"
            >
              LEGAL
            </Link>
          </div>
        </div>

        {/* Watermark */}
        <p className="mt-12 text-center font-mono text-[8px] tracking-[0.6em] text-zinc-900 uppercase select-none">
          KITWER26 // BUNDLE TATTICO // ENCRYPTED ENVIRONMENT
        </p>

      </div>
    </div>
  );
}
