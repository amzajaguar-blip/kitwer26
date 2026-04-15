import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  // absolute: bypassa il template '%s | KITWER26' del layout root
  title: { absolute: 'Operative Profile — KITWER26' },
  description: 'Dossier Intelligence: il team dietro KITWER26. Sicurezza digitale, hardware crypto, setup tattici d\'élite.',
  alternates: { canonical: 'https://kitwer26.com/about' },
  openGraph: {
    title: 'Operative Profile — KITWER26',
    description: 'Dossier Intelligence: il team dietro KITWER26. Sicurezza digitale, hardware crypto, setup tattici d\'élite.',
    url: 'https://kitwer26.com/about',
    siteName: 'KITWER26',
    images: [{ url: '/icon.png', width: 512, height: 512, alt: 'KITWER26' }],
    type: 'website',
    locale: 'it_IT',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Operative Profile — KITWER26',
    description: 'Dossier Intelligence: il team dietro KITWER26.',
    images: ['/icon.png'],
  },
};

const REDACTED = '[████████]';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-zinc-950 blueprint-grid">
      {/* Corner borders */}
      <div className="pointer-events-none fixed inset-4 z-0">
        <span className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-orange-500/60" />
        <span className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-orange-500/60" />
        <span className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-orange-500/60" />
        <span className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-orange-500/60" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-5 py-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-mono text-xs text-th-subtle hover:text-cyan-400 transition-colors mb-8"
        >
          <ArrowLeft size={14} /> TORNA AL DATABASE
        </Link>

        {/* Title */}
        <div className="mb-8 border border-zinc-800 bg-zinc-900/60 rounded-sm p-6">
          <p className="font-mono text-[9px] tracking-[0.4em] text-orange-400/70 uppercase mb-2">
            FILE DECLASSIFICATO — CLEARANCE: LEVEL 5
          </p>
          <h1 className="font-mono font-extrabold text-2xl sm:text-3xl text-white">
            OPERATIVE PROFILE:{' '}
            <span className="text-cyan-400">KITWER26_FOUNDER</span>
          </h1>
          <p className="font-mono text-xs text-th-subtle mt-1 tracking-widest">
            STATUS: <span className="text-green-400">ACTIVE</span>  ·  LOCATION: <span className="text-th-subtle">ENCRYPTED</span>
          </p>
        </div>

        {/* Photo container */}
        <div className="relative mb-8 flex justify-center">
          {/* Radar circle — mobile only */}
          <div className="sm:hidden absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-44 h-44 rounded-full border-2 border-cyan-500/20 animate-radar" />
            <div className="absolute w-36 h-36 rounded-full border border-cyan-500/10" />
          </div>

          {/* Photo frame */}
          <div className="relative w-40 h-40 sm:w-52 sm:h-52 rounded-sm overflow-hidden border-2 border-cyan-500/40 shadow-[0_0_30px_rgba(6,182,212,0.2)]">
            {/* Placeholder dossier photo */}
            <div className="w-full h-full bg-zinc-900 crt-scanlines flex flex-col items-center justify-center">
              <div className="text-4xl mb-2 opacity-40 filter grayscale">👤</div>
              <p className="font-mono text-[10px] tracking-widest text-cyan-500/60 uppercase">IDENTITÀ</p>
              <p className="font-mono text-[10px] tracking-widest text-orange-500/60 uppercase">CRIPTATA</p>
            </div>
            {/* Scanline overlay */}
            <div className="pointer-events-none absolute inset-0 crt-scanlines opacity-20" />
          </div>

          {/* Side data — desktop */}
          <div className="hidden sm:flex flex-col justify-center ml-6 gap-2">
            {[
              { k: 'STATUS',    v: 'ACTIVE',   c: 'text-green-400' },
              { k: 'CLEARANCE', v: 'LEVEL 5',  c: 'text-orange-400' },
              { k: 'LOCATION',  v: 'ENCRYPTED',c: 'text-th-subtle' },
              { k: 'LOGS',      v: 'NONE',     c: 'text-cyan-400' },
            ].map(({ k, v, c }) => (
              <div key={k} className="flex items-center gap-2">
                <span className="font-mono text-[9px] tracking-widest text-th-subtle uppercase w-20">{k}:</span>
                <span className={`font-mono text-[11px] font-bold ${c}`}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Dossier sections */}
        <div className="space-y-6 text-sm font-sans">

          <section className="border border-zinc-800 rounded-sm">
            <div className="px-4 py-2 border-b border-zinc-800 bg-zinc-900/50">
              <p className="font-mono text-[10px] tracking-[0.25em] text-orange-400 uppercase font-bold">
                [ MISSION OBJECTIVE ]
              </p>
            </div>
            <div className="px-4 py-4 leading-relaxed text-th-subtle">
              <p>
                Kitwer26 nasce dalla convinzione che la sicurezza digitale non debba essere un privilegio
                di pochi. Selezioniamo, testiamo e curiamo un arsenale di strumenti tecnici per chi vuole
                proteggere la propria libertà finanziaria e digitale: dai{' '}
                <span className="text-cyan-400">hardware wallet</span> ai sistemi di continuità
                energetica, dai{' '}
                <span className="text-orange-400">setup da sim racing</span> agli strumenti EDC tattici.
              </p>
            </div>
          </section>

          <section className="border border-zinc-800 rounded-sm">
            <div className="px-4 py-2 border-b border-zinc-800 bg-zinc-900/50">
              <p className="font-mono text-[10px] tracking-[0.25em] text-cyan-400 uppercase font-bold">
                [ TECHNICAL EXPERTISE ]
              </p>
            </div>
            <div className="px-4 py-4 space-y-2 text-th-subtle">
              {[
                { skill: 'Hardware Wallet & Cold Storage',   lvl: '████████░░', pct: '80%' },
                { skill: 'FPV Drones & Racing Gear',           lvl: '███████░░░', pct: '70%' },
                { skill: 'Smart Home & IoT Security',        lvl: '██████░░░░', pct: '60%' },
                { skill: 'Sim Racing & Setup Premium',       lvl: '█████████░', pct: '90%' },
                { skill: 'Privacy Tools & 2FA Hardware',     lvl: '████████░░', pct: '80%' },
              ].map(({ skill, lvl, pct }) => (
                <div key={skill} className="flex items-center gap-3">
                  <span className="flex-1 font-sans text-xs text-th-subtle">{skill}</span>
                  <span className="font-mono text-[10px] text-cyan-500/70 tracking-widest">{lvl}</span>
                  <span className="font-mono text-[10px] text-th-subtle w-8">{pct}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="border border-zinc-800 rounded-sm">
            <div className="px-4 py-2 border-b border-zinc-800 bg-zinc-900/50">
              <p className="font-mono text-[10px] tracking-[0.25em] text-purple-400 uppercase font-bold">
                [ SECURITY PROTOCOLS ]
              </p>
            </div>
            <div className="px-4 py-4 text-th-subtle leading-relaxed space-y-3">
              <p>
                Ogni prodotto nel catalogo Kitwer26 viene selezionato secondo tre criteri:{' '}
                <span className="text-white font-semibold">affidabilità documentata</span>,{' '}
                <span className="text-white font-semibold">supply chain verificata</span> e{' '}
                <span className="text-white font-semibold">rapporto qualità/protezione ottimale</span>.
              </p>
              <p>
                I link di acquisto puntano esclusivamente ad Amazon IT tramite il programma
                affiliazione ufficiale. Nessun rivenditore terzo non verificato.{' '}
                <span className="text-th-subtle line-through">{REDACTED}</span>
                <span className="group cursor-pointer text-th-subtle hover:text-white transition-colors ml-2">
                  [informazioni operative riservate]
                </span>
              </p>
            </div>
          </section>
        </div>

        {/* Watermark */}
        <div className="mt-16 text-center">
          <p className="font-mono text-[10px] tracking-[0.5em] text-zinc-800 uppercase select-none">
            ENCRYPTED ENVIRONMENT // KITWER26 // NO LOGS RECORDED
          </p>
        </div>

        <div className="mt-6">
          <Link
            href="/legal"
            className="font-mono text-[10px] text-th-subtle hover:text-white transition-colors underline"
          >
            Legal & Affiliate Disclosure
          </Link>
        </div>
      </div>
    </div>
  );
}
