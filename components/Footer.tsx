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

      {/* WhatsApp assistenza */}
      <div className="flex justify-center mb-6">
        <a
          href="https://wa.me/393756443391"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 font-mono text-[11px] tracking-widest text-green-500 hover:text-green-400 transition-colors uppercase"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Assistenza WhatsApp: +39 375 644 3391
        </a>
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
