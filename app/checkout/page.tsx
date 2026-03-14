'use client';

import { Suspense, useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CreditCard, ShieldCheck, Truck } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useIntl } from '@/context/InternationalizationContext';

// ── Tipi ──────────────────────────────────────────────────────────────────────
interface ShippingForm {
  name:     string;
  surname:  string;
  email:    string;
  phone:    string;
  address:  string;
  cap:      string;
  city:     string;
  province: string;
}

const EMPTY: ShippingForm = {
  name: '', surname: '', email: '', phone: '',
  address: '', cap: '', city: '', province: '',
};

// ── Componente Field ──────────────────────────────────────────────────────────
function Field({
  label, value, onChange, required = true, type = 'text',
  inputMode, placeholder, pattern, maxLength,
}: {
  label: string; value: string; onChange: (v: string) => void;
  required?: boolean; type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  placeholder?: string; pattern?: string; maxLength?: number;
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
        pattern={pattern}
        maxLength={maxLength}
        autoComplete={type === 'email' ? 'email' : undefined}
        className="h-11 px-3.5 rounded-xl border text-sm transition-colors focus:outline-none focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF]/30"
        style={{ background: 'var(--th-input)', color: 'var(--th-text)', borderColor: 'var(--th-border)' }}
      />
    </div>
  );
}

