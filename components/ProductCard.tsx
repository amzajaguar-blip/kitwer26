'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Zap, CreditCard, ShoppingCart } from 'lucide-react';
import { Product } from '@/types/product';
import { useIntl } from '@/context/InternationalizationContext';
import { useCart } from '@/context/CartContext';
import { useState, useMemo } from 'react';
import ProductRating from './ProductRating';

interface Props {
  product: Product;
  onOpenDrawer: (product: Product) => void;
}

function getRawPrice(p: Product): number {
  const v = parseFloat(String(p.price ?? ''));
  return isNaN(v) || v <= 0 ? NaN : v;
}

function getBadge(category?: string): { text: string; type: 'defcon' | 'verified' } {
  if (!category) return { text: 'VERIFICATO', type: 'verified' };
  const c = category.toLowerCase();
  if (c.includes('crypto') || c.includes('comms') || c.includes('sicurezza')) {
    return { text: 'DEFCON 1', type: 'defcon' };
  }
  return { text: 'VERIFICATO', type: 'verified' };
}

export default function ProductCard({ product, onOpenDrawer }: Props) {
  const { locale, convertPrice, getExchangeRate, t } = useIntl();
  const { addItem, openCart } = useCart();
  const router = useRouter();

  // price nel DB è già finale (markup + flat fee applicati in import)
  // convertPrice fa solo conversione valuta, senza re-applicare il markup
  const raw               = getRawPrice(product);
  const finalPriceNum     = isNaN(raw) ? null : Math.round(raw * getExchangeRate() * 100) / 100;
  const finalPriceDisplay = isNaN(raw) ? null : convertPrice(raw);
  const badge             = getBadge(product.category);
  // No-zero guard: nascondi i bottoni acquisto se il prezzo calcolato è ≤ 0
  const showPurchaseButtons = finalPriceNum !== null && finalPriceNum > 0;

  const handleAddToCart = () => {
    addItem(product);
    openCart();
  };

  // Cascata di candidati: tutti gli URL HTTP validi nell'ordine di priorità.
  // onError avanza al candidato successivo; quando esauriti usa placeholder.svg.
  const candidates = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    const add = (url?: string | null) => {
      const u = url?.trim();
      if (u && u.startsWith('http') && !seen.has(u)) { seen.add(u); out.push(u); }
    };
    add(product.image_url);
    add(product.thumbnailImage);
    if (Array.isArray(product.image_urls)) product.image_urls.forEach(add);
    if (Array.isArray(product.images))     product.images.forEach(add);
    return out;
  }, [product]);

  const [candidateIdx, setCandidateIdx] = useState(0);
  const imgSrc = candidateIdx < candidates.length
    ? candidates[candidateIdx]
    : '/placeholder.svg';

  const handleStripeCheckout = () => {
    if (finalPriceNum === null) return;
    // Redirect al form checkout che raccoglie email + spedizione prima di Stripe
    const params = new URLSearchParams({
      pid:      String(product.id ?? ''),
      pname:    product.name,
      price:    String(finalPriceNum),
      currency: locale.currency,
      loc:      locale.marketplace,
    });
    router.push(`/checkout?${params.toString()}`);
  };

  return (
    <div className="group relative flex flex-col bg-zinc-900 border border-zinc-700/60 hover:border-cyan-500/50 shadow-sm hover:shadow-[0_0_20px_rgba(168,85,247,0.2)] transition-all duration-200 rounded-sm">

      {/* Image — nessun link esterno, solo drawer interno */}
      <button
        onClick={() => onOpenDrawer(product)}
        className="relative w-full aspect-square overflow-hidden bg-zinc-950 active:opacity-80 rounded-t-sm"
        aria-label={`Dettagli ${product.name}`}
      >
        <Image
          src={imgSrc}
          alt={product.name}
          width={600}
          height={600}
          sizes="(max-width: 768px) 100vw, 300px"
          className="absolute inset-0 w-full h-full object-contain transition-transform duration-300 group-hover:scale-[1.04]"
          loading="lazy"
          priority={false}
          unoptimized
          onError={() => setCandidateIdx((i) => i + 1)}
        />

        {/* Crosshair corners on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <span className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-orange-500" />
          <span className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-orange-500" />
          <span className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-orange-500" />
          <span className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-orange-500" />
        </div>

        {/* Badge */}
        <div
          className={`absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-sm font-mono text-[9px] font-bold tracking-widest uppercase ${
            badge.type === 'defcon'
              ? 'bg-orange-500/90 text-black'
              : 'bg-cyan-500/90 text-black'
          }`}
        >
          {badge.type === 'defcon' ? <Zap size={8} /> : <ShieldCheck size={8} />}
          {badge.text}
        </div>

        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all pointer-events-none" />
      </button>

      {/* Info */}
      <div className="flex flex-col gap-2 p-3 flex-1">
        {product.category && (
          <span className="font-mono text-[9px] tracking-[0.2em] text-th-subtle uppercase">
            {product.category.replace(/-/g, ' ')}
          </span>
        )}

        <button onClick={() => onOpenDrawer(product)} className="text-left flex-1">
          <h3 className="font-mono text-xs font-medium leading-snug line-clamp-2 min-h-[2.8em] text-white transition-colors">
            {product.name}
          </h3>
        </button>

        {/* Rating stelle — visibile solo se il prodotto ha una valutazione */}
        {product.rating != null && product.rating > 0 && (
          <ProductRating
            rating={product.rating as number}
            reviewCount={product.review_count as number | undefined}
            size="sm"
          />
        )}

        <p className="font-mono font-bold text-base text-orange-400 tracking-tight mt-auto">
          {finalPriceDisplay !== null
            ? finalPriceDisplay
            : (
              <span className="font-mono text-[9px] tracking-widest uppercase px-2 py-1 border border-orange-500/40 text-orange-400/70 rounded-sm">
                CONTROLLA PREZZO
              </span>
            )
          }
        </p>

        {/* Dual CTA — Carrello + Acquista Ora */}
        {showPurchaseButtons ? (
          <div className="flex gap-1.5">
            <button
              onClick={handleAddToCart}
              className="flex-1 min-h-[44px] py-2 font-mono font-bold text-[8px] tracking-wide uppercase text-black bg-cyan-500 hover:bg-cyan-400 active:scale-95 transition-all rounded-sm flex items-center justify-center gap-1 overflow-hidden"
            >
              <ShoppingCart size={10} className="shrink-0" />
              <span className="truncate">{t('addToCart')}</span>
            </button>
            <button
              onClick={handleStripeCheckout}
              className="flex-1 min-h-[44px] py-2 font-mono font-bold text-[8px] tracking-wide uppercase text-black bg-orange-500 hover:bg-orange-400 active:scale-95 transition-all rounded-sm shadow-[0_0_8px_rgba(249,115,22,0.2)] hover:shadow-[0_0_16px_rgba(249,115,22,0.45)] flex items-center justify-center gap-1 overflow-hidden"
            >
              <CreditCard size={10} className="shrink-0" />
              <span className="truncate">{t('buyNow')}</span>
            </button>
          </div>
        ) : (
          <div className="min-h-[44px] flex items-center justify-center border border-zinc-700/60 rounded-sm">
            <span className="font-mono text-[9px] tracking-widest text-th-subtle uppercase text-center px-2">
              {t('contactForAvailability')}
            </span>
          </div>
        )}

        <div className="flex items-center justify-center gap-1.5 pt-1 border-t border-zinc-800">
          <Image
            src="/svg_kitwer/freepik__svg-pacco-spedizione-cardboard-box-icon-with-shipp__59072.png"
            alt=""
            aria-hidden="true"
            width={10}
            height={10}
            className="w-2.5 h-2.5 object-contain invert opacity-60"
          />
          <span className="font-mono text-[9px] text-th-subtle tracking-wide">{t('shipping')}</span>
          <span className="font-mono text-[9px] text-th-subtle">·</span>
          <Image
            src="/svg_kitwer/freepik__svg-support-for-logo-assets-crisp-outlines-layered__59071-removebg-preview.png"
            alt=""
            aria-hidden="true"
            width={10}
            height={10}
            className="w-2.5 h-2.5 object-contain invert opacity-60"
          />
          <span className="font-mono text-[9px] text-th-subtle tracking-wide">{t('support')}</span>
        </div>
      </div>
    </div>
  );
}
