'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CreditCard } from 'lucide-react';
import type { Product } from '@/types/product';
import { useIntl } from '@/context/InternationalizationContext';
import Link from 'next/link';
import RelatedProducts from './RelatedProducts';
import SafeFocus from './SafeFocus';

interface Props {
  product:         Product;
  relatedProducts?: Product[];
}

function isSecurityCategory(category?: string): boolean {
  if (!category) return false;
  const c = category.toLowerCase();
  return c.includes('crypto') || c.includes('security') || c.includes('sicurezza') || c.includes('comms');
}

const SECURITY_BULLETS = [
  {
    icon:  '🛡️',
    title: 'Acquisto Sicuro',
    text:  "Prodotto spedito direttamente dai rivenditori ufficiali per garantire l'integrità del firmware.",
  },
  {
    icon:  '🔑',
    title: 'Zero Tracce',
    text:  'Non condividere mai la tua Seed Phrase. Ricorda: "Not your keys, not your coins".',
  },
  {
    icon:  '🔥',
    title: 'Protezione Totale',
    text:  "Consigliamo l'abbinamento con un backup in metallo per resistere a danni fisici.",
  },
];

const DESC_TRUNCATE = 220;

/** Rimuove tutti i tag HTML mantenendo solo il testo. */
function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export default function ProductPageClient({ product, relatedProducts = [] }: Props) {
  const { locale, formatPrice, getExchangeRate } = useIntl();

  const images = useMemo(() => {
    // Priorità: image_urls (DB gallery) → images (legacy) → image_url singola
    if (Array.isArray(product.image_urls) && product.image_urls.length > 0) {
      const filtered = product.image_urls.filter((u) => typeof u === 'string' && u.trim());
      if (filtered.length > 0) return filtered;
    }
    const arr: string[] = [];
    if (Array.isArray(product.images) && product.images.length > 0) {
      arr.push(...product.images.filter((u) => typeof u === 'string' && u.trim()));
    }
    const thumb = product.image_url || product.thumbnailImage;
    if ((!arr.length || !arr[0]) && thumb) arr.unshift(thumb);
    return arr.length ? arr : ['/placeholder.svg'];
  }, [product.image_urls, product.images, product.image_url, product.thumbnailImage]);

  const [index, setIndex]               = useState(0);
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());
  const [descExpanded, setDescExpanded] = useState(false);

  const currentSrc = failedImages.has(index) ? '/placeholder.svg' : images[index];

  const raw           = parseFloat(String(product.price ?? ''));
  const finalPriceNum = isNaN(raw) ? null : Math.round(raw * getExchangeRate() * 1.2 * 100) / 100;
  const inStock       = true;

  const desc        = stripHtml(product.description ?? '');
  const isLongDesc  = desc.length > DESC_TRUNCATE;
  const displayDesc = isLongDesc && !descExpanded
    ? desc.slice(0, DESC_TRUNCATE).trimEnd() + '…'
    : desc;

  const showSecurityBullets = isSecurityCategory(product.category);

  const [mollieLoading, setMollieLoading] = useState(false);

  const goPrev = () => setIndex((p) => (p === 0 ? images.length - 1 : p - 1));
  const goNext = () => setIndex((p) => (p === images.length - 1 ? 0 : p + 1));

  const handleMollieCheckout = async () => {
    if (finalPriceNum === null) return;
    setMollieLoading(true);
    try {
      const res = await fetch('/api/checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId:   product.id ?? null,
          productName: product.name,
          finalPrice:  finalPriceNum,
          quantity:    1,
          currency:    locale.currency,
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
    <div className="min-h-screen flex flex-col bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 h-14 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-xl">
        <Link
          href="/"
          className="font-mono text-xs text-zinc-500 hover:text-cyan-400 active:scale-95 transition-all"
        >
          ← TORNA AL DATABASE
        </Link>
        <span className="font-mono text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">
          SCHEDA PRODOTTO
        </span>
        <span className="w-10" />
      </header>

      {/* Scrollable content */}
      <main className="flex-1 px-4 pb-36 pt-3 overflow-y-auto">
        {/* Carousel */}
        <section className="max-w-md mx-auto">
          <div className="relative w-full aspect-square rounded-sm overflow-hidden bg-zinc-900 border border-zinc-700/60">
            <Image
              key={index}
              src={currentSrc}
              alt={product.name}
              width={600}
              height={600}
              sizes="(max-width: 768px) 100vw, 33vw"
              className="w-full h-full object-contain transition-opacity duration-200"
              priority
              onError={() => setFailedImages((prev) => new Set(prev).add(index))}
            />

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={goPrev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-sm bg-black/60 text-white flex items-center justify-center active:scale-90 transition-transform border border-zinc-700/60"
                  aria-label="Immagine precedente"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-sm bg-black/60 text-white flex items-center justify-center active:scale-90 transition-transform border border-zinc-700/60"
                  aria-label="Immagine successiva"
                >
                  <ChevronRight size={18} />
                </button>
                <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-1.5">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setIndex(i)}
                      className={`h-1.5 rounded-sm transition-all ${i === index ? 'w-4 bg-orange-400' : 'w-2 bg-zinc-600'}`}
                      aria-label={`Immagine ${i + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Thumbnail gallery */}
          {images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
              {images.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIndex(i)}
                  className={`flex-shrink-0 w-16 h-16 rounded-sm overflow-hidden border-2 transition-all ${
                    i === index
                      ? 'border-orange-400 ring-1 ring-orange-400/50'
                      : 'border-zinc-700 hover:border-zinc-600'
                  }`}
                  aria-label={`Seleziona immagine ${i + 1}`}
                >
                  <Image
                    src={failedImages.has(i) ? '/placeholder.svg' : img}
                    alt={`Thumbnail ${i + 1}`}
                    width={64}
                    height={64}
                    className="w-full h-full object-contain"
                    onError={() => setFailedImages((prev) => new Set(prev).add(i))}
                  />
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Product info */}
        <section className="max-w-md mx-auto mt-4 space-y-4">
          {/* Category tag */}
          {product.category && (
            <span className="inline-block font-mono text-[10px] tracking-[0.25em] text-cyan-500/80 uppercase">
              {product.category.replace(/-/g, ' ')}
            </span>
          )}

          <h1 className="font-mono font-bold text-xl leading-snug text-white">
            {product.name}
          </h1>

          {/* Stock */}
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm font-mono text-[10px] font-semibold border ${
            inStock
              ? 'bg-green-500/10 text-green-400 border-green-500/25'
              : 'text-zinc-500 border-zinc-700'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${inStock ? 'bg-green-400' : 'bg-zinc-500'}`} />
            {inStock ? 'DISPONIBILE' : 'ESAURITO'}
          </div>

          {/* Description + read more */}
          {desc && (
            <div>
              <p className="text-sm leading-relaxed text-zinc-400 font-sans">
                {displayDesc}
              </p>
              {isLongDesc && (
                <button
                  onClick={() => setDescExpanded((v) => !v)}
                  className="mt-2 font-mono text-[11px] font-semibold text-cyan-400 hover:underline active:scale-95 transition-transform"
                >
                  {descExpanded ? '[ MOSTRA MENO ↑ ]' : '[ LEGGI TUTTO ↓ ]'}
                </button>
              )}
            </div>
          )}

          {/* Security bullets */}
          {showSecurityBullets && (
            <div className="rounded-sm border border-cyan-500/20 bg-cyan-500/5 p-4 space-y-3">
              <p className="font-mono text-[9px] font-bold tracking-[0.3em] text-cyan-400/80 uppercase">
                Protocolli di Sicurezza
              </p>
              {SECURITY_BULLETS.map(({ icon, title, text }) => (
                <div key={title} className="flex items-start gap-2.5">
                  <span className="text-base shrink-0 mt-0.5">{icon}</span>
                  <p className="text-[12px] leading-snug text-zinc-400 font-sans">
                    <span className="font-semibold text-zinc-200">{title}: </span>{text}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Trust badge */}
          <div className="rounded-sm border border-zinc-700/60 bg-zinc-900 px-3 py-2.5 text-xs text-center">
            <p className="flex items-center justify-center gap-1.5 font-mono text-zinc-500 text-[10px]">
              <Image
                src="/svg_kitwer/freepik__scatola-pacco-svg-flat-cardboard-box-icon-with-fol__5786-removebg-preview.png"
                alt=""
                aria-hidden="true"
                width={12}
                height={12}
                className="w-3 h-3 object-contain invert opacity-60"
              />
              <span>Spedizione Rapida — Garanzia 24 mesi</span>
            </p>
            <p className="flex items-center justify-center gap-1.5 mt-0.5 font-mono text-zinc-500 text-[10px]">
              <Image
                src="/svg_kitwer/freepik__svg-support-for-logo-assets-crisp-outlines-layered__59071-removebg-preview.png"
                alt=""
                aria-hidden="true"
                width={12}
                height={12}
                className="w-3 h-3 object-contain invert opacity-60"
              />
              <span><span className="text-cyan-400 font-semibold">Supporto Tecnico</span> Prioritario incluso</span>
            </p>
          </div>

          {/* SafeFocus protocol badges */}
          <SafeFocus category={product.category ?? ''} />

          {/* Related products */}
          <RelatedProducts products={relatedProducts} />
        </section>
      </main>

      {/* ── STICKY FOOTER — fixed bottom, always visible on mobile ── */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 px-4 py-3 border-t border-zinc-800 bg-zinc-950/98 backdrop-blur-xl">
        <div className="max-w-md mx-auto flex flex-col gap-2">
          <div className="flex items-center gap-3">
            {/* Price */}
            <div className="shrink-0">
              <p className="font-mono text-[9px] uppercase tracking-widest text-zinc-600">Prezzo</p>
              <p className="font-mono font-black text-2xl text-orange-400">
                {finalPriceNum !== null ? formatPrice(raw) : '—'}
              </p>
            </div>

            {/* CTA unica — solo Acquista → Mollie */}
            <div className="flex-1">
              <button
                type="button"
                onClick={handleMollieCheckout}
                disabled={mollieLoading || !inStock || finalPriceNum === null}
                className="flex items-center justify-center gap-2 h-12 px-4 font-mono font-bold text-xs tracking-widest uppercase text-black bg-orange-500 hover:bg-orange-400 active:scale-95 transition-all rounded-sm disabled:opacity-40 shadow-[0_0_12px_rgba(249,115,22,0.4)] w-full"
              >
                {mollieLoading ? (
                  <><span className="animate-spin inline-block w-4 h-4 border-2 border-black/30 border-t-black rounded-full" /> CARICAMENTO...</>
                ) : (
                  <><CreditCard size={15} /> [ ACQUISTA ]</>
                )}
              </button>
            </div>
          </div>

          {/* Elite warranty */}
          {finalPriceNum !== null && finalPriceNum > 500 && (
            <div className="rounded-sm border border-amber-500/30 bg-amber-500/5 px-3 py-2">
              <p className="font-mono text-[8px] tracking-[0.2em] text-amber-400/70 uppercase font-bold mb-1.5 text-center">— Certificato Elite —</p>
              <div className="grid grid-cols-2 gap-1">
                {[
                  { icon: '🛡️', t: 'Garanzia 24 Mesi' },
                  { icon: '🚛', t: 'Spedizione Blindata' },
                  { icon: '💬', t: 'VIP Support' },
                  { icon: '↩️', t: 'Reso 30gg' },
                ].map(({ icon, t }) => (
                  <div key={t} className="flex items-center gap-1">
                    <span className="text-xs">{icon}</span>
                    <span className="font-mono text-[9px] text-amber-400/70">{t}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}
