'use client';

import { SUB_CATEGORIES } from '@/lib/products';

interface Props {
  category:      string;
  active:        string;
  onChange:      (sub: string) => void;
  activeCounts?: Record<string, number>;
}

export default function SubCategoryFilter({ category, active, onChange, activeCounts }: Props) {
  const subs = SUB_CATEGORIES[category];
  if (!subs || subs.length === 0) return null;

  const visibleSubs = activeCounts
    ? subs.filter(s => (activeCounts[s.id] ?? 0) > 0)
    : subs;

  if (visibleSubs.length === 0) return null;

  return (
    <div className="overflow-x-auto scrollbar-hide px-4 py-1.5 border-t border-zinc-800/60">
      <div className="flex items-center gap-2 min-w-max">
        <span className="font-mono text-[8px] tracking-widest text-th-subtle uppercase shrink-0 mr-1">
          sub
        </span>

        {visibleSubs.map((sub) => {
          const isActive = active === sub.id;
          return (
            <button
              key={sub.id}
              onClick={() => onChange(isActive ? '' : sub.id)}
              className={`flex-shrink-0 inline-flex items-center px-2.5 h-6 rounded-full font-mono text-[10px] font-medium tracking-wide transition-all duration-150 active:scale-95 ${
                isActive
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/60 shadow-[0_0_8px_rgba(6,182,212,0.25)]'
                  : 'bg-zinc-900 text-th-subtle border border-zinc-700/40 hover:border-zinc-600 hover:text-white'
              }`}
            >
              {sub.label}
            </button>
          );
        })}

        <button
          onClick={() => onChange('')}
          className={`flex-shrink-0 inline-flex items-center px-2.5 h-6 rounded-full font-mono text-[10px] font-medium tracking-wide transition-all duration-150 active:scale-95 ${
            active === ''
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/60 shadow-[0_0_8px_rgba(6,182,212,0.25)]'
              : 'bg-zinc-900 text-th-subtle border border-zinc-700/40 hover:border-zinc-600 hover:text-white'
          }`}
        >
          All
        </button>
      </div>
    </div>
  );
}
