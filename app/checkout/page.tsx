'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useIntl } from '@/context/InternationalizationContext';

interface ShippingForm {
  name: string;
  surname: string;
  address: string;
  cap: string;
  city: string;
  phone: string;
  email: string;
}

function Field({
  label,
  value,
  onChange,
  required,
  type = 'text',
  inputMode,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--th-faint)' }}>
        {label}
        {required && <span className="text-[#00D4FF] ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        inputMode={inputMode}
        placeholder={placeholder}
        className="h-11 px-3.5 rounded-xl border text-sm transition-colors focus:outline-none focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF]/30"
        style={{
          background: 'var(--th-input)',
          color: 'var(--th-text)',
          borderColor: 'var(--th-border)',
        }}
      />
    </div>
  );
}

export default function CheckoutPage() {
  const { items, totalPrice, clearCart } = useCart();
  const { locale } = useIntl();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]       = useState(false);
  const [error, setError]           = useState('');

  const [form, setForm] = useState<ShippingForm>({
    name: '', surname: '', address: '', cap: '', city: '', phone: '', email: '',
  });

  const set = (key: keyof ShippingForm) => (v: string) =>
    setForm((f) => ({ ...f, [key]: v }));

  if (items.length === 0 && !success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" style={{ background: 'var(--th-bg)' }}>
        <p className="mb-6 text-sm" style={{ color: 'var(--th-muted)' }}>Il carrello è vuoto.</p>
        <Link
          href="/"
          className="px-6 h-11 rounded-xl border flex items-center gap-2 text-sm"
          style={{ background: 'var(--th-card)', color: 'var(--th-text)', borderColor: 'var(--th-border)' }}
        >
          <ArrowLeft size={16} />
          Torna allo shop
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" style={{ background: 'var(--th-bg)' }}>
        <CheckCircle size={64} className="text-[#00FF94] mb-6" strokeWidth={1.5} />
        <h1 className="text-2xl font-black mb-2" style={{ color: 'var(--th-text)' }}>Ordine Confermato!</h1>
        <p className="text-sm mb-8 max-w-xs" style={{ color: 'var(--th-muted)' }}>
          Grazie per il tuo acquisto. Ti contatteremo presto al numero fornito per confermare la spedizione.
        </p>
        <Link
          href="/"
          className="px-8 h-12 bg-[#00D4FF] text-[#0A0A0A] font-bold rounded-2xl flex items-center gap-2 active:scale-95 transition-transform"
        >
          Continua lo shopping
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: form,
          items: items.map((i) => ({
            product_id:        i.product.id ?? null,
            product_title:     i.product.title,
            product_variant:   i.product.variantAttributes ?? null,
            quantity:          i.quantity,
            price_at_purchase: i.finalPrice,
          })),
          total_amount:     totalPrice,
          customer_country: locale.marketplace,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Errore server');
      }

      clearCart();
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Errore durante l'invio. Riprova.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--th-bg)' }}>
      {/* Header */}
      <div
        className="fixed top-0 left-0 right-0 z-40 h-16 flex items-center px-4 border-b backdrop-blur-sm"
        style={{ background: 'var(--th-bg)', borderColor: 'var(--th-border)' }}
      >
        <Link href="/" className="p-1 -ml-1" style={{ color: 'var(--th-muted)' }}>
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-sm font-bold ml-3" style={{ color: 'var(--th-text)' }}>Checkout</h1>
      </div>

      <div className="pt-16 pb-10">
        {/* Riepilogo */}
        <div className="border-b px-4 py-4" style={{ background: 'var(--th-card)', borderColor: 'var(--th-border)' }}>
          <p className="text-[10px] uppercase tracking-widest font-bold mb-3" style={{ color: 'var(--th-faint)' }}>
            Riepilogo ordine ({items.length} {items.length === 1 ? 'prodotto' : 'prodotti'})
          </p>
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.product.id ?? item.product.title} className="flex justify-between items-center">
                <span className="text-xs flex-1 mr-3 line-clamp-1" style={{ color: 'var(--th-muted)' }}>
                  {item.product.title}
                  {item.product.variantAttributes ? ` — ${item.product.variantAttributes}` : ''}
                  {item.quantity > 1 && (
                    <span style={{ color: 'var(--th-faint)' }}> ×{item.quantity}</span>
                  )}
                </span>
                <span className="text-xs font-bold text-[#00D4FF] flex-shrink-0">
                  €{(item.finalPrice * item.quantity).toFixed(2).replace('.', ',')}
                </span>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center mt-3 pt-3 border-t" style={{ borderColor: 'var(--th-border)' }}>
            <span className="text-sm font-semibold" style={{ color: 'var(--th-text)' }}>Totale</span>
            <span className="text-lg font-black text-[#00D4FF]">
              €{totalPrice.toFixed(2).replace('.', ',')}
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-4 py-6 space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--th-text)' }}>
            Dati di Spedizione
          </p>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Nome"    value={form.name}    onChange={set('name')}    required placeholder="Mario" />
            <Field label="Cognome" value={form.surname} onChange={set('surname')} required placeholder="Rossi" />
          </div>

          <Field label="Indirizzo completo" value={form.address} onChange={set('address')} required placeholder="Via Roma 1, Interno 3" />

          <div className="grid grid-cols-2 gap-3">
            <Field label="CAP"    value={form.cap}  onChange={set('cap')}  required inputMode="numeric" placeholder="00100" />
            <Field label="Città"  value={form.city} onChange={set('city')} required placeholder="Roma" />
          </div>

          <Field label="Cellulare"         value={form.phone} onChange={set('phone')} required type="tel" inputMode="tel" placeholder="+39 333 1234567" />
          <Field label="Email (opzionale)" value={form.email} onChange={set('email')} type="email" placeholder="mario@email.com" />

          {error && (
            <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-14 bg-[#00D4FF] text-[#0A0A0A] font-black text-sm rounded-2xl mt-2 active:scale-95 transition-transform disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Invio in corso...
              </>
            ) : (
              `Conferma Ordine — €${totalPrice.toFixed(2).replace('.', ',')}`
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
