'use client';

import Link from 'next/link';
import Image from 'next/image';
import CurrencyToggle from '@/components/CurrencyToggle';

export default function Footer() {
  return (
    <footer className="w-full mt-16 sm:mt-24 border-t border-zinc-800 py-10 px-6 bg-zinc-950">
      {/* Logo + tagline */}
      <div className="flex flex-col items-center mb-6">
        <Image
          src="/icon.png"
          alt="Kitwer26"
          width={140}
          height={48}
          className="h-10 w-auto object-contain mb-2 opacity-70"
        />
        <p className="font-mono text-[10px] tracking-[0.3em] text-th-subtle uppercase">
          SECURE TECH DATABASE
        </p>
      </div>

      {/* Nav links */}
      <nav className="flex flex-wrap justify-center gap-x-4 gap-y-2 mb-6">
        {[
          { label: 'About',              href: '/about' },
          { label: 'Legal & Disclosure', href: '/legal' },
          { label: 'Privacy Policy',     href: '/privacy-policy' },
          { label: 'Cookie Policy',      href: '/cookie-policy' },
          { label: 'Termini',            href: '/termini-condizioni' },
          { label: 'Spedizioni',         href: '/spedizioni' },
          { label: 'Politica di Reso',   href: '/reso' },
        ].map(({ label, href }) => (
          <Link
            key={href}
            href={href}
            className="font-mono text-[10px] tracking-widest text-th-subtle hover:text-cyan-400 transition-colors uppercase"
          >
            {label}
          </Link>
        ))}
      </nav>

      {/* Currency Toggle */}
      <div className="flex justify-center mb-6">
        <CurrencyToggle />
      </div>


      {/* Divider */}
      <div className="border-t border-zinc-800 pt-5">
        <p className="font-mono text-[10px] text-center text-th-subtle tracking-widest uppercase mb-2">
          © {new Date().getFullYear()} Kitwer26 · Tutti i diritti riservati
        </p>
        <p className="font-mono text-[9px] text-center max-w-xl mx-auto leading-relaxed text-th-subtle">
          Alcune selezioni presenti su questo sito possono generare una commissione.
          I prezzi sono indicativi e soggetti a variazione.
        </p>

        <p className="font-mono text-[9px] text-center text-zinc-800 mt-3 tracking-[0.4em] uppercase select-none">
          ENCRYPTED ENVIRONMENT // KITWER26 // NO LOGS RECORDED
        </p>
      </div>
    </footer>
  );
}
