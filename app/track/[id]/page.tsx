'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface TrackData {
  orderId:            string;
  status:             string;
  customerName:       string;
  amazonTrackingLink: string | null;
  step:               number;
  statusLabel:        string;
  statusColor:        string;
  orderItems:         { product_title?: string; quantity?: number }[];
  mode:               'active' | 'pending';
}

const STEPS = [
  { step: 1, label: 'ORDINE RICEVUTO' },
  { step: 2, label: 'PREPARAZIONE' },
  { step: 3, label: 'IN TRANSITO' },
  { step: 4, label: 'AVVICINAMENTO' },
  { step: 5, label: 'ACQUISITO' },
];

export default function TrackPage() {
  const params  = useParams();
  const orderId = Array.isArray(params.id) ? params.id[0] : (params.id ?? '');

  const [email,    setEmail]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [data,     setData]     = useState<TrackData | null>(null);
  const [booting,  setBooting]  = useState(false); // boot animation

  // Auto-fill email da sessionStorage
  useEffect(() => {
    const saved = sessionStorage.getItem('kitwer_track_email');
    if (saved) setEmail(saved);
  }, []);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res  = await fetch('/api/track', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ orderId, email: email.trim() }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? 'Verifica fallita.');
        return;
      }

      sessionStorage.setItem('kitwer_track_email', email.trim());
      // Boot animation prima di mostrare dati
      setBooting(true);
      setTimeout(() => { setBooting(false); setData(json); }, 1500);
    } catch {
      setError('Errore di connessione. Riprova.');
    } finally {
      setLoading(false);
    }
  }

  // ── Schermata verifica ─────────────────────────────────────────────────────
  if (!data && !booting) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 font-mono">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-1">
            <p className="text-[10px] tracking-[0.3em] text-cyan-400 uppercase">● KITWER OVERWATCH</p>
            <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: '#ff9a3e' }}>
              RADAR TRACKING
            </h1>
            <p className="text-xs text-th-subtle">
              Autenticazione richiesta per accedere al monitoraggio radar.
            </p>
          </div>

          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] tracking-widest text-th-subtle uppercase">ID Ordine</label>
              <div className="h-10 px-3.5 flex items-center border border-zinc-800 bg-zinc-900/30 rounded-sm text-xs text-cyan-400 tracking-wider select-all">
                {orderId}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] tracking-widest text-th-subtle uppercase">Email Cliente *</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="email@esempio.com"
                className="w-full h-10 px-3.5 border border-zinc-800 bg-zinc-900/30 text-white text-xs rounded-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 placeholder:text-zinc-700 transition-colors"
              />
            </div>

            {error && (
              <div className="border border-red-500/30 bg-red-500/5 rounded-sm px-4 py-3">
                <p className="text-xs text-red-400">&gt; ERRORE: {error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full py-3 text-[11px] tracking-widest font-bold uppercase rounded-sm transition-all disabled:opacity-40"
              style={{ backgroundColor: '#22d3ee', color: '#000' }}
            >
              {loading ? '[ SCANSIONE IN CORSO... ]' : '[ ACCEDI AL RADAR ]'}
            </button>
          </form>

          <p className="text-center text-[10px] text-zinc-800">
            <Link href="/" className="hover:text-zinc-600 transition-colors">← Kitwer26</Link>
          </p>
        </div>
      </div>
    );
  }

  // ── Boot animation ─────────────────────────────────────────────────────────
  if (booting) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center font-mono">
        <div className="space-y-2 text-center">
          <p className="text-xs text-cyan-400 animate-pulse tracking-widest">
            [ RICEZIONE SEGNALE SATELLITARE... ]
          </p>
          <p className="text-[10px] text-th-subtle animate-pulse" style={{ animationDelay: '0.4s' }}>
            Connessione rete Amazon AMZ-UNIT...
          </p>
          <p className="text-[10px] text-th-subtle animate-pulse" style={{ animationDelay: '0.8s' }}>
            Decriptatura dati ordine...
          </p>
        </div>
      </div>
    );
  }

  // ── Dashboard radar ────────────────────────────────────────────────────────
  if (!data) return null;

  const isShipped = data.mode === 'active' && !!data.amazonTrackingLink;

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-4 py-10 font-mono">
      <div className="max-w-2xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] tracking-[0.3em] text-cyan-400 uppercase mb-1">● KITWER OVERWATCH</p>
            <h1 className="text-xl font-extrabold tracking-tight" style={{ color: '#ff9a3e' }}>
              RADAR TRACKING
            </h1>
            <p className="text-xs text-th-subtle mt-1">
              {data.customerName && <>{data.customerName} — </>}
              <span className="text-th-subtle">{data.orderId}</span>
            </p>
          </div>
          <Link href="/" className="text-[10px] text-th-subtle hover:text-white transition-colors uppercase tracking-wider">
            ← Base
          </Link>
        </div>

        {/* Status badge */}
        <div
          className="border rounded-sm p-5"
          style={{ borderColor: `${data.statusColor}33`, background: `${data.statusColor}08` }}
        >
          <div className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 rounded-full animate-pulse flex-shrink-0" style={{ backgroundColor: data.statusColor }} />
            <span className="text-sm font-bold tracking-widest uppercase" style={{ color: data.statusColor }}>
              {data.statusLabel}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="border border-zinc-800 bg-[#111] rounded-sm p-5 space-y-4">
          <p className="text-[10px] text-th-subtle tracking-widest uppercase">&gt; STATO AVANZAMENTO</p>
          <div className="flex items-center gap-0">
            {STEPS.map(({ step, label }, i) => {
              const done   = data.step >= step;
              const active = data.step === step;
              const isLast = i === STEPS.length - 1;
              return (
                <div key={step} className="flex items-center" style={{ flex: isLast ? 'none' : 1 }}>
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className="h-7 w-7 rounded-full border-2 flex items-center justify-center text-[10px] font-bold transition-all"
                      style={{
                        borderColor: done ? '#22d3ee' : '#27272a',
                        background:  active ? '#22d3ee22' : done ? '#22d3ee11' : 'transparent',
                        color:       done ? '#22d3ee' : '#3f3f46',
                      }}
                    >
                      {data.step > step ? '✓' : step}
                    </div>
                    <span className="text-[7px] tracking-wider uppercase text-center w-12 leading-tight" style={{ color: done ? '#a1a1aa' : '#3f3f46' }}>
                      {label}
                    </span>
                  </div>
                  {!isLast && (
                    <div className="h-0.5 flex-1 mx-1 transition-all" style={{ background: data.step > step ? '#22d3ee' : '#1e293b' }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA Amazon o Safe-Mode */}
        {isShipped ? (
          <div className="border rounded-sm p-5 space-y-4" style={{ borderColor: '#22d3ee33', background: '#22d3ee08' }}>
            <div className="space-y-1">
              <p className="text-[10px] text-cyan-600 tracking-widest uppercase">&gt; VETTORE LOGISTICO: AMZ-UNIT</p>
              <p className="text-xs text-th-subtle">
                L&apos;asset è stato affidato alla rete logistica Amazon per la consegna rapida.
              </p>
            </div>

            <a
              href={data.amazonTrackingLink!}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-full py-4 text-[12px] font-bold tracking-widest uppercase rounded-sm transition-all"
              style={{
                backgroundColor: '#ff9a3e',
                color: '#000',
                boxShadow: '0 0 20px rgba(255,154,62,0.45)',
              }}
            >
              [ INTERCETTA SPEDIZIONE SU SERVER AMAZON ]
            </a>

            <div className="border border-zinc-800 bg-[#0a0a0a] rounded-sm p-3 space-y-1">
              <p className="text-[9px] text-th-subtle tracking-widest">&gt; DATI RADAR</p>
              <p className="text-[10px] text-th-subtle">IDENTIFICATIVO ASSET: <span className="text-cyan-400">#{data.orderId.slice(0, 8).toUpperCase()}</span></p>
              <p className="text-[10px] text-th-subtle">VETTORE LOGISTICO: <span className="text-white">AMZ-UNIT (Amazon Rete Primaria)</span></p>
              <p className="text-[10px] text-th-subtle">STATO SEGNALE: <span className="text-green-400">ATTIVO</span></p>
            </div>
          </div>
        ) : (
          /* Safe-Mode: tracking non ancora inserito */
          <div className="border rounded-sm p-5 space-y-4" style={{ borderColor: '#f59e0b44', background: '#f59e0b08' }}>
            <div className="flex items-start gap-2">
              <span className="text-yellow-500 mt-0.5">⚠</span>
              <div>
                <p className="text-xs font-bold tracking-wider text-yellow-500 uppercase">
                  STATO: ASSET IN PREPARAZIONE
                </p>
                <p className="text-[11px] text-th-subtle mt-1 leading-relaxed">
                  In attesa di elaborazione logistica. Il segnale radar sarà attivato entro 24 ore.
                </p>
              </div>
            </div>
            <button
              disabled
              className="w-full py-4 text-[11px] font-bold tracking-widest uppercase rounded-sm opacity-40 cursor-not-allowed"
              style={{ background: '#1e293b', color: '#64748b', border: '1px solid #1e293b' }}
            >
              [ ACQUISIZIONE LINK IN CORSO... ]
            </button>
          </div>
        )}

        {/* Order items */}
        {data.orderItems.length > 0 && (
          <div className="border border-zinc-800 bg-[#111] rounded-sm p-4 space-y-2">
            <p className="text-[10px] text-th-subtle tracking-widest uppercase mb-3">&gt; ASSET DELL&apos;ORDINE</p>
            {data.orderItems.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-th-subtle truncate pr-4">{item.product_title ?? 'Prodotto'}</span>
                <span className="text-th-subtle whitespace-nowrap">×{item.quantity ?? 1}</span>
              </div>
            ))}
          </div>
        )}

        <p className="text-center text-[9px] text-zinc-900 pb-4">
          KITWER26 OVERWATCH SYSTEM — LOGISTICA AMZ-UNIT
        </p>
      </div>
    </div>
  );
}
