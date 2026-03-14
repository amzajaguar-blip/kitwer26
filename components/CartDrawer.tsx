'use client';

import Link from 'next/link';
import Image from 'next/image';
import { X, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart, CartItem } from '@/context/CartContext';
import { getMarkupPrice } from '@/utils/pricing';
import { useEffect, useState } from 'react';
import type { Product } from '@/types/product';
import { fetchRelatedProducts } from '@/lib/products';

function CrossSellSection({ cartItems }: { cartItems: CartItem[] }) {
  const { addItem } = useCart();
  const [suggestions, setSuggestions] = useState<Product[]>([]);

  useEffect(() => {
    if (cartItems.length === 0) { setSuggestions([]); return; }
    const firstProduct = cartItems[0].product;
    const category = (firstProduct.category as string | undefined) ?? '';
    const id = (firstProduct.id as string | undefined) ?? '';
    if (!category) return;

    fetchRelatedProducts(category, id, 3)
      .then(setSuggestions)
      .catch(() => setSuggestions([]));
  }, [cartItems]);

  if (!suggestions.length) return null;

  return (
    <div
      className="px-4 py-3 border-t"
      style={{ borderColor: 'var(--th-border)' }}
    >
      <p
        className="text-[10px] font-bold uppercase tracking-widest mb-2.5"
        style={{ color: 'var(--th-faint)' }}
      >
        🔗 Spesso Acquistati Insieme
      </p>
      <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1">
        {suggestions.map((p) => {
          const raw = parseFloat(String(p.price ?? ''));
          const finalPrice = isNaN(raw) ? null : getMarkupPrice(raw);
          const imgSrc = p.image_url || p.thumbnailImage || '/placeholder.svg';
          const displayName = p.name || p.title || '';

          return (
            <div
              key={p.id}
              className="flex-shrink-0 w-32 rounded-xl overflow-hidden border flex flex-col"
              style={{ background: 'var(--th-input)', borderColor: 'var(--th-border)' }}
            >
              <div className="relative w-full aspect-square bg-black/5">
                <Image
                  src={imgSrc}
                  alt={displayName}
                  fill
                  className="object-cover"
                  sizes="128px"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder.svg';
                  }}
                />
              </div>
              <div className="p-1.5 flex flex-col gap-1">
                <p
                  className="text-[10px] font-medium line-clamp-2 leading-snug"
                  style={{ color: 'var(--th-text)' }}
                >
                  {displayName}
                </p>
                {finalPrice !== null && (
                  <p className="text-[11px] font-black text-[#00D4FF]">
                    €{finalPrice.toFixed(2).replace('.', ',')}
                  </p>
                )}
                <button
                  onClick={() => { addItem(p as Product); }}
                  className="w-full h-6 bg-[#00D4FF] text-[#0A0A0A] text-[10px] font-bold rounded-lg flex items-center justify-center gap-1 active:scale-95 transition-transform"
                >
                  <ShoppingBag size={10} />
                  Aggiungi
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, setQty, totalPrice, totalItems } = useCart();

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/70 z-50 backdrop-blur-sm" onClick={closeCart} />

      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl max-h-[80vh] flex flex-col animate-slide-up"
        style={{ background: 'var(--th-card)' }}
      >
        {/* Header */}
        <div
          className="flex-shrink-0 px-4 pt-3 pb-3 border-b"
          style={{ borderColor: 'var(--th-border)' }}
        >
          <div className="flex justify-center mb-3">
            <div className="w-10 h-1 rounded-full" style={{ background: 'var(--th-border)' }} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag size={18} className="text-[#00D4FF]" />
              <span className="font-bold text-sm" style={{ color: 'var(--th-text)' }}>Il tuo carrello</span>
              {totalItems > 0 && (
                <span className="bg-[#00D4FF] text-[#0A0A0A] text-[10px] font-black min-w-[20px] h-5 rounded-full flex items-center justify-center px-1.5">
                  {totalItems}
                </span>
              )}
            </div>
            <button
              onClick={closeCart}
              className="w-8 h-8 flex items-center justify-center rounded-full"
              style={{ background: 'var(--th-input)', color: 'var(--th-muted)' }}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-3 space-y-2.5">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16" style={{ color: 'var(--th-faint)' }}>
                <ShoppingBag size={42} className="mb-3 opacity-25" />
                <p className="text-sm">Carrello vuoto</p>
              </div>
            ) : (
              items.map((item) => {
                const key = item.product.id ?? item.product.title;
                return (
                  <div key={key} className="flex gap-3 rounded-xl p-2.5" style={{ background: 'var(--th-input)' }}>
                    <img
                      src={item.product.thumbnailImage || '/placeholder.svg'}
                      alt={item.product.title}
                      className="w-14 h-14 rounded-lg object-contain flex-shrink-0 p-1"
                      style={{ background: 'var(--th-card)' }}
                      loading="lazy"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium line-clamp-2 leading-snug mb-1" style={{ color: 'var(--th-muted)' }}>
                        {item.product.title}
                      </p>
                      <p className="text-sm font-black text-[#00D4FF]">
                        €{(item.finalPrice * item.quantity).toFixed(2).replace('.', ',')}
                      </p>

                      <div className="flex items-center gap-2 mt-1.5">
                        <button
                          onClick={() => setQty(key, item.quantity - 1)}
                          className="w-6 h-6 rounded-full border text-base leading-none flex items-center justify-center"
                          style={{ background: 'var(--th-card)', borderColor: 'var(--th-border)', color: 'var(--th-text)' }}
                        >−</button>
                        <span className="text-sm font-medium w-4 text-center" style={{ color: 'var(--th-text)' }}>
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => setQty(key, item.quantity + 1)}
                          className="w-6 h-6 rounded-full border text-base leading-none flex items-center justify-center"
                          style={{ background: 'var(--th-card)', borderColor: 'var(--th-border)', color: 'var(--th-text)' }}
                        >+</button>
                        <button
                          onClick={() => removeItem(key)}
                          className="ml-auto active:text-red-400 transition-colors"
                          style={{ color: 'var(--th-faint)' }}
                          aria-label="Rimuovi"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Cross-sell section — solo se ci sono prodotti nel carrello */}
          {items.length > 0 && <CrossSellSection cartItems={items} />}
        </div>

        {/* Footer totale */}
        {items.length > 0 && (
          <div
            className="flex-shrink-0 px-4 pt-3 pb-6 border-t"
            style={{ background: 'var(--th-card)', borderColor: 'var(--th-border)' }}
          >
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm" style={{ color: 'var(--th-muted)' }}>Totale ordine</span>
              <span className="text-xl font-black" style={{ color: 'var(--th-text)' }}>
                €{totalPrice.toFixed(2).replace('.', ',')}
              </span>
            </div>
            <Link
              href="/checkout"
              onClick={closeCart}
              className="flex items-center justify-center gap-2 w-full h-12 bg-[#00D4FF] text-[#0A0A0A] font-bold rounded-2xl active:scale-95 transition-transform text-sm"
            >
              Vai al Checkout
              <ArrowRight size={17} />
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
