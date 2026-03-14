'use client';

import Image from 'next/image';
import { X, CreditCard, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
import { Product } from '@/types/product';
import { useIntl } from '@/context/InternationalizationContext';
import { useState, useMemo, useEffect } from 'react';
import VariantSelector from './VariantSelector';

interface Props {
  product: Product | null;
  onClose: () => void;
}

export default function ProductDrawer({ product, onClose }: Props) {
  const { locale, formatPrice, getExchangeRate } = useIntl();
  const [mollieLoading]   = useState(false); // kept for UI compat
  const [imgIndex, setImgIndex]             = useState(0);
  const [failedImages, setFailedImages]     = useState<Set<number>>(new Set());
  const [isZoomed, setIsZoomed]             = useState(false);
  const [variantImageUrl, setVariantImageUrl] = useState<string | null>(null);

  // Reset gallery state when product changes
  useEffect(() => {
    setImgIndex(0);
    setFailedImages(new Set());
    setIsZoomed(false);
    setVariantImageUrl(null);
  }, [product?.id]);

  const images = useMemo(() => {
    if (!product) return ['/placeholder.svg'];
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
  }, [product]);

  if (!product) return null;

  // Se l'utente ha scelto una variante con immagine, quella ha la priorità sull'indice galleria
  const currentSrc = variantImageUrl ?? (failedImages.has(imgIndex) ? '/placeholder.svg' : images[imgIndex]);

  const raw           = parseFloat(String(product.price ?? ''));
  const finalPriceNum = isNaN(raw) ? null : Math.round((raw * getExchangeRate() * 1.2 + 3.99) * 100) / 100;
  const inStock       = true;

  const goPrev = () => setImgIndex((p) => (p === 0 ? images.length - 1 : p - 1));
  const goNext = () => setImgIndex((p) => (p === images.length - 1 ? 0 : p + 1));

  const handleMollieCheckout = () => {
    if (finalPriceNum === null) return;
    const params = new URLSearchParams({
      pid:      String(product.id ?? ''),
      pname:    product.name,
      price:    String(finalPriceNum),
      currency: locale.currency,
      loc:      locale.marketplace,
    });
    window.location.href = `/checkout?${params.toString()}`;
  };

  return (
    <>
      {/* ── Lightbox zoom ── */}
      {isZoomed && (
        <div
          className="fixed inset-0 z-[70] bg-black/95 flex items-center justify-center"
          onClick={() => setIsZoomed(false)}
        >
          <button
            type="button"
            onClick={() => setIsZoomed(false)}
            className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-white/10 text-white border border-white/10"
            aria-label="Chiudi zoom"
          >
            <X size={18} />
          </button>
          <Image
            src={currentSrc}
            alt={product.name}
            width={900}
            height={900}
            sizes="100vw"
            className="max-w-full max-h-[90vh] object-contain p-4"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <div className="fixed inset-0 bg-black/70 z-50 backdrop-blur-sm" onClick={onClose} />

      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl max-h-[88vh] flex flex-col overflow-hidden animate-slide-up"
        style={{ background: 'var(--th-card)' }}
      >
        {/* Handle + Close */}
        <div className="relative flex items-center justify-center pt-3 pb-2 flex-shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--th-border)' }} />
          <button
            onClick={onClose}
            className="absolute right-4 w-8 h-8 flex items-center justify-center rounded-full"
            style={{ background: 'var(--th-input)', color: 'var(--th-muted)' }}
            aria-label="Chiudi"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 px-4 pb-6">

          {/* ── Image gallery ── */}
          <div className="mt-2 mb-3">
            {/* Main image */}
            <div
              className="relative aspect-video max-h-48 rounded-2xl overflow-hidden flex items-center justify-center"
              style={{ background: 'var(--th-input)' }}
            >
              <Image
                key={imgIndex}
                src={currentSrc}
                alt={product.name}
                width={600}
                height={340}
                sizes="(max-width: 768px) 100vw, 33vw"
                className="w-full h-full object-contain p-3 transition-opacity duration-200 cursor-zoom-in"
                onDoubleClick={() => setIsZoomed(true)}
                onError={() => setFailedImages((prev) => new Set(prev).add(imgIndex))}
              />

              {/* Zoom button */}
              <button
                type="button"
                onClick={() => setIsZoomed(true)}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center border border-white/10 active:scale-90 transition-transform"
                aria-label="Zoom immagine"
              >
                <ZoomIn size={13} />
              </button>

              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={goPrev}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center active:scale-90 transition-transform border border-white/10"
                    aria-label="Immagine precedente"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center active:scale-90 transition-transform border border-white/10"
                    aria-label="Immagine successiva"
                  >
                    <ChevronRight size={18} />
                  </button>

                  {/* Dot indicators */}
                  <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-1.5">
                    {images.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setImgIndex(i)}
                        className={`h-1.5 rounded-full transition-all ${i === imgIndex ? 'w-4 bg-orange-400' : 'w-2 bg-white/40'}`}
                        aria-label={`Immagine ${i + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Thumbnail strip */}
            {images.length > 1 && (
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                {images.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setImgIndex(i)}
                    className={`flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 transition-all ${
                      i === imgIndex
                        ? 'border-orange-400 ring-1 ring-orange-400/50'
                        : 'border-white/10 hover:border-white/30'
                    }`}
                    aria-label={`Seleziona immagine ${i + 1}`}
                  >
                    <Image
                      src={failedImages.has(i) ? '/placeholder.svg' : img}
                      alt={`Thumbnail ${i + 1}`}
                      width={56}
                      height={56}
                      className="w-full h-full object-contain"
                      onError={() => setFailedImages((prev) => new Set(prev).add(i))}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {product.variantAttributes && (
            <span className="text-xs text-[#00D4FF] font-bold uppercase tracking-widest">
              {product.variantAttributes}
            </span>
          )}

          <h2 className="text-lg font-bold mt-1.5 mb-2 leading-snug" style={{ color: 'var(--th-text)' }}>
            {product.name}
          </h2>

          <VariantSelector
            variants={product.variants ?? []}
            onImageChange={(url) => { setVariantImageUrl(url); setImgIndex(0); }}
          />

          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold mb-4 border ${
              inStock
                ? 'bg-[#00FF94]/10 text-[#00FF94] border-[#00FF94]/20'
                : 'text-gray-500 border-gray-700'
            }`}
            style={!inStock ? { background: 'var(--th-input)' } : undefined}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${inStock ? 'bg-[#00FF94]' : 'bg-gray-500'}`} />
            {inStock ? 'Disponibile' : 'Esaurito'}
          </div>

          {product.description && (
            <p className="text-sm leading-relaxed" style={{ color: 'var(--th-muted)' }}>
              {product.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}
            </p>
          )}
        </div>

        {/* Footer prezzo + CTA */}
        <div
          className="flex-shrink-0 px-4 py-4 border-t"
          style={{ background: 'var(--th-card)', borderColor: 'var(--th-border)' }}
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-[10px] uppercase tracking-widest mb-0.5" style={{ color: 'var(--th-faint)' }}>
                  Prezzo
                </p>
                <p className="text-2xl font-black text-[#00D4FF]">
                  {finalPriceNum !== null ? formatPrice(raw) : '—'}
                </p>
              </div>

              {/* CTA unica — solo Acquista → Mollie */}
              <div className="flex-1 min-w-[200px]">
                <button
                  onClick={handleMollieCheckout}
                  disabled={mollieLoading || !inStock || finalPriceNum === null}
                  className="flex items-center justify-center gap-2 h-12 px-5 bg-orange-500 hover:bg-orange-400 text-black font-bold rounded-2xl active:scale-95 transition-all hover:shadow-[0_0_20px_rgba(249,115,22,0.5)] disabled:opacity-40 disabled:cursor-not-allowed w-full"
                >
                  {mollieLoading ? (
                    <><span className="animate-spin inline-block w-4 h-4 border-2 border-black/30 border-t-black rounded-full" /> Caricamento...</>
                  ) : (
                    <><CreditCard size={17} /> Acquista</>
                  )}
                </button>
              </div>
            </div>

            {/* Trust badge */}
            <div className="rounded-xl border px-3 py-2.5 text-xs leading-snug text-center" style={{ borderColor: 'var(--th-border)', background: 'var(--th-input)', color: 'var(--th-muted)' }}>
              <p className="flex items-center justify-center gap-1.5">
                <Image
                  src="/svg_kitwer/freepik__scatola-pacco-svg-flat-cardboard-box-icon-with-fol__5786-removebg-preview.png"
                  alt=""
                  aria-hidden="true"
                  width={14}
                  height={14}
                  className="w-3.5 h-3.5 object-contain invert opacity-60"
                />
                <span>Spedizione Rapida — Garanzia 24 mesi</span>
              </p>
              <p className="flex items-center justify-center gap-1.5 mt-0.5">
                <Image
                  src="/svg_kitwer/freepik__svg-support-for-logo-assets-crisp-outlines-layered__59071-removebg-preview.png"
                  alt=""
                  aria-hidden="true"
                  width={14}
                  height={14}
                  className="w-3.5 h-3.5 object-contain invert opacity-60"
                />
                <span>
                  <span className="font-semibold text-[#00D4FF]">Supporto Tecnico</span>{' '}
                  Prioritario incluso
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
