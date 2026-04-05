'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { ProductVariant } from '@/types/product';

interface Props {
  variants:        ProductVariant[];
  onChange?:       (selected: Record<string, string>) => void;
  /** Chiamato ogni volta che la selezione ha un'immagine associata */
  onImageChange?:  (url: string) => void;
}

export default function VariantSelector({ variants, onChange, onImageChange }: Props) {
  const [selected, setSelected] = useState<Record<string, string>>({});

  if (!variants || variants.length === 0) return null;

  const pick = (name: string, value: string, imageUrl?: string) => {
    const next = { ...selected, [name]: value };
    setSelected(next);
    onChange?.(next);
    if (imageUrl) onImageChange?.(imageUrl);
  };

  return (
    <div className="flex flex-col gap-3 my-3">
      {variants.map((v) => (
        <div key={v.name}>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--th-faint)' }}>
            {v.name}
            {selected[v.name] && (
              <span className="ml-2 normal-case font-normal text-[#00D4FF]">{selected[v.name]}</span>
            )}
          </p>

          <div className="flex flex-wrap gap-2">
            {v.values.map((val) => {
              const active   = selected[v.name] === val;
              const imgUrl   = v.images?.[val];

              return imgUrl ? (
                // Variante con immagine → thumbnail cliccabile
                <button
                  key={val}
                  type="button"
                  onClick={() => pick(v.name, val, imgUrl)}
                  title={val}
                  className={`w-10 h-10 rounded-lg overflow-hidden border-2 transition-all active:scale-95 flex-shrink-0 ${
                    active ? 'border-[#00D4FF] ring-1 ring-[#00D4FF]/50' : 'border-white/15 hover:border-white/35'
                  }`}
                >
                  <Image
                    src={imgUrl}
                    alt={val}
                    width={40}
                    height={40}
                    className="w-full h-full object-contain"
                    unoptimized
                  />
                </button>
              ) : (
                // Variante senza immagine → pill testo
                <button
                  key={val}
                  type="button"
                  onClick={() => pick(v.name, val)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all active:scale-95 ${
                    active
                      ? 'bg-[#00D4FF] text-black border-[#00D4FF]'
                      : 'border-white/20 text-white/70 hover:border-white/40'
                  }`}
                  style={active ? {} : { background: 'var(--th-input)' }}
                >
                  {val}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