// ── Checkout Form (inner — usa useSearchParams) ───────────────────────────────
function CheckoutForm() {
  const searchParams = useSearchParams();
  const { locale }   = useIntl();
  const { items: cartItems, totalPrice: cartTotal, clearCart } = useCart();

  // ── Modalità: prodotto singolo (da ProductDrawer) o carrello ──────────────
  const pid      = searchParams.get('pid')   ?? '';
  const pname    = searchParams.get('pname') ?? '';
  const priceRaw = parseFloat(searchParams.get('price') ?? '0');
  const currency = (searchParams.get('currency') ?? 'EUR') as 'EUR' | 'GBP' | 'USD';
  const loc      = searchParams.get('loc')   ?? locale.marketplace;

  const isSingleProduct = !!pname && !isNaN(priceRaw) && priceRaw > 0;

  // In modalità carrello usa gli item esistenti
  const items = isSingleProduct
    ? [{ productId: pid || null, productName: pname, finalPrice: priceRaw, quantity: 1 }]
    : cartItems.map((i) => ({
        productId:   String(i.product.id ?? ''),
        productName: i.product.title ?? i.product.name ?? '',
        finalPrice:  i.finalPrice,
        quantity:    i.quantity,
      }));

  const total = isSingleProduct
    ? priceRaw
    : cartTotal;

  // ── Form state ─────────────────────────────────────────────────────────────
  const [form, setForm] = useState<ShippingForm>(EMPTY);
  const set = (k: keyof ShippingForm) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');

  // ── Validazione (tutto obbligatorio, email formato base) ──────────────────
  const isValid = useMemo(() => {
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
    const capOk   = /^\d{5}$/.test(form.cap.trim());
    return (
      form.name.trim()     &&
      form.surname.trim()  &&
      emailOk              &&
      form.phone.trim()    &&
      form.address.trim()  &&
      capOk                &&
      form.city.trim()     &&
      form.province.trim().length >= 2
    );
  }, [form]);

  // ── Carrello vuoto e non in modalità prodotto singolo ─────────────────────
  if (!isSingleProduct && cartItems.length === 0) {
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

  // ── Submit → Supabase → Mollie ─────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Prodotto principale (per Mollie description)
          productId:          items[0]?.productId ?? null,
          productName:        items.length === 1
            ? items[0].productName
            : `Ordine Kitwer26 (${items.length} articoli)`,
          finalPrice:         total,
          quantity:           1,
          currency,
          marketplace_locale: loc,
          // Dati spedizione cliente
          customer: {
            name:     form.name.trim(),
            surname:  form.surname.trim(),
            email:    form.email.trim(),
            phone:    form.phone.trim(),
            address:  form.address.trim(),
            cap:      form.cap.trim(),
            city:     form.city.trim(),
            province: form.province.trim().toUpperCase(),
          },
          // Tutti gli item del carrello (salvati in order_items)
          cartItems: items,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore server');

      // Se siamo in modalità carrello, svuotiamo il carrello
      if (!isSingleProduct) clearCart();

      // Redirect a Mollie
      window.location.href = data.checkoutUrl;

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Errore durante l'avvio del pagamento. Riprova.");
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
        <button
          onClick={() => window.history.back()}
          className="p-1 -ml-1"
          style={{ color: 'var(--th-muted)' }}
          aria-label="Indietro"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-sm font-bold ml-3" style={{ color: 'var(--th-text)' }}>
          Checkout Sicuro
        </h1>
        <ShieldCheck size={14} className="ml-1.5 text-[#00FF94]" />
      </div>

      <div className="pt-16 pb-24">
        {/* ── Riepilogo ordine ── */}
        <div
          className="border-b px-4 py-4"
          style={{ background: 'var(--th-card)', borderColor: 'var(--th-border)' }}
        >
          <p className="text-[10px] uppercase tracking-widest font-bold mb-3" style={{ color: 'var(--th-faint)' }}>
            Riepilogo ordine ({items.length} {items.length === 1 ? 'prodotto' : 'prodotti'})
          </p>
          <div className="space-y-2">
            {items.map((item, i) => (
              <div key={i} className="flex justify-between items-center">
                <span className="text-xs flex-1 mr-3 line-clamp-1" style={{ color: 'var(--th-muted)' }}>
                  {item.productName}
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
              €{total.toFixed(2).replace('.', ',')}
            </span>
          </div>
        </div>

        {/* ── Form spedizione ── */}
        <form onSubmit={handleSubmit} className="px-4 py-6 space-y-4">

          <div className="flex items-center gap-2 mb-1">
            <Truck size={14} style={{ color: 'var(--th-faint)' }} />
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--th-text)' }}>
              Dati di Spedizione
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Nome"    value={form.name}    onChange={set('name')}    placeholder="Mario" />
            <Field label="Cognome" value={form.surname} onChange={set('surname')} placeholder="Rossi" />
          </div>

          <Field
            label="Email"
            value={form.email}
            onChange={set('email')}
            type="email"
            inputMode="email"
            placeholder="mario@email.com"
          />

          <Field
            label="Cellulare"
            value={form.phone}
            onChange={set('phone')}
            type="tel"
            inputMode="tel"
            placeholder="+39 333 1234567"
          />

          <Field
            label="Via / Piazza e numero civico"
            value={form.address}
            onChange={set('address')}
            placeholder="Via Roma 1, interno 3"
          />

          <div className="grid grid-cols-2 gap-3">
            <Field
              label="CAP"
              value={form.cap}
              onChange={set('cap')}
              inputMode="numeric"
              placeholder="00100"
              maxLength={5}
            />
            <Field label="Città" value={form.city} onChange={set('city')} placeholder="Roma" />
          </div>

          <Field
            label="Provincia (es. RM)"
            value={form.province}
            onChange={set('province')}
            placeholder="RM"
            maxLength={2}
          />

          {error && (
            <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          {/* Badge info */}
          <p className="text-[11px] text-center" style={{ color: 'var(--th-faint)' }}>
            I tuoi dati saranno utilizzati esclusivamente per la spedizione.
          </p>
        </form>
      </div>

      {/* ── Footer CTA fisso ── */}
      <div
        className="fixed bottom-0 left-0 right-0 px-4 py-4 border-t backdrop-blur-sm"
        style={{ background: 'var(--th-card)', borderColor: 'var(--th-border)' }}
      >
        <button
          onClick={handleSubmit as unknown as React.MouseEventHandler}
          disabled={!isValid || submitting}
          className="w-full h-14 bg-orange-500 hover:bg-orange-400 text-black font-black text-sm rounded-2xl active:scale-95 transition-all hover:shadow-[0_0_20px_rgba(249,115,22,0.4)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Reindirizzamento a Mollie...
            </>
          ) : (
            <>
              <CreditCard size={18} />
              Paga €{total.toFixed(2).replace('.', ',')} con Mollie
            </>
          )}
        </button>
        <p className="text-[10px] text-center mt-2" style={{ color: 'var(--th-faint)' }}>
          Pagamento sicuro gestito da Mollie · SSL
        </p>
      </div>
    </div>
  );
}

// ── Export page — Suspense boundary per useSearchParams ───────────────────────
export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--th-bg)' }}>
          <div className="w-8 h-8 border-2 border-[#00D4FF] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CheckoutForm />
    </Suspense>
  );
}
