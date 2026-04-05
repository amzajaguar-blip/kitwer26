'use client';

import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, useRef, Suspense } from 'react';
import { ShieldAlert, RotateCcw, Home } from 'lucide-react';

// ── Countdown 15 minuti ───────────────────────────────────────────────────────
const RESERVE_SECONDS = 15 * 60; // 15 min

function useCountdown(startSeconds: number) {
  const [secs, setSecs] = useState(startSeconds);
  const ref             = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    ref.current = setInterval(() => {
      setSecs((s) => {
        if (s <= 1) { clearInterval(ref.current!); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, []);

  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');
  return { display: `${mm}:${ss}`, expired: secs === 0 };
}

// ── Spinner ────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
    </div>
  );
}

// ── Contenuto pagina errore ───────────────────────────────────────────────────
function ErrorContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const orderId      = searchParams.get('order');

  const [visible, setVisible] = useState(false);
  const { display: countdown, expired } = useCountdown(RESERVE_SECONDS);

  useEffect(() => {
    setTimeout(() => setVisible(true), 80);
  }, []);

  const handleRetry = () => {
    // Riporta alla home: il carrello è stato svuotato al momento del checkout,
    // l'utente può riaggiungere i prodotti dal bundle tattico.
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-[#030712] flex flex-col items-center justify-center p-4 overflow-hidden">
      {/* Blueprint grid di sfondo */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(239,68,68,1) 1px, transparent 1px), linear-gradient(90deg, rgba(239,68,68,1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Glow rosso centrale */}
      <div
        className="pointer-events-none fixed top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[260px] blur-[120px] opacity-15"
        style={{ background: 'radial-gradient(ellipse, #ef4444 0%, transparent 70%)' }}
      />

      <div
        className={`relative max-w-md w-full transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
      >
        {/* ── Icona animata ── */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div
              className="absolute inset-0 rounded-full blur-xl opacity-50 animate-pulse"
              style={{ background: 'radial-gradient(circle, #ef4444 0%, transparent 70%)', transform: 'scale(1.8)' }}
            />
            <div className="relative w-24 h-24 rounded-full border border-red-500/30 bg-red-500/5 flex items-center justify-center">
              <ShieldAlert
                size={52}
                strokeWidth={1.5}
                className="text-red-400 animate-pulse"
                style={{ filter: 'drop-shadow(0 0 12px rgba(239,68,68,0.8))' }}
              />
            </div>
          </div>
        </div>

        {/* ── Status badge di emergenza ── */}
        <div className="flex justify-center mb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm border border-red-500/40 bg-red-500/5">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-ping" />
            <span className="font-mono text-[10px] tracking-[0.25em] text-red-400 uppercase">
              Protocollo Interrotto
            </span>
          </div>
        </div>

        {/* ── Titolo tattico ── */}
        <h1
          className="text-center font-mono font-extrabold text-xl sm:text-2xl text-white mb-1 leading-tight px-2"
          style={{ textShadow: '0 0 20px rgba(239,68,68,0.3)' }}
        >
          TRANSAZIONE INTERROTTA
        </h1>
        <p className="text-center font-mono text-xs text-red-400 mb-3 tracking-[0.2em] uppercase">
          Protocollo in Sospeso
        </p>
        <p className="text-center text-sm text-th-subtle font-sans leading-relaxed mb-6 px-2">
          Il pagamento non è andato a buon fine. Il tuo Bundle Tattico
          è riservato per i prossimi 15 minuti prima di essere riassegnato.
        </p>

        {/* ── Countdown scarcity ── */}
        <div className="rounded-sm border border-amber-500/30 bg-amber-500/5 px-4 py-4 mb-6">
          <p className="font-mono text-[9px] text-amber-500/70 uppercase tracking-[0.2em] mb-2 text-center">
            // Riserva bundle scade tra
          </p>
          <div className="flex items-center justify-center gap-3">
            <span
              className={`font-mono font-extrabold text-4xl tabular-nums tracking-widest ${expired ? 'text-red-500' : 'text-amber-400'}`}
              style={expired ? {} : { textShadow: '0 0 16px rgba(245,158,11,0.6)' }}
            >
              {expired ? 'SCADUTO' : countdown}
            </span>
          </div>
          {expired && (
            <p className="font-mono text-[10px] text-red-400 text-center mt-2">
              ⚠ Riserva scaduta — riassegnazione in corso
            </p>
          )}
        </div>

        {/* ── ID ordine se disponibile ── */}
        {orderId && (
          <div className="flex items-center justify-between px-4 py-2.5 rounded-sm border border-zinc-800 bg-zinc-900/40 mb-4">
            <span className="font-mono text-[9px] text-th-subtle uppercase tracking-widest">ID Operazione</span>
            <span className="font-mono text-xs text-th-subtle">{String(orderId).slice(0, 8).toUpperCase()}</span>
          </div>
        )}

        {/* ── CTA primario: RIPROVA ── */}
        <button
          onClick={handleRetry}
          className="w-full h-14 flex items-center justify-center gap-2.5 font-mono font-bold text-sm tracking-widest uppercase text-white bg-red-500 hover:bg-red-400 active:scale-95 transition-all rounded-sm mb-3"
          style={{ boxShadow: '0 0 24px rgba(239,68,68,0.45), 0 0 48px rgba(239,68,68,0.15)' }}
        >
          <RotateCcw size={16} />
          Riprova il Pagamento
        </button>

        {/* ── CTA secondario: Home ── */}
        <Link
          href="/"
          className="w-full h-11 flex items-center justify-center gap-2 font-mono text-xs tracking-widest uppercase text-th-subtle border border-zinc-800 hover:border-zinc-600 hover:text-white active:scale-95 transition-all rounded-sm"
        >
          <Home size={13} />
          Torna allo shop
        </Link>

        <p className="text-center font-mono text-[9px] text-th-subtle mt-6 uppercase tracking-widest leading-relaxed">
          // Problemi ricorrenti? Contatta support@kitwer26.com
        </p>
      </div>
    </div>
  );
}

// ── Export con Suspense boundary ─────────────────────────────────────────────
export default function CheckoutErrorPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <ErrorContent />
    </Suspense>
  );
}
