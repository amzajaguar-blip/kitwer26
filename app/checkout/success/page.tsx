'use client';

import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { ShieldCheck, Home, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface OrderItem {
  product_title:     string;
  quantity:          number;
  price_at_purchase: number;
}

interface Order {
  id:              string;
  status:          string;
  total_amount:    number;
  customer_name:   string;
  customer_email:  string | null;
  order_items:     OrderItem[];
}

// ── Spinner di attesa ─────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
        <p className="font-mono text-xs text-th-subtle uppercase tracking-widest animate-pulse">
          // Verifica protocollo...
        </p>
      </div>
    </div>
  );
}

// ── Contenuto principale ──────────────────────────────────────────────────────
function SuccessContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const orderId      = searchParams.get('order');

  const [order,   setOrder]   = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      setTimeout(() => setVisible(true), 80);
      return;
    }

    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    const fetchOrder = async () => {
      try {
        const { data } = await supabase
          .from('orders')
          .select('id, status, total_amount, customer_name, customer_email, order_items(*)')
          .eq('id', orderId)
          .single();

        if (cancelled) return;

        if (data) {
          // Pagamento annullato/fallito → error page
          if (data.status === 'cancelled' || data.status === 'stripe_error' || data.status === 'payment_aborted') {
            router.replace(`/checkout/error?order=${orderId}`);
            return;
          }
          setOrder(data as Order);
        }

        // Mostra subito la pagina (anche se pending — il webhook Stripe arriverà a breve)
        setLoading(false);
        setTimeout(() => { if (!cancelled) setVisible(true); }, 80);

        // Polling in background finché non arriva 'confirmed' dal webhook Stripe
        if (data && data.status !== 'confirmed') {
          let attempts = 0;
          const poll = async () => {
            if (cancelled || attempts >= 8) return;
            attempts++;
            const { data: updated } = await supabase
              .from('orders')
              .select('id, status, total_amount, customer_name, customer_email, order_items(*)')
              .eq('id', orderId)
              .single();
            if (cancelled) return;
            if (updated) {
              if (updated.status === 'cancelled' || updated.status === 'stripe_error' || updated.status === 'payment_aborted') {
                router.replace(`/checkout/error?order=${orderId}`);
                return;
              }
              setOrder(updated as Order);
              if (updated.status === 'confirmed') return;
            }
            pollTimer = setTimeout(poll, 3000);
          };
          pollTimer = setTimeout(poll, 2000);
        }
      } catch {
        if (!cancelled) {
          setLoading(false);
          setTimeout(() => { if (!cancelled) setVisible(true); }, 80);
        }
      }
    };

    fetchOrder();

    return () => {
      cancelled = true;
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [orderId, router]);

  if (loading) return <Spinner />;

  const isConfirmed = order?.status === 'confirmed';
  const shortId     = order ? String(order.id).slice(0, 8).toUpperCase() : '——';

  return (
    <div className="min-h-screen bg-[#030712] flex flex-col items-center justify-center p-4 overflow-hidden">
      {/* Blueprint grid di sfondo */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(34,211,238,1) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Glow ciano centrale */}
      <div
        className="pointer-events-none fixed top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] blur-[120px] opacity-20"
        style={{ background: 'radial-gradient(ellipse, #22d3ee 0%, transparent 70%)' }}
      />

      <div
        className={`relative max-w-md w-full transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
      >
        {/* ── Icona animata ── */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            {/* Glow ring */}
            <div
              className="absolute inset-0 rounded-full blur-xl opacity-60 animate-pulse"
              style={{ background: 'radial-gradient(circle, #22d3ee 0%, transparent 70%)', transform: 'scale(1.8)' }}
            />
            <div className="relative w-24 h-24 rounded-full border border-cyan-500/30 bg-cyan-500/5 flex items-center justify-center">
              <ShieldCheck
                size={52}
                strokeWidth={1.5}
                className={`text-cyan-400 transition-all duration-1000 ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}
                style={{ filter: 'drop-shadow(0 0 12px rgba(34,211,238,0.8))' }}
              />
            </div>
          </div>
        </div>

        {/* ── Status badge ── */}
        <div className="flex justify-center mb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm border border-cyan-500/30 bg-cyan-500/5">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-mono text-[10px] tracking-[0.25em] text-cyan-400 uppercase">
              {isConfirmed ? 'Protocollo Confermato' : 'Pagamento Ricevuto'}
            </span>
          </div>
        </div>

        {/* ── Titolo tattico ── */}
        <h1
          className="text-center font-mono font-extrabold text-2xl sm:text-3xl text-white mb-2 leading-tight"
          style={{ textShadow: '0 0 20px rgba(34,211,238,0.3)' }}
        >
          PROTOCOLLO ATTIVATO
        </h1>
        <p className="text-center font-mono text-sm text-cyan-400 mb-2 tracking-widest uppercase">
          Ordine Confermato
        </p>
        <p className="text-center text-sm text-th-subtle font-sans leading-relaxed mb-8 px-2">
          I tuoi asset tattici sono in fase di preparazione.
          Riceverai il tracking crittografato via email a breve.
        </p>

        {/* ── Riepilogo ordine ── */}
        {order && (
          <div className="rounded-sm border border-zinc-800 bg-zinc-900/60 backdrop-blur-sm mb-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900">
              <span className="font-mono text-[10px] text-th-subtle uppercase tracking-widest">
                // ID Operazione
              </span>
              <span className="font-mono text-sm font-bold text-cyan-400">
                {shortId}
              </span>
            </div>

            {/* Prodotti */}
            {order.order_items?.length > 0 && (
              <div className="px-4 py-3 space-y-2">
                <p className="font-mono text-[9px] text-th-subtle uppercase tracking-[0.2em] mb-2">
                  Asset acquisiti
                </p>
                {order.order_items.map((item, i) => (
                  <div key={i} className="flex items-start justify-between gap-3">
                    <p className="text-xs text-th-subtle font-sans flex-1 leading-snug line-clamp-2">
                      {item.product_title}
                      {item.quantity > 1 && (
                        <span className="text-th-subtle ml-1">×{item.quantity}</span>
                      )}
                    </p>
                    <span className="font-mono text-xs text-cyan-400 shrink-0 font-semibold">
                      €{(item.price_at_purchase).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Totale */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800">
              <span className="font-mono text-[10px] text-th-subtle uppercase tracking-widest">
                Valore fornitura
              </span>
              <span
                className="font-mono font-extrabold text-xl text-cyan-400"
                style={{ textShadow: '0 0 10px rgba(34,211,238,0.5)' }}
              >
                €{order.total_amount.toFixed(2).replace('.', ',')}
              </span>
            </div>
          </div>
        )}

        {/* ── Info cliente + email inviata ── */}
        {order?.customer_email && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-sm border border-zinc-800 bg-zinc-900/40 mb-3">
            <span className="font-mono text-[9px] text-th-subtle uppercase tracking-widest shrink-0">Email:</span>
            <span className="font-mono text-xs text-th-subtle truncate">{order.customer_email}</span>
          </div>
        )}

        {/* ── Stato pagamento ── */}
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-sm border border-cyan-500/20 bg-cyan-500/5 mb-6">
          <span className="text-cyan-400 text-xs mt-0.5">✦</span>
          <p className="font-mono text-[11px] text-cyan-500 leading-relaxed">
            {isConfirmed
              ? 'Ordine confermato. Il team operativo ha ricevuto l\'istruzione di dispacciamento.'
              : 'Pagamento ricevuto con successo. Riceverai la conferma via email a breve.'
            }
          </p>
        </div>

        {/* ── CTA ── */}
        <Link
          href="/"
          className="w-full h-14 flex items-center justify-center gap-2.5 font-mono font-bold text-sm tracking-widest uppercase text-black bg-cyan-400 hover:bg-cyan-300 active:scale-95 transition-all rounded-sm"
          style={{ boxShadow: '0 0 24px rgba(34,211,238,0.4), 0 0 48px rgba(34,211,238,0.15)' }}
        >
          <Home size={16} />
          Torna al Centro di Comando
          <ArrowRight size={14} />
        </Link>

        <p className="text-center font-mono text-[9px] text-th-subtle mt-4 uppercase tracking-widest">
          // Stay secure. Stay tactical. — Team Kitwer26
        </p>
      </div>
    </div>
  );
}

// ── Export con Suspense boundary ─────────────────────────────────────────────
export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <SuccessContent />
    </Suspense>
  );
}
