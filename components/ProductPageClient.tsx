'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { buildAffiliateLink } from '@/lib/affiliate';
import type { Product, ProductVariant } from '@/types/product';
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

// ── Variant Selector ──────────────────────────────────────────────────────────

const VARIANT_ICONS: Record<string, string> = {
  'Colore': '🎨', 'Piattaforma': '🎮', 'Capacità': '💾',
  'Refresh Rate': '📺', 'Risoluzione': '🖥️', 'Dimensione': '📐',
  'Taglia': '📏', 'Connettività': '📡', 'Versione': '🔀',
};

interface VariantSelectorProps {
  variants:        ProductVariant[];
  selected:        Record<string, string>;
  onSelect:        (variantName: string, value: string) => void;
  formatPrice:     (n: number) => string;
}

function VariantSelector({ variants, selected, onSelect, formatPrice }: VariantSelectorProps) {
  if (!variants.length) return null;
  return (
    <div className="space-y-4 border border-zinc-800 rounded-sm p-4 bg-zinc-900/60">
      <p className="font-mono text-[9px] tracking-[0.3em] text-th-subtle uppercase font-bold">
        Opzioni Disponibili
      </p>
      {variants.map((v) => (
        <div key={v.name}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs">{VARIANT_ICONS[v.name] ?? '⚙️'}</span>
            <span className="font-mono text-[10px] font-bold text-white uppercase tracking-widest">
              {v.name}
            </span>
            {selected[v.name] && (
              <span className="font-mono text-[10px] text-orange-400 ml-auto">
                {selected[v.name]}
                {v.prices?.[selected[v.name]] != null && (
                  <span className="text-th-subtle ml-1">
                    — {formatPrice(v.prices![selected[v.name]])}
                  </span>
                )}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {v.values.map((val) => {
              const isActive    = selected[v.name] === val;
              const price       = v.prices?.[val];
              const productId   = v.productIds?.[val];
              const hasVariantImg = !!v.images?.[val];

              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => onSelect(v.name, val)}
                  className={`relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-sm border font-mono text-[10px] font-semibold transition-all active:scale-95
                    ${isActive
                      ? 'border-orange-500 bg-orange-500/10 text-orange-400 ring-1 ring-orange-500/30'
                      : 'border-zinc-700 bg-zinc-900 text-th-subtle hover:border-zinc-500 hover:text-white'
                    }`}
                >
                  {hasVariantImg && (
                    <Image
                      src={v.images![val]}
                      alt={val}
                      width={32}
                      height={32}
                      className="w-8 h-8 object-contain rounded-sm"
                      unoptimized
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}
                  <span>{val}</span>
                  {price != null && (
                    <span className={`text-[9px] font-normal ${isActive ? 'text-orange-300' : 'text-th-subtle'}`}>
                      {formatPrice(price)}
                    </span>
                  )}
                  {productId && isActive && (
                    <Link
                      href={`/product/${productId}`}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 flex items-center justify-center bg-orange-500 rounded-full"
                      onClick={(e) => e.stopPropagation()}
                      title="Vai a questo prodotto"
                    >
                      <ExternalLink size={8} className="text-black" />
                    </Link>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

const DESC_TRUNCATE = 220;

/** Rimuove tutti i tag HTML mantenendo solo il testo. */
function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export default function ProductPageClient({ product, relatedProducts = [] }: Props) {
  const { convertPrice, getExchangeRate } = useIntl();

  /** Rileva ASIN fake su Amazon CDN */
  const isRealImage = (url?: string | null): url is string => {
    if (!url || typeof url !== 'string' || !url.trim()) return false;
    if (url.includes('m.media-amazon.com')) {
      const id = url.match(/\/images\/I\/([^._]+)/)?.[1] ?? '';
      if (/^[A-Z0-9]{10}$/.test(id)) return false; // ASIN fake
      if (!url.includes('._')) return false;
    }
    return true;
  };

  /**
   * Normalizza un URL immagine:
   * - http:// → https:// (Next.js Image richiede il protocollo nella allowlist;
   *   quasi tutti i siti moderni supportano HTTPS — se fallisce, onError fa il fallback)
   */
  const normalizeImgUrl = (url: string): string =>
    url.startsWith('http://') ? url.replace('http://', 'https://') : url;

  const images = useMemo(() => {
    const raw: string[] = [
      ...(Array.isArray(product.image_urls) ? product.image_urls : []),
      ...(Array.isArray(product.images)     ? product.images     : []),
      product.image_url    ?? '',
      product.thumbnailImage ?? '',
    ];
    const real = [...new Set(raw)]
      .filter(isRealImage)
      .map(normalizeImgUrl);
    return real.length ? real : ['/placeholder.svg'];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.image_urls, product.images, product.image_url, product.thumbnailImage]);

  const [index, setIndex]               = useState(0);
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());
  const [descExpanded, setDescExpanded] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});

  const currentSrc = failedImages.has(index) ? '/placeholder.svg' : images[index];

  const variants = (product.variants ?? []) as ProductVariant[];

  // Prezzo attivo: se la variante "Versione" selezionata ha un prezzo → usalo
  const activeVariantPrice = useMemo(() => {
    const versioneVariant = variants.find((v) => v.name === 'Versione');
    const selVersione     = selectedVariants['Versione'];
    if (versioneVariant && selVersione && versioneVariant.prices?.[selVersione] != null) {
      return versioneVariant.prices![selVersione];
    }
    return null;
  }, [variants, selectedVariants]);

  const raw           = parseFloat(String(activeVariantPrice ?? product.price ?? ''));
  const finalPriceNum = isNaN(raw) ? null : Math.round(raw * getExchangeRate() * 100) / 100;

  const handleVariantSelect = (variantName: string, value: string) => {
    setSelectedVariants((prev) => ({ ...prev, [variantName]: value }));
    // Se la variante ha un'immagine associata → passa a quell'immagine
    const vDef = variants.find((v) => v.name === variantName);
    if (vDef?.images?.[value]) {
      const imgIdx = images.indexOf(vDef.images[value]);
      if (imgIdx >= 0) setIndex(imgIdx);
    }
  };
  const inStock       = true;

  // Affiliate link — built from product_url.
  // affiliateUrl gates button state; actual href routes through /track/product/[id].
  const affiliateUrl = buildAffiliateLink(product.product_url);
  const trackUrl     = product.id ? `/track/product/${product.id}` : null;

  const desc        = stripHtml(product.description ?? '');
  const isLongDesc  = desc.length > DESC_TRUNCATE;
  const displayDesc = isLongDesc && !descExpanded
    ? desc.slice(0, DESC_TRUNCATE).trimEnd() + '…'
    : desc;

  const showSecurityBullets = isSecurityCategory(product.category);

  const goPrev = () => setIndex((p) => (p === 0 ? images.length - 1 : p - 1));
  const goNext = () => setIndex((p) => (p === images.length - 1 ? 0 : p + 1));

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 h-14 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-xl">
        <Link
          href="/"
          className="font-mono text-xs text-th-subtle hover:text-cyan-400 active:scale-95 transition-all"
        >
          ← TORNA AL DATABASE
        </Link>
        <span className="font-mono text-[10px] font-semibold text-th-subtle uppercase tracking-widest">
          SCHEDA PRODOTTO
        </span>
        <span className="w-10" />
      </header>

      {/* Scrollable content */}
      <main className="flex-1 px-4 pb-36 pt-3 overflow-y-auto">
        {/* ── ABOVE-FOLD CTA HERO — first visible element for ad traffic ── */}
        <div className="max-w-md mx-auto mb-4 rounded-sm border border-amber-500/30 bg-zinc-900/60 p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <p className="font-mono text-[9px] tracking-[0.25em] text-amber-400/70 uppercase mb-1">
                {product.category?.replace(/-/g, ' ') ?? 'Prodotto'}
              </p>
              <h1 className="font-mono font-bold text-base text-white leading-snug line-clamp-2">
                {product.name}
              </h1>
            </div>
            {finalPriceNum !== null && (
              <div className="shrink-0 text-right">
                <p className="font-mono text-[9px] text-th-subtle uppercase tracking-widest">Prezzo</p>
                <p className="font-mono font-black text-2xl text-orange-400">
                  {convertPrice(raw)}
                </p>
              </div>
            )}
          </div>

          {affiliateUrl && trackUrl ? (
            <a
              href={trackUrl}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="flex items-center justify-center gap-2 h-14 px-4 font-mono font-bold text-sm tracking-widest uppercase text-black bg-orange-500 hover:bg-orange-400 active:scale-95 transition-all rounded-sm shadow-[0_0_18px_rgba(249,115,22,0.5)] w-full"
            >
              <ExternalLink size={16} />
              [ VEDI OFFERTA SU AMAZON ]
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="flex items-center justify-center gap-2 h-14 font-mono font-bold text-sm tracking-widest uppercase text-zinc-500 border border-zinc-700 rounded-sm w-full cursor-not-allowed"
            >
              [ NON DISPONIBILE ]
            </button>
          )}
        </div>

        {/* Carousel */}
        <section className="max-w-md mx-auto">
          <div className="relative w-full aspect-square rounded-sm overflow-hidden bg-zinc-900 border border-zinc-700/60">
            <Image
              key={index}
              src={currentSrc}
              alt={product.name ?? ''}
              width={600}
              height={600}
              sizes="(max-width: 768px) 100vw, 33vw"
              className="w-full h-full object-contain transition-opacity duration-200"
              priority
              unoptimized
              onError={() => {
                console.error(
                  `[ProductPage] Immagine fallita — prodotto: "${product.name}" | index: ${index} | url: ${currentSrc}`,
                );
                setFailedImages((prev) => new Set(prev).add(index));
              }}
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
                    unoptimized
                    onError={() => {
                      console.error(
                        `[ProductPage] Thumbnail fallita — prodotto: "${product.name}" | thumb ${i + 1} | url: ${img}`,
                      );
                      setFailedImages((prev) => new Set(prev).add(i));
                    }}
                  />
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Product info */}
        <section className="max-w-md mx-auto mt-4 space-y-4">
          {/* Category tag */}
          {/* Stock */}
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm font-mono text-[10px] font-semibold border ${
            inStock
              ? 'bg-green-500/10 text-green-400 border-green-500/25'
              : 'text-th-subtle border-zinc-700'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${inStock ? 'bg-green-400' : 'bg-zinc-500'}`} />
            {inStock ? 'DISPONIBILE' : 'ESAURITO'}
          </div>

          {/* Description + read more */}
          {desc && (
            <div>
              <p className="text-sm leading-relaxed text-th-subtle font-sans">
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

          {/* Variant selector */}
          {variants.length > 0 && (
            <VariantSelector
              variants={variants}
              selected={selectedVariants}
              onSelect={handleVariantSelect}
              formatPrice={(n) => convertPrice(n)}
            />
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
                  <p className="text-[12px] leading-snug text-th-subtle font-sans">
                    <span className="font-semibold text-white">{title}: </span>{text}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Trust badge */}
          <div className="rounded-sm border border-zinc-700/60 bg-zinc-900 px-3 py-2.5 text-xs text-center">
            <p className="flex items-center justify-center gap-1.5 font-mono text-th-subtle text-[10px]">
              <Image
                src="/svg_kitwer/freepik__scatola-pacco-svg-flat-cardboard-box-icon-with-fol__5786-removebg-preview.png"
                alt=""
                aria-hidden="true"
                width={12}
                height={12}
                className="w-3 h-3 object-contain invert opacity-60"
              />
              <span>Spedizione Rapida — Garanzia Amazon</span>
            </p>
            <p className="flex items-center justify-center gap-1.5 mt-0.5 font-mono text-th-subtle text-[10px]">
              <Image
                src="/svg_kitwer/freepik__svg-support-for-logo-assets-crisp-outlines-layered__59071-removebg-preview.png"
                alt=""
                aria-hidden="true"
                width={12}
                height={12}
                className="w-3 h-3 object-contain invert opacity-60"
              />
              <span><span className="text-cyan-400 font-semibold">Supporto</span> via support@kitwer26.com</span>
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
              <p className="font-mono text-[9px] uppercase tracking-widest text-th-subtle">
                {activeVariantPrice != null ? 'Prezzo Variante' : 'Prezzo'}
              </p>
              <p className="font-mono font-black text-2xl text-orange-400">
                {finalPriceNum !== null ? convertPrice(raw) : '—'}
              </p>
              {activeVariantPrice != null && (
                <p className="font-mono text-[9px] text-th-subtle">
                  ← {selectedVariants['Versione']}
                </p>
              )}
            </div>

            {/* CTA affiliato Amazon */}
            <div className="flex-1">
              {affiliateUrl && trackUrl ? (
                <a
                  href={trackUrl}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="flex items-center justify-center gap-2 h-12 px-4 font-mono font-bold text-xs tracking-widest uppercase text-black bg-orange-500 hover:bg-orange-400 active:scale-95 transition-all rounded-sm shadow-[0_0_12px_rgba(249,115,22,0.4)] w-full"
                >
                  <ExternalLink size={15} />
                  [ ACQUISTA SU AMAZON ]
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  title="Prodotto temporaneamente non disponibile"
                  className="flex items-center justify-center gap-2 h-12 px-4 font-mono font-bold text-xs tracking-widest uppercase text-black bg-orange-500/40 rounded-sm opacity-40 cursor-not-allowed w-full"
                >
                  <ExternalLink size={15} />
                  [ NON DISPONIBILE ]
                </button>
              )}
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
