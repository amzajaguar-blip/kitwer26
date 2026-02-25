'use client'

import { useCart } from '@/app/context/CartContext'
import { X, ShoppingCart, Trash2, Plus, Minus, ArrowRight, Package, Truck } from 'lucide-react'

export default function CartDrawer() {
  const { items, itemCount, total, isDrawerOpen, closeDrawer, removeItem, updateQty } = useCart()

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          isDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeDrawer}
        aria-hidden
      />

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 z-[70] flex h-full w-full max-w-[420px] flex-col shadow-2xl transition-transform duration-300 ease-in-out ${
          isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ background: 'var(--bg-card, #1a1a24)' }}
        role="dialog"
        aria-label="Carrello"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2.5">
            <ShoppingCart className="h-5 w-5 text-accent" />
            <h2 className="text-base font-bold text-text-primary">Il tuo Carrello</h2>
            {itemCount > 0 && (
              <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-bg-dark">
                {itemCount}
              </span>
            )}
          </div>
          <button
            onClick={closeDrawer}
            className="rounded-lg p-2 text-text-secondary transition hover:bg-bg-hover hover:text-text-primary"
            aria-label="Chiudi carrello"
          >
            <X size={20} />
          </button>
        </div>

        {/* Shipping note — always visible */}
        <div className="border-b border-border px-5 py-3">
          <div className="flex items-start gap-2.5 rounded-xl border border-neon-green/25 bg-neon-green/8 px-4 py-2.5">
            <Truck className="mt-0.5 h-4 w-4 shrink-0 text-neon-green" />
            <div>
              <p className="text-xs font-semibold text-neon-green">
                Spedizione Standard Assicurata: 7–14 giorni lavorativi
              </p>
              <p className="mt-0.5 text-[11px] text-text-secondary">
                Controllo qualità incluso prima della partenza
              </p>
            </div>
          </div>
        </div>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-20 text-center px-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-bg-dark">
                <Package className="h-8 w-8 text-text-secondary/40" />
              </div>
              <div>
                <p className="font-semibold text-text-primary">Carrello vuoto</p>
                <p className="mt-1 text-sm text-text-secondary">
                  Aggiungi prodotti per iniziare il tuo setup gaming
                </p>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((item) => (
                <li key={item.id} className="flex gap-4 px-5 py-4">
                  {/* Thumbnail */}
                  <div className="h-[70px] w-[70px] flex-shrink-0 overflow-hidden rounded-xl border border-border bg-bg-dark">
                    {item.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="h-full w-full object-contain p-2"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-2xl">🎮</div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-text-primary">{item.title}</p>
                    <p className="mt-0.5 text-sm font-bold text-accent">
                      {(item.price * item.quantity).toFixed(2)}€
                    </p>
                    {item.quantity > 1 && (
                      <p className="text-[11px] text-text-secondary">{item.price.toFixed(2)}€ × {item.quantity}</p>
                    )}

                    {/* Qty controls */}
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (item.quantity === 1) removeItem(item.id)
                          else updateQty(item.id, item.quantity - 1)
                        }}
                        className="flex h-6 w-6 items-center justify-center rounded-md border border-border text-text-secondary transition hover:border-accent hover:text-accent"
                        aria-label="Diminuisci quantità"
                      >
                        <Minus size={11} />
                      </button>
                      <span className="w-6 text-center text-sm font-bold text-text-primary">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQty(item.id, item.quantity + 1)}
                        className="flex h-6 w-6 items-center justify-center rounded-md border border-border text-text-secondary transition hover:border-accent hover:text-accent"
                        aria-label="Aumenta quantità"
                      >
                        <Plus size={11} />
                      </button>
                    </div>
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => removeItem(item.id)}
                    className="self-start rounded-lg p-1.5 text-text-secondary/50 transition hover:text-red-400"
                    aria-label={`Rimuovi ${item.title}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer — checkout */}
        {items.length > 0 && (
          <div className="border-t border-border px-5 py-5" style={{ background: 'var(--bg-dark, #12121a)' }}>
            {/* Totale */}
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary">
                  Subtotale <span className="text-text-primary">({itemCount} {itemCount === 1 ? 'articolo' : 'articoli'})</span>
                </p>
                <p className="text-[11px] text-text-secondary/60">Spedizione calcolata al checkout</p>
              </div>
              <span className="text-2xl font-bold text-accent">{total.toFixed(2)}€</span>
            </div>

            {/* CTA Checkout */}
            <a
              href="/checkout"
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 py-4 text-base font-bold text-bg-dark shadow-lg shadow-accent/25 transition-all hover:bg-accent-hover hover:shadow-accent/40 active:scale-[0.98]"
              onClick={closeDrawer}
            >
              Vai al Checkout
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
            </a>

            <p className="mt-3 text-center text-[11px] text-text-secondary/60">
              Pagamento sicuro via Mollie · SSL 256-bit
            </p>
          </div>
        )}
      </div>
    </>
  )
}
