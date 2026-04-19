'use client';

import Image from 'next/image';
import { Category } from '@/lib/products';
import { useIntl } from '@/context/InternationalizationContext';

// ── Icon paths (public/svg_kitwer) ──────────────────────────────────────────
const ICONS = {
  cryptoWallets:    '/svg_kitwer/freepik__svg-crypto-wallets__62566.png',
  security:         '/svg_kitwer/cybersecurity-protection-icon.png',
  smartSecurity:    '/svg_kitwer/freepik__svg-lucchetto-doro-detailed-gold-padlock-with-engr__17793-removebg-preview.png',
  survivalEdc:      '/svg_kitwer/freepik__svg-survival-edc__62565-removebg-preview.png',
  tacticalPower:    '/svg_kitwer/freepik__svg-tactila-power-icon-crisp-vector-lines-monochro__62564.png',
  simRacing:        '/svg_kitwer/freepik__svg-sim-racing-wheel-icon-clean-vector-strokes-sim__62562.png',
  pcHardware:       '/svg_kitwer/freepik__svg-icon-set-of-pc-hardware-components-motherboard__62563-removebg-preview.png',
  box:              '/svg_kitwer/freepik__scatola-pacco-svg-flat-cardboard-box-icon-with-fol__5786-removebg-preview.png',
  smartHome:        '/svg_kitwer/freepik__svg-smart-security-emblem-shield-fused-with-digita__35743.png',
  printing3d:       '/svg_kitwer/freepik_isometric-3d-printer-with-glowing-laser-nozzle-printing-complex-neon-wireframe-cyber-grid-neon-cyan-and-electric-orange-accents_0001-removebg-preview.png',
  tacticalDrones:   '/svg_kitwer/drone-fpv-tactical-removebg.png',
} as const;

interface CategoryGroup {
  groupLabel: string;
  groupTag:   string;
  items: { id: Category; label: string; icon: string }[];
}

interface Props {
  active:   Category;
  onChange: (c: Category) => void;
}

function CategoryIcon({ src, isActive }: { src: string; isActive: boolean }) {
  return (
    <Image
      src={src}
      alt=""
      aria-hidden="true"
      width={16}
      height={16}
      className={`w-4 h-4 object-contain flex-shrink-0 transition-all ${
        isActive ? 'brightness-0' : 'invert opacity-50'
      }`}
    />
  );
}

function Chip({
  id, label, icon, active, onChange,
}: { id: Category; label: string; icon: string; active: Category; onChange: (c: Category) => void }) {
  const isActive = active === id;
  return (
    <button
      onClick={() => onChange(id)}
      className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 h-8 rounded-sm font-mono text-[11px] font-medium tracking-wide transition-all duration-150 active:scale-95 min-h-[44px] ${
        isActive
          ? 'bg-cyan-500 text-black font-bold shadow-[0_0_12px_rgba(6,182,212,0.5)]'
          : 'bg-zinc-900 text-zinc-400 border border-zinc-700/60 hover:border-cyan-500/50 hover:text-zinc-200'
      }`}
    >
      <CategoryIcon src={icon} isActive={isActive} />
      <span>{label}</span>
    </button>
  );
}

function CategoryFilterContent({ active, onChange }: Props) {
  const { t } = useIntl();

  const CATEGORY_GROUPS: CategoryGroup[] = [
    {
      groupLabel: 'Security',
      groupTag:   'Security',
      items: [
        { id: 'Crypto Wallets', label: 'Crypto Wallets', icon: ICONS.cryptoWallets },
        { id: 'Cyber Security', label: 'Cyber Security', icon: ICONS.security },
      ],
    },
    {
      groupLabel: 'Tactical',
      groupTag:   'FPV & Racing',
      items: [
        { id: 'FPV Drones', label: 'FPV Drones', icon: ICONS.tacticalDrones },
        { id: 'Sim Racing', label: 'Sim Racing', icon: ICONS.simRacing },
      ],
    },
  ];

  return (
    <div className="overflow-x-auto scrollbar-hide px-4 py-2">
      <div className="flex items-center gap-2 min-w-max">



        {/* Groups */}
        {CATEGORY_GROUPS.map((group, gi) => (
          <div key={group.groupLabel} className="flex items-center gap-2">
            <div className="flex flex-col items-start shrink-0">
              <span className="font-mono text-[8px] font-bold tracking-widest text-zinc-600 uppercase leading-none">
                {group.groupLabel}
              </span>
              <span className="font-mono text-[7px] text-zinc-700 leading-none mt-0.5">
                {group.groupTag}
              </span>
            </div>

            {group.items.map((item) => (
              <Chip key={item.id} {...item} active={active} onChange={onChange} />
            ))}

            {gi < CATEGORY_GROUPS.length - 1 && (
              <div className="w-px h-5 bg-zinc-800 shrink-0" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CategoryFilter(props: Props) {
  return (
    <div className="relative">
      {/* Gradiente sinistro */}
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 z-10 bg-gradient-to-r from-zinc-950 to-transparent" />
      {/* Gradiente destro */}
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 z-10 bg-gradient-to-l from-zinc-950 to-transparent" />
      <CategoryFilterContent {...props} />
    </div>
  );
}
