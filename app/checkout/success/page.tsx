'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { CheckCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Order {
  id: string;
  status: string;
  total_amount: number;
  customer_name: string;
  customer_email: string | null;
  order_items: Array<{
    product_title: string;
    quantity: number;
    price_at_purchase: number;
  }>;
}

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order');
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!orderId) {
      setError('Ordine non trovato');
      setLoading(false);
      return;
    }

    const loadOrder = async () => {
      try {
        const { data, error: err } = await supabase
          .from('orders')
          .select('id, status, total_amount, customer_name, customer_email, order_items(*)')
          .eq('id', orderId)
          .single();

        if (err) throw err;
        setOrder(data as Order);
      } catch (err) {
        console.error('Errore caricamento ordine:', err);
        setError('Non è stato possibile caricare i dettagli dell\'ordine');
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0A0A0A] to-[#1A1A1A] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#00D4FF] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Caricamento ordine...</p>
        </div>
      </div>
    );
  }


  if (error || !order) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0A0A0A] to-[#1A1A1A] flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <h1 className="text-2xl font-black text-white mb-2">Errore</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 h-11 bg-[#00D4FF] text-[#0A0A0A] font-bold rounded-xl active:scale-95 transition-transform"
          >
            <ArrowLeft size={16} />
            Torna allo shop
          </Link>
        </div>
      </div>
    );
  }

  const isPending = order.status === 'pending_mollie_payment';
  const isConfirmed = order.status === 'confirmed';

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A0A0A] to-[#1A1A1A] flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          {isConfirmed ? (
            <CheckCircle size={80} className="text-[#00FF94]" strokeWidth={1.5} />
          ) : (
            <div className="w-20 h-20 rounded-full bg-[#00D4FF]/10 border-2 border-[#00D4FF] flex items-center justify-center">
              <div className="w-12 h-12 rounded-full border-2 border-[#00D4FF] border-t-transparent animate-spin" />
            </div>
          )}
        </div>

        {/* Titolo */}
        <h1 className="text-center text-3xl font-black text-white mb-2">
          {isConfirmed ? 'Pagamento Confermato!' : 'Pagamento in Elaborazione...'}
        </h1>

        {/* Messaggio */}
        <p className="text-center text-gray-400 mb-8">
          {isConfirmed 
            ? 'Grazie per l\'acquisto. Il tuo ordine è stato confermato e sarà elaborato dalle nostre team.'
            : 'Il pagamento è in fase di elaborazione. Non chiudere questa pagina.'
          }
        </p>

        {/* Dettagli ordine */}
        <div className="bg-[#111111] border border-gray-800 rounded-2xl p-4 mb-6 space-y-3">
          <div className="flex justify-between items-center pb-3 border-b border-gray-800">
            <span className="text-xs text-gray-500 uppercase tracking-wide font-bold">Ordine</span>
            <span className="text-sm font-mono font-bold text-[#00D4FF]">
              {order.id.slice(0, 8).toUpperCase()}...
            </span>
          </div>

          {/* Prodotti */}
          <div className="space-y-2">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-bold">Prodotti</p>
            {order.order_items?.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start gap-3 bg-[#1A1A1A] rounded-lg p-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-200 font-medium line-clamp-2">
                    {item.product_title}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    ×{item.quantity}
                  </p>
                </div>
                <span className="text-xs font-bold text-[#00D4FF] flex-shrink-0">
                  €{(item.price_at_purchase * item.quantity).toFixed(2).replace('.', ',')}
                </span>
              </div>
            ))}
          </div>

          {/* Totale */}
          <div className="flex justify-between items-center pt-3 border-t border-gray-800">
            <span className="text-sm font-bold text-white">Totale</span>
            <span className="text-lg font-black text-[#00D4FF]">
              €{order.total_amount.toFixed(2).replace('.', ',')}
            </span>
          </div>
        </div>

        {/* Info cliente */}
        <div className="bg-[#111111] border border-gray-800 rounded-2xl p-4 mb-8 space-y-2">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-bold mb-2">Contatti</p>
          <p className="text-sm text-white font-medium">{order.customer_name}</p>
          {order.customer_email && (
            <p className="text-xs text-gray-400">{order.customer_email}</p>
          )}
        </div>

        {/* CTA */}
        <div className="space-y-3">
          {isConfirmed ? (
            <div className="p-3 bg-[#00FF94]/10 border border-[#00FF94]/30 rounded-xl">
              <p className="text-xs text-[#00FF94] text-center">
                ✓ Ordine confermato e in elaborazione. Riceverai un'email di conferma a breve.
              </p>
            </div>
          ) : (
            <div className="p-3 bg-[#00D4FF]/10 border border-[#00D4FF]/30 rounded-xl">
              <p className="text-xs text-[#00D4FF] text-center">
                ⏳ Il pagamento è in fase di verifica. Questa pagina si aggiornerà automaticamente.
              </p>
            </div>
          )}

          <Link
            href="/"
            className="w-full h-12 flex items-center justify-center gap-2 bg-[#00D4FF] text-[#0A0A0A] font-bold rounded-xl active:scale-95 transition-transform"
          >
            <ArrowLeft size={16} />
            Torna allo shop
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-[#0A0A0A] to-[#1A1A1A] flex items-center justify-center p-4">
          <div className="w-8 h-8 border-2 border-[#00D4FF] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CheckoutSuccessContent />
    </Suspense>
  );
}
