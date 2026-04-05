'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Package, TrendingUp, Clock, Send, CheckCircle, AlertTriangle, ExternalLink, RotateCcw, X, Download, Users, ShoppingCart, Percent, LogOut } from 'lucide-react';
import {
  SkeletonChartSection,
  SkeletonWidgetRow4,
  SkeletonWidgetRow3,
  SkeletonOrdersTable,
} from '@/components/TacticalSkeleton';

const TacticalRadarChart = dynamic(() => import('@/components/TacticalRadarChart'), { ssr: false });

// ── Tipi ──────────────────────────────────────────────────────────────────────

interface OrderItem {
  product_title: string;
  quantity:      number;
  price_at_purchase: number;
  product_url?:  string | null;
}

interface Order {
  id:                   string;
  created_at:           string;
  customer_name:        string;
  customer_surname:     string;
  customer_email:       string;
  total_amount:         number;
  status:               string;
  amazon_tracking_link: string | null;
  order_items:          OrderItem[];
}

interface Stats {
  pending:       number;
  shipped:       number;
  revenue:       number;
  margin:        number;
  stuckPayments: number;
}

interface DashStats {
  chartData:      { date: string; visits: number; revenue: number; orders: number }[];
  totalVisits:    number;
  totalOrders:    number;
  totalRevenue:   number;
  convRate:       number;
  netProfit:      number;
  abandonedCarts: number;
}

interface AuditLog {
  id:         string;
  timestamp:  string;
  event_type: string;
  severity:   'INFO' | 'WARN' | 'CRITICAL';
  metadata:   Record<string, string | number | boolean | null> | null;
  actor_id:   string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Stessa regex del server (set-tracking/route.ts) — evita falsi positivi client-side
const AMAZON_URL_RE = /^https?:\/\/([a-z0-9-]+\.)*amazon\.[a-z.]{2,6}(\/|$)/i;

function formatRelativeTime(timestamp: string): string {
  const diff  = Date.now() - new Date(timestamp).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)  return 'adesso';
  if (mins  < 60) return `${mins}m fa`;
  if (hours < 24) return `${hours}h fa`;
  return `${days}g fa`;
}

// ── Modal Protocollo Rientro ──────────────────────────────────────────────────

function ReturnModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const shortId     = order.id.slice(0, 8).toUpperCase();
  const mailSubject = encodeURIComponent(`[KITWER26] Protocollo Rientro — Ordine #${shortId}`);
  const mailBody    = encodeURIComponent(
    `Operatore ${order.customer_name},\n\n` +
    `Il comando ha autorizzato l'avvio del Protocollo Rientro per l'asset relativo all'ordine #${shortId}.\n\n` +
    `ISTRUZIONI OPERATIVE:\n` +
    `1. Accedi al tuo account Amazon con cui hai effettuato l'acquisto.\n` +
    `2. Vai su "Resi e rimborsi" e seleziona l'ordine corrispondente.\n` +
    `3. Stampa l'etichetta di reso generata da Amazon.\n` +
    `4. Imballa l'asset e consegnalo al punto di ritiro indicato.\n\n` +
    `Per qualsiasi anomalia durante la procedura, contatta il supporto: kitwer26@zoho.eu\n\n` +
    `Kitwer26 — Centrale Operativa`,
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-sm font-mono"
        style={{ background: '#0a0a0a', border: '1px solid #f59e0b44' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid #1a1a1a' }}>
          <div className="flex items-center gap-2">
            <RotateCcw size={12} style={{ color: '#f59e0b' }} />
            <span className="text-[10px] tracking-widest text-amber-500 uppercase font-bold">
              PROTOCOLLO RIENTRO — #{shortId}
            </span>
          </div>
          <button onClick={onClose} style={{ color: '#ff9a3e' }}>
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div style={{ background: '#111', border: '1px solid #1e293b', borderRadius: '3px', padding: '12px 16px' }}>
            <p className="text-[9px] text-zinc-600 tracking-widest uppercase mb-2">&gt; ISTRUZIONI OPERATIVE</p>
            {[
              'Accedi al tuo account Amazon acquirente.',
              'Vai su "Resi e rimborsi" e seleziona l\'ordine.',
              'Stampa l\'etichetta di reso generata da Amazon.',
              'Imballa l\'asset e consegnalo al punto di ritiro indicato.',
            ].map((step, i) => (
              <div key={i} className="flex gap-3 mb-2">
                <span className="text-[10px] font-bold mt-0.5 flex-shrink-0" style={{ color: '#f59e0b' }}>{i + 1}.</span>
                <p className="text-[11px] text-zinc-400">{step}</p>
              </div>
            ))}
          </div>

          {/* Asset list */}
          <div style={{ background: '#0d0d0d', border: '1px solid #1e293b', borderRadius: '3px', padding: '10px 14px' }}>
            <p className="text-[9px] text-zinc-700 tracking-widest uppercase mb-2">&gt; ASSET NELL'ORDINE</p>
            {order.order_items.slice(0, 4).map((item, i) => (
              <div key={i} className="flex items-center justify-between text-[10px] py-0.5">
                <span className="text-zinc-500 truncate pr-3">{item.product_title}</span>
                <span className="text-zinc-700 flex-shrink-0">×{item.quantity}</span>
              </div>
            ))}
          </div>

          {/* CTA mail */}
          <a
            href={`mailto:${order.customer_email}?subject=${mailSubject}&body=${mailBody}`}
            className="flex items-center justify-center gap-2 w-full py-3 text-[11px] font-bold tracking-widest uppercase rounded-sm transition-all"
            style={{ background: '#f59e0b', color: '#000', boxShadow: '0 0 16px rgba(245,158,11,0.3)' }}
          >
            <Send size={12} />
            [ INVIA ISTRUZIONI RIENTRO AL CLIENTE ]
          </a>

          <p className="text-center text-[9px] text-zinc-800">
            Aprirà il client mail con il testo pre-compilato
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Dashboard principale ──────────────────────────────────────────────────────

export default function LogisticsPage() {
  const router = useRouter();
  const [orders,      setOrders]      = useState<Order[]>([]);
  const [stats,       setStats]       = useState<Stats>({ pending: 0, shipped: 0, revenue: 0, margin: 0, stuckPayments: 0 });
  const [loading,     setLoading]     = useState(true);
  const [links,       setLinks]       = useState<Record<string, string>>({});
  const [dispatching, setDispatching] = useState<Record<string, boolean>>({});
  const [done,        setDone]        = useState<Set<string>>(new Set());
  const [delivering,  setDelivering]  = useState<Record<string, boolean>>({});
  const [returnOrder, setReturnOrder] = useState<Order | null>(null);
  const [toasts,      setToasts]      = useState<{ id: string; msg: string; ok: boolean }[]>([]);
  const [dashStats,    setDashStats]    = useState<DashStats | null>(null);
  const [dashLoading,  setDashLoading]  = useState(true);
  const [auditLogs,    setAuditLogs]    = useState<AuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(true);

  const addToast = (msg: string, ok: boolean) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, msg, ok }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/admin/orders-pending');
      const data = await res.json();
      setOrders(data.orders ?? []);
      setStats(data.stats ?? { pending: 0, shipped: 0, revenue: 0, margin: 0 });
    } catch {
      addToast('ERRORE CONNESSIONE DATABASE', false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch dashboard stats (telemetria + revenue grafici)
  const fetchDashStats = useCallback(async () => {
    setDashLoading(true);
    try {
      const res = await fetch('/api/admin/dashboard-stats');
      if (res.ok) setDashStats(await res.json());
    } catch { /* silenzioso */ }
    finally { setDashLoading(false); }
  }, []);

  const fetchAuditLogs = useCallback(async () => {
    setAuditLoading(true);
    try {
      const res = await fetch('/api/admin/audit-logs');
      if (res.ok) setAuditLogs(await res.json());
    } catch { /* silenzioso */ }
    finally { setAuditLoading(false); }
  }, []);

  useEffect(() => {
    fetchOrders();
    fetchDashStats();
    fetchAuditLogs();
  }, [fetchOrders, fetchDashStats, fetchAuditLogs]);

  async function handleDispatch(orderId: string) {
    const link = links[orderId]?.trim();
    if (!link || !AMAZON_URL_RE.test(link)) return;
    setDispatching(prev => ({ ...prev, [orderId]: true }));

    try {
      const res = await fetch('/api/admin/set-tracking', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ orderId, amazonTrackingLink: link }),
      });
      if (res.ok) {
        setDone(prev => new Set([...prev, orderId]));
        addToast('ASSET DISPACCIATO. NOTIFICHE INVIATE.', true);
        setTimeout(() => {
          setOrders(prev => prev.filter(o => o.id !== orderId));
          setDone(prev => { const s = new Set(prev); s.delete(orderId); return s; });
        }, 700);
      } else {
        const j = await res.json();
        addToast(`ERRORE: ${j.error ?? 'Riprova'}`, false);
      }
    } catch {
      addToast('ERRORE DI TRASMISSIONE. RIPROVARE.', false);
    } finally {
      setDispatching(prev => ({ ...prev, [orderId]: false }));
    }
  }

  async function handleDeliver(orderId: string) {
    setDelivering(prev => ({ ...prev, [orderId]: true }));
    try {
      const res = await fetch('/api/admin/mark-delivered', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ orderId }),
      });
      if (res.ok) {
        addToast('CONSEGNATO. DEBRIEFING SCHEDULATO IN 48H.', true);
        setTimeout(() => setOrders(prev => prev.filter(o => o.id !== orderId)), 700);
      } else {
        addToast('ERRORE AGGIORNAMENTO STATUS', false);
      }
    } catch {
      addToast('ERRORE DI CONNESSIONE', false);
    } finally {
      setDelivering(prev => ({ ...prev, [orderId]: false }));
    }
  }

  const isValidLink = (id: string) => AMAZON_URL_RE.test(links[id] ?? '');

  // ── CSV Export ─────────────────────────────────────────────────────────────
  function exportCSV() {
    const rows = [
      ['ID', 'DATA', 'CLIENTE', 'EMAIL', 'TOTALE (€)', 'MARGINE 20% (€)', 'STATUS', 'PRODOTTI'],
      ...orders.map(o => [
        o.id.slice(0, 8).toUpperCase(),
        new Date(o.created_at).toLocaleDateString('it-IT'),
        `${o.customer_name} ${o.customer_surname}`,
        o.customer_email,
        o.total_amount.toFixed(2),
        (o.total_amount * 0.20).toFixed(2),
        o.status,
        o.order_items.map(i => `${i.product_title} x${i.quantity}`).join(' | '),
      ]),
    ];
    const csv  = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: `kitwer26_ordini_${new Date().toISOString().slice(0,10)}.csv` });
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen font-mono p-6" style={{ background: '#050505', color: '#d4d4d8' }}>

      {/* Modali */}
      {returnOrder && <ReturnModal order={returnOrder} onClose={() => setReturnOrder(null)} />}

      {/* Toast stack */}
      <div className="fixed top-4 right-4 z-50 space-y-2 w-80">
        {toasts.map(t => (
          <div
            key={t.id}
            className="px-4 py-3 rounded-sm text-xs flex items-center gap-2"
            style={{
              border:     t.ok ? '1px solid #22d3ee33' : '1px solid #ef444433',
              background: t.ok ? '#22d3ee0a'           : '#ef44440a',
              color:      t.ok ? '#22d3ee'             : '#ef4444',
            }}
          >
            {t.ok ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
            {t.msg}
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="mb-8 flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] tracking-[0.25em] text-green-400 uppercase">Uplink Established</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            KITWER <span style={{ color: '#ff9a3e' }}>COMMAND CENTER</span>
          </h1>
          <p className="text-xs mt-1" style={{ color: '#3f3f46' }}>Centro Operativo — God Mode Attivo</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 text-[10px] tracking-widest uppercase px-3 py-2 rounded-sm transition-all"
            style={{ border: '1px solid #22c55e33', color: '#22c55e', background: '#22c55e08' }}
            onMouseEnter={e => { (e.currentTarget.style.background = '#22c55e14'); }}
            onMouseLeave={e => { (e.currentTarget.style.background = '#22c55e08'); }}
          >
            <Download size={11} />
            [ ESTRAI REPORT CSV ]
          </button>
          <button
            onClick={() => { fetchOrders(); fetchDashStats(); fetchAuditLogs(); }}
            className="text-[10px] tracking-widest uppercase px-3 py-2 rounded-sm transition-all"
            style={{ border: '1px solid #27272a', color: '#52525b' }}
            onMouseEnter={e => { (e.currentTarget.style.borderColor = '#22d3ee33'); (e.currentTarget.style.color = '#22d3ee'); }}
            onMouseLeave={e => { (e.currentTarget.style.borderColor = '#27272a');   (e.currentTarget.style.color = '#52525b'); }}
          >
            [ SYNC ]
          </button>
          <button
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' });
              router.replace('/admin/login');
            }}
            className="text-[10px] tracking-widest uppercase px-3 py-2 rounded-sm transition-all flex items-center gap-1.5"
            style={{ border: '1px solid #27272a', color: '#52525b' }}
            onMouseEnter={e => { (e.currentTarget.style.borderColor = '#ef444433'); (e.currentTarget.style.color = '#ef4444'); }}
            onMouseLeave={e => { (e.currentTarget.style.borderColor = '#27272a');   (e.currentTarget.style.color = '#52525b'); }}
          >
            <LogOut size={10} />
            [ ESCI ]
          </button>
        </div>
      </div>

      {/* ── Grafici telemetria + revenue ─────────────────────────────────────── */}
      {dashLoading
        ? <SkeletonChartSection />
        : dashStats && <TacticalRadarChart data={dashStats.chartData} />
      }

      {/* ── HUD Statistiche — 4 widget operativi ─────────────────────────────── */}
      {loading ? <SkeletonWidgetRow4 /> : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {([
            { icon: Clock,      label: 'ORDINI PENDENTI',    val: stats.pending, color: '#f59e0b', fmt: (v: number) => String(v) },
            { icon: Package,    label: 'ASSET IN MOVIMENTO', val: stats.shipped, color: '#22d3ee', fmt: (v: number) => String(v) },
            { icon: TrendingUp, label: 'REVENUE OPERATIVO',  val: stats.revenue, color: '#22c55e', fmt: (v: number) => `€${v.toFixed(2)}` },
            { icon: Send,       label: 'MARGINE NETTO 20%',  val: stats.margin,  color: '#ff9a3e', fmt: (v: number) => `€${v.toFixed(2)}` },
          ] as const).map(({ icon: Icon, label, val, color, fmt }) => (
            <div key={label} className="rounded-sm p-4" style={{ border: '1px solid #1c1c1c', background: '#0a0a0a' }}>
              <div className="flex items-center gap-2 mb-2">
                <Icon size={11} style={{ color }} />
                <span className="text-[9px] tracking-widest uppercase" style={{ color: '#3f3f46' }}>{label}</span>
              </div>
              <p className="text-xl font-extrabold" style={{ color }}>{fmt(val)}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Banner pagamenti bloccati (webhook / stripe non confermati) ────────── */}
      {!loading && stats.stuckPayments > 0 && (
        <div
          className="mb-4 px-4 py-3 rounded-sm flex items-center gap-3 text-xs"
          style={{ background: '#ef44440a', border: '1px solid #ef444433', color: '#ef4444' }}
        >
          <AlertTriangle size={13} />
          <span className="font-bold tracking-widest uppercase">
            {stats.stuckPayments} PAGAMENTO{stats.stuckPayments > 1 ? 'I' : ''} BLOCCATO{stats.stuckPayments > 1 ? 'I' : ''}
          </span>
          <span style={{ color: '#71717a' }}>
            — Sessioni Stripe avviate ma non confermate. Verifica il webhook su Stripe Dashboard.
          </span>
        </div>
      )}

      {/* ── HUD Extra — 3 widget telemetria 7gg ──────────────────────────────── */}
      {dashLoading ? <SkeletonWidgetRow3 /> : dashStats && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
          {([
            { icon: Users,        label: 'VISITE (7 giorni)',    val: dashStats.totalVisits,    color: '#22d3ee', fmt: (v: number) => String(v) },
            { icon: Percent,      label: 'TASSO CONVERSIONE',    val: dashStats.convRate,       color: '#a855f7', fmt: (v: number) => `${v.toFixed(2)}%` },
            { icon: ShoppingCart, label: 'CARRELLI ABBANDONATI', val: dashStats.abandonedCarts, color: '#ef4444', fmt: (v: number) => String(v) },
          ] as const).map(({ icon: Icon, label, val, color, fmt }) => (
            <div key={label} className="rounded-sm p-4" style={{ border: '1px solid #1c1c1c', background: '#0a0a0a' }}>
              <div className="flex items-center gap-2 mb-2">
                <Icon size={11} style={{ color }} />
                <span className="text-[9px] tracking-widest uppercase" style={{ color: '#3f3f46' }}>{label}</span>
              </div>
              <p className="text-xl font-extrabold" style={{ color }}>{fmt(val)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabella */}
      <div className="rounded-sm overflow-hidden" style={{ border: '1px solid #1c1c1c', background: '#0a0a0a' }}>
        <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #141414' }}>
          <p className="text-[10px] tracking-widest uppercase" style={{ color: '#3f3f46' }}>&gt; ORDINI IN ATTESA DI DISPACCIAMENTO</p>
          <span className="text-[9px]" style={{ color: '#27272a' }}>{orders.length} ordini</span>
        </div>

        {loading ? (
          <SkeletonOrdersTable />
        ) : orders.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-xs" style={{ color: '#27272a' }}>Nessun ordine da spedire. ✓</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: '#0f0f0f' }}>
            {orders.map(order => {
              const isDone        = done.has(order.id);
              const isDispatching = dispatching[order.id];
              const isDelivering  = delivering[order.id];
              const valid         = isValidLink(order.id);
              const margin        = (order.total_amount * 0.20).toFixed(2);
              const isShipped     = order.status === 'shipped';

              // ORIGINE ASSET: primo product_url valido
              const originUrl = order.order_items?.find(i => i.product_url)?.product_url ?? null;

              return (
                <div
                  key={order.id}
                  className="px-5 py-4 transition-opacity duration-700"
                  style={{ opacity: isDone ? 0 : 1 }}
                >
                  <div className="space-y-3">
                    {/* Row 1: info + ORIGINE ASSET */}
                    <div className="flex flex-wrap items-start gap-x-6 gap-y-1">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px]" style={{ color: '#3f3f46' }}>#KW-</span>
                          <span className="text-xs font-bold" style={{ color: '#22d3ee' }}>
                            {order.id.slice(0, 8).toUpperCase()}
                          </span>
                          <span
                            className="text-[9px] px-1.5 py-0.5 rounded-sm uppercase tracking-wider font-bold"
                            style={{
                              background: isShipped ? '#22d3ee11' : '#f59e0b11',
                              color:      isShipped ? '#22d3ee'   : '#f59e0b',
                              border:     `1px solid ${isShipped ? '#22d3ee22' : '#f59e0b22'}`,
                            }}
                          >
                            {order.status}
                          </span>
                        </div>
                        <p className="text-[11px]" style={{ color: '#71717a' }}>
                          {order.customer_name} {order.customer_surname} · {order.customer_email}
                        </p>
                        <div className="flex items-center gap-4">
                          <span className="text-xs font-bold text-white">€{order.total_amount.toFixed(2)}</span>
                          <span className="text-[10px]" style={{ color: '#ff9a3e' }}>+€{margin} margine</span>
                        </div>
                      </div>

                      {/* ORIGINE ASSET */}
                      {originUrl && (
                        <div className="space-y-0.5">
                          <p className="text-[9px] tracking-widest uppercase" style={{ color: '#3f3f46' }}>ORIGINE ASSET</p>
                          <a
                            href={originUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-sm transition-all"
                            style={{ border: '1px solid #22d3ee22', color: '#22d3ee', background: '#0d0d0d' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#22d3ee11')}
                            onMouseLeave={e => (e.currentTarget.style.background = '#0d0d0d')}
                          >
                            <ExternalLink size={9} />
                            [ AMAZON ]
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Row 2: azioni */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Link input + DISPACCIA */}
                      {!isShipped && (
                        <>
                          <input
                            type="url"
                            value={links[order.id] ?? ''}
                            onChange={e => setLinks(prev => ({ ...prev, [order.id]: e.target.value }))}
                            placeholder="https://www.amazon.it/tracking/..."
                            className="flex-1 min-w-48 h-8 px-3 text-[11px] rounded-sm focus:outline-none transition-colors placeholder:text-zinc-800"
                            style={{
                              background:   '#0d0d0d',
                              border:       `1px solid ${links[order.id] && !valid ? '#ef4444' : '#1e293b'}`,
                              color:        links[order.id] && !valid ? '#ef4444' : '#d4d4d8',
                            }}
                          />
                          <button
                            onClick={() => handleDispatch(order.id)}
                            disabled={!valid || isDispatching}
                            className="h-8 px-4 text-[10px] tracking-widest font-bold uppercase rounded-sm transition-all whitespace-nowrap"
                            style={{
                              background:   valid && !isDispatching ? '#ff9a3e' : '#111',
                              color:        valid && !isDispatching ? '#000'    : '#3f3f46',
                              border:       valid && !isDispatching ? 'none'    : '1px solid #1e293b',
                              boxShadow:    valid && !isDispatching ? '0 0 12px rgba(255,154,62,0.35)' : 'none',
                              opacity:      !valid || isDispatching ? 0.5 : 1,
                              cursor:       !valid || isDispatching ? 'not-allowed' : 'pointer',
                            }}
                          >
                            {isDispatching ? '[ CRIPTATURA... ]' : '[ DISPACCIA ]'}
                          </button>
                        </>
                      )}

                      {/* CONSEGNATO */}
                      {isShipped && (
                        <button
                          onClick={() => handleDeliver(order.id)}
                          disabled={isDelivering}
                          className="h-8 px-4 text-[10px] tracking-widest font-bold uppercase rounded-sm transition-all"
                          style={{
                            border:  '1px solid #22c55e33',
                            color:   '#22c55e',
                            background: '#22c55e0a',
                          }}
                        >
                          {isDelivering ? '...' : '[ SEGNA CONSEGNATO ]'}
                        </button>
                      )}

                      {/* PROTOCOLLO RIENTRO */}
                      {isShipped && (
                        <button
                          onClick={() => setReturnOrder(order)}
                          className="h-8 px-3 text-[10px] tracking-widest font-bold uppercase rounded-sm transition-all"
                          style={{ border: '1px solid #f59e0b22', color: '#f59e0b', background: '#f59e0b08' }}
                        >
                          <RotateCcw size={10} className="inline mr-1" />
                          [ RIENTRO ]
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── LOG DI MISSIONE — Audit Feed ─────────────────────────────────────── */}
      <div className="mt-4 rounded-sm overflow-hidden" style={{ border: '1px solid #1c1c1c', background: '#0a0a0a' }}>

        {/* Header */}
        <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #141414' }}>
          <div className="flex items-center gap-2">
            <span style={{
              display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%',
              background: '#ef4444', boxShadow: '0 0 6px #ef4444',
              animation: 'pulse 1.5s cubic-bezier(0.4,0,0.6,1) infinite',
            }} />
            <p className="text-[10px] tracking-widest uppercase" style={{ color: '#3f3f46' }}>
              &gt; LOG DI MISSIONE
            </p>
          </div>
          <span className="text-[9px]" style={{ color: '#27272a' }}>ultimi 20 eventi</span>
        </div>

        {/* Feed */}
        {auditLoading ? (
          <div className="px-5 py-10 text-center">
            <p className="text-[10px] font-mono tracking-widest" style={{ color: '#27272a' }}>
              [ SCANSIONE EVENTI IN CORSO... ]
            </p>
          </div>
        ) : auditLogs.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-[10px]" style={{ color: '#27272a' }}>Nessun evento registrato.</p>
          </div>
        ) : (
          <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
            {auditLogs.map((log, i) => {
              const isCritical = log.severity === 'CRITICAL';
              const isWarn     = log.severity === 'WARN';
              const dotColor   = isCritical ? '#ef4444' : isWarn ? '#f59e0b' : '#22c55e';
              const elapsed    = formatRelativeTime(log.timestamp);
              // Pick most informative metadata snippet (never raw email/token)
              const meta = log.metadata;
              const snippet = meta?.reason ?? meta?.path ?? meta?.status ?? meta?.source ?? '';

              return (
                <div
                  key={log.id}
                  className="px-5 py-2.5 flex items-start gap-3"
                  style={{
                    borderBottom: i < auditLogs.length - 1 ? '1px solid #0f0f0f' : 'none',
                    background:   isCritical ? 'rgba(239,68,68,0.03)' : 'transparent',
                  }}
                >
                  {/* Severity dot */}
                  <span style={{
                    flexShrink: 0,
                    marginTop:  '4px',
                    display:    'inline-block',
                    width:      '6px',
                    height:     '6px',
                    borderRadius: '50%',
                    background: dotColor,
                    boxShadow:  isCritical ? `0 0 6px ${dotColor}` : 'none',
                    animation:  isCritical ? 'pulse 1.5s cubic-bezier(0.4,0,0.6,1) infinite' : 'none',
                  }} />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold font-mono" style={{ color: dotColor }}>
                        {log.event_type}
                      </span>
                      <span className="text-[9px]" style={{ color: '#3f3f46' }}>
                        {elapsed}
                      </span>
                      <span className="text-[9px]" style={{ color: '#27272a' }}>
                        {log.actor_id}
                      </span>
                    </div>
                    {snippet ? (
                      <p className="text-[9px] truncate mt-0.5" style={{ color: '#52525b' }}>
                        {String(snippet)}
                      </p>
                    ) : null}
                  </div>

                  {/* Severity badge */}
                  <span
                    className="text-[8px] px-1.5 py-0.5 rounded-sm font-bold tracking-widest flex-shrink-0"
                    style={{
                      background: `${dotColor}11`,
                      border:     `1px solid ${dotColor}33`,
                      color:      dotColor,
                      fontFamily: 'monospace',
                    }}
                  >
                    {log.severity}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p className="text-center text-[9px] mt-8 pb-4" style={{ color: '#18181b' }}>
        KITWER26 LOGISTICS CONTROL — ACCESSO CLASSIFICATO — v2.6
      </p>
    </div>
  );
}
