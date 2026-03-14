'use client';

import Image from 'next/image';
import { ShieldCheck, Zap, CreditCard, ShoppingCart } from 'lucide-react';
import { Product } from '@/types/product';
import { useIntl } from '@/context/InternationalizationContext';
import { useCart } from '@/context/CartContext';
import { useState } from 'react';

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
  const { locale, formatPrice, getExchangeRate, t } = useIntl();
  const { addItem, openCart } = useCart();

  const raw               = getRawPrice(product);
  const finalPriceNum     = isNaN(raw) ? null : Math.round((raw * getExchangeRate() * 1.2 + 3.99) * 100) / 100;
  const finalPriceDisplay = isNaN(raw) ? null : formatPrice(raw);
  const badge             = getBadge(product.category);
  // No-zero guard: nascondi i bottoni acquisto se il prezzo calcolato è ≤ 0
  const showPurchaseButtons = finalPriceNum !== null && finalPriceNum > 0;

  const handleAddToCart = () => {
    addItem(product);
    openCart();
  };

  const [imgSrc, setImgSrc]               = useState<string>(
    product.image_url || product.thumbnailImage || '/placeholder.svg'
  );
  const [mollieLoading, setMollieLoading] = useState(false);

  const handleMollieCheckout = async () => {
    if (finalPriceNum === null) return;
    setMollieLoading(true);
    try {
      const res = await fetch('/api/checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId:          product.id ?? null,
          productName:        product.name,
          finalPrice:         finalPriceNum,
          quantity:           1,
          currency:           locale.currency,
          marketplace_locale: locale.marketplace,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore checkout');
      window.location.href = data.checkoutUrl;
    } catch (err) {
      console.error('[Mollie checkout]', err);
      alert("Errore durante l'avvio del pagamento. Riprova.");
    } finally {
      setMollieLoading(false);
    }
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
          onError={() => setImgSrc('/placeholder.svg')}
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
          <span className="font-mono text-[9px] tracking-[0.2em] text-zinc-600 uppercase">
            {product.category.replace(/-/g, ' ')}
          </span>
        )}

        <button onClick={() => onOpenDrawer(product)} className="text-left flex-1">
          <h3 className="font-mono text-xs font-medium leading-snug line-clamp-2 min-h-[2.8em] text-zinc-200 group-hover:text-white transition-colors">
            {product.name}
          </h3>
        </button>

        <p className="font-mono font-bold text-base text-orange-400 tracking-tight mt-auto">
          {finalPriceDisplay !== null
            ? finalPriceDisplay
            : <span className="text-zinc-600 text-xs font-mono">{t('pricePending')}</span>
          }
        </p>

        {/* Dual CTA — Carrello + Acquista Ora */}
        {showPurchaseButtons ? (
          <div className="flex gap-1.5">
            <button
              onClick={handleAddToCart}
              className="flex-1 min-h-[44px] py-2.5 font-mono font-bold text-[9px] tracking-widest uppercase text-black bg-cyan-500 hover:bg-cyan-400 active:scale-95 transition-all rounded-sm flex items-center justify-center gap-1"
            >
              <ShoppingCart size={10} /> {t('buttons.addToCart')}
            </button>
            <button
              onClick={handleMollieCheckout}
              disabled={mollieLoading}
              className="flex-1 min-h-[44px] py-2.5 font-mono font-bold text-[9px] tracking-widest uppercase text-black bg-orange-500 hover:bg-orange-400 disabled:opacity-50 active:scale-95 transition-all rounded-sm shadow-[0_0_8px_rgba(249,115,22,0.2)] hover:shadow-[0_0_16px_rgba(249,115,22,0.45)] flex items-center justify-center gap-1"
            >
              {mollieLoading ? (
                <span className="animate-spin inline-block w-3 h-3 border-2 border-black/40 border-t-black rounded-full" />
              ) : (
                <><CreditCard size={10} /> {t('buttons.buyNow')}</>
              )}
            </button>
          </div>
        ) : (
          <div className="min-h-[44px] flex items-center justify-center border border-zinc-700/60 rounded-sm">
            <span className="font-mono text-[9px] tracking-widest text-zinc-500 uppercase text-center px-2">
              {t('contactForAvailability')}
            </span>
          </div>
        )}

        <div className="flex items-center justify-center gap-1.5 pt-1 border-t border-zinc-800">
          <Image
            src="/svg_kitwer/freepik__scatola-pacco-svg-flat-cardboard-box-icon-with-fol__5786-removebg-preview.png"
            alt=""
            aria-hidden="true"
            width={10}
            height={10}
            className="w-2.5 h-2.5 object-contain invert opacity-40"
          />
          <span className="font-mono text-[9px] text-zinc-700 tracking-wide">{t('shipping')}</span>
          <span className="text-zinc-700">·</span>
          <Image
            src="/svg_kitwer/freepik__svg-support-for-logo-assets-crisp-outlines-layered__59071-removebg-preview.png"
            alt=""
            aria-hidden="true"
            width={10}
            height={10}
            className="w-2.5 h-2.5 object-contain invert opacity-40"
          />
          <span className="font-mono text-[9px] text-zinc-700 tracking-wide">{t('support')}</span>
        </div>
      </div>
    </div>
  );
}
