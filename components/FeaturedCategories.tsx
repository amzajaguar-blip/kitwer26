'use client';

import Link from 'next/link';
import { Radio, Shield, Zap, Lock, ArrowRight } from 'lucide-react';

const CATEGORIES = [
  {
    name: 'Crypto Wallets',
    description: 'Hardware wallet e sicurezza digitale',
    icon: Shield,
    href: '/?cat=Crypto+Wallets',
    accent: '#00FF94',
    accentBorder: 'border-emerald-500/30',
    accentBg: 'bg-emerald-500/10',
    accentText: 'text-emerald-400',
  },
  {
    name: 'FPV Drones',
    description: 'Kit completi, ricambi e accessori',
    icon: Radio,
    href: '/?cat=FPV+Drones',
    accent: '#00D4FF',
    accentBorder: 'border-cyan-500/30',
    accentBg: 'bg-cyan-500/10',
    accentText: 'text-cyan-400',
  },
  {
    name: 'Sim Racing',
    description: 'Volanti, pedali e cockpit',
    icon: Zap,
    href: '/?cat=Sim+Racing',
    accent: '#F59E0B',
    accentBorder: 'border-amber-500/30',
    accentBg: 'bg-amber-500/10',
    accentText: 'text-amber-400',
  },
  {
    name: 'Cyber Security',
    description: 'Chiavi hardware, router VPN e privacy tools',
    icon: Lock,
    href: '/?cat=Cyber+Security',
    accent: '#EF4444',
    accentBorder: 'border-red-500/30',
    accentBg: 'bg-red-500/10',
    accentText: 'text-red-400',
  },
] as const;

export default function FeaturedCategories() {
  return (
    <section className="px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-6xl">
        {/* Section header */}
        <div className="mb-6">
          <p className="font-mono text-[10px] tracking-[0.25em] text-zinc-500 uppercase mb-1">
            Categorie principali
          </p>
          <h2 className="font-mono text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            Trova quello che cerchi
          </h2>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {CATEGORIES.map(({ name, description, icon: Icon, href, accentBorder, accentBg, accentText }) => (
            <Link
              key={name}
              href={href}
              className={`group relative flex flex-col gap-3 p-4 rounded-sm border ${accentBorder} bg-zinc-900/60 hover:bg-zinc-900 transition-all duration-200 min-h-[120px]`}
            >
              {/* Icon */}
              <div className={`flex items-center justify-center w-10 h-10 rounded-sm ${accentBg}`}>
                <Icon size={18} className={accentText} />
              </div>

              {/* Text */}
              <div className="flex-1">
                <h3 className="font-mono text-sm font-bold text-zinc-100 group-hover:text-white transition-colors">
                  {name}
                </h3>
                <p className="font-mono text-[10px] text-zinc-500 mt-0.5 leading-relaxed hidden sm:block">
                  {description}
                </p>
              </div>

              {/* Bottom row */}
              <div className="flex items-center justify-between mt-auto">
                <span className={`font-mono text-[10px] font-bold ${accentText}`}>
                  Selezionati
                </span>
                <ArrowRight
                  size={14}
                  className="text-zinc-600 group-hover:text-zinc-300 transition-all group-hover:translate-x-0.5"
                />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
