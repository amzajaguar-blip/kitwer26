'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import {
  LogOut,
  Package,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  RefreshCw,
  Truck,
  Copy,
  Check,
  Sparkles,
  Link2,
  Upload,
} from 'lucide-react';

// ─── Tipi ─────────────────────────────────────────────────────────────────────

interface OrderItem {
  id: string;
  product_title: string;
  product_variant: string | null;
  quantity: number;
  price_at_purchase: number;
  product_url: string | null;
  products?: { image_url: string | null } | null;
}

interface Order {
  id: string;
  created_at: string;
  status: string;
  total_amount: number;
  tracking_code: string | null;
  customer_name: string;
  customer_surname: string;
  customer_address: string;
  customer_cap: string;
  customer_city: string;
  customer_phone: string;
  customer_email: string | null;
  customer_country: string | null;
  order_items: OrderItem[];
}

// ─── Amazon marketplace helpers ───────────────────────────────────────────────

const AMAZON_DOMAINS: Record<string, string> = {
  IT: 'amazon.it',   DE: 'amazon.de',     FR: 'amazon.fr',
  ES: 'amazon.es',   NL: 'amazon.nl',     BE: 'amazon.com.be',
  AT: 'amazon.de',   GB: 'amazon.co.uk',  US: 'amazon.com',
  CA: 'amazon.ca',   JP: 'amazon.co.jp',  AU: 'amazon.com.au',
  CH: 'amazon.de',   PL: 'amazon.pl',     SE: 'amazon.se',
  PT: 'amazon.es',   DK: 'amazon.de',     FI: 'amazon.de',
};

const COUNTRY_NAMES: Record<string, string> = {
  IT: 'Italia',      DE: 'Germania',      FR: 'Francia',
  ES: 'Spagna',      NL: 'Olanda',        BE: 'Belgio',
  AT: 'Austria',     GB: 'Regno Unito',   US: 'Stati Uniti',
  CA: 'Canada',      JP: 'Giappone',      AU: 'Australia',
  CH: 'Svizzera',    PL: 'Polonia',       SE: 'Svezia',
  PT: 'Portogallo',  DK: 'Danimarca',     FI: 'Finlandia',
  NO: 'Norvegia',    CZ: 'Rep. Ceca',
};

const COUNTRY_FLAGS: Record<string, string> = {
  IT: '🇮🇹', DE: '🇩🇪', FR: '🇫🇷', ES: '🇪🇸', NL: '🇳🇱',
  BE: '🇧🇪', AT: '🇦🇹', GB: '🇬🇧', US: '🇺🇸', CA: '🇨🇦',
  JP: '🇯🇵', AU: '🇦🇺', CH: '🇨🇭', PL: '🇵🇱', SE: '🇸🇪',
  PT: '🇵🇹', DK: '🇩🇰', FI: '🇫🇮', NO: '🇳🇴', CZ: '🇨🇿',
};

function getMarketplaceUrl(productUrl: string | null, countryCode: string): string | null {
  if (!productUrl) return null;
  if (countryCode === 'IT') return productUrl;
  const domain = AMAZON_DOMAINS[countryCode] ?? 'amazon.it';
  try {
    const asinMatch = productUrl.match(/\/dp\/([A-Z0-9]{10})/i);
    if (asinMatch) return `https://www.${domain}/dp/${asinMatch[1]}`;
    const url = new URL(productUrl);
    url.hostname = `www.${domain}`;
    url.search = '';
    return url.toString();
  } catch {
    return productUrl;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Genera link di tracking neutro su 17track.net */
function trackingLink(code: string): string {
  return `https://t.17track.net/it#nums=${encodeURIComponent(code.trim())}`;
}

// ─── Costanti ─────────────────────────────────────────────────────────────────

const STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'] as const;

const STATUS_STYLE: Record<string, string> = {
  pending:                  'text-yellow-400 bg-yellow-400/10 border-yellow-400/25',
  pending_stripe_payment:   'text-orange-400 bg-orange-400/10 border-orange-400/25',
  confirmed:                'text-[#00FF94] bg-[#00FF94]/10 border-[#00FF94]/25',
  processing:               'text-[#00D4FF] bg-[#00D4FF]/10 border-[#00D4FF]/25',
  shipped:                  'text-purple-400 bg-purple-400/10 border-purple-400/25',
  delivered:                'text-[#00FF94] bg-[#00FF94]/10 border-[#00FF94]/25',
  cancelled:                'text-red-400 bg-red-400/10 border-red-400/25',
  payment_aborted:          'text-red-400 bg-red-400/10 border-red-400/25',
  stripe_error:             'text-red-500 bg-red-500/10 border-red-500/25',
};

const STATUS_LABEL: Record<string, string> = {
  pending:                 'In attesa',
  pending_stripe_payment:  '⏳ Pagamento Stripe',
  confirmed:               '✅ Pagato',
  processing:              'In lavorazione',
  shipped:                 'Spedito',
  delivered:               'Consegnato',
  cancelled:               'Annullato',
  payment_aborted:         '❌ Pagamento Annullato',
  stripe_error:            '❌ Errore Stripe',
};

// ─── Placeholder: nessun dato ─────────────────────────────────────────────────

function MissionEmptyState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <div className="relative mb-5">
        <div className="w-16 h-16 rounded-full bg-[#111111] border border-gray-800 flex items-center justify-center">
          <Package size={28} className="text-gray-700" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#0A0A0A] border border-gray-800 flex items-center justify-center">
          <span className="text-[9px]">📡</span>
        </div>
      </div>
      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">
        Quadrante temporale
      </p>
      <p className="text-sm text-gray-400 leading-snug max-w-[240px]">
        Nessun dato di missione rilevato nel quadrante temporale selezionato
      </p>
      <button
        onClick={onRetry}
        className="mt-5 flex items-center gap-2 px-4 h-8 rounded-xl bg-[#111111] border border-gray-800 text-[11px] font-bold text-gray-500 active:text-white active:border-gray-600 transition-colors"
      >
        <RefreshCw size={11} />
        Scansiona di nuovo
      </button>
    </div>
  );
}

// ─── Placeholder: errore di connessione ───────────────────────────────────────

function MissionErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <div className="relative mb-5">
        <div className="w-16 h-16 rounded-full bg-red-500/5 border border-red-500/20 flex items-center justify-center">
          <Package size={28} className="text-red-500/40" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#0A0A0A] border border-red-500/20 flex items-center justify-center">
          <span className="text-[9px]">⚠️</span>
        </div>
      </div>
      <p className="text-xs font-bold text-red-500/60 uppercase tracking-widest mb-1">
        Segnale interrotto
      </p>
      <p className="text-sm text-gray-400 leading-snug max-w-[260px] mb-2">
        Nessun dato di missione rilevato nel quadrante temporale selezionato
      </p>
      <p className="text-[10px] text-gray-700 max-w-[260px] font-mono break-all">
        {message}
      </p>
      <button
        onClick={onRetry}
        className="mt-5 flex items-center gap-2 px-4 h-8 rounded-xl bg-red-500/10 border border-red-500/25 text-[11px] font-bold text-red-400 active:bg-red-500/20 transition-colors"
      >
        <RefreshCw size={11} />
        Riprova connessione
      </button>
      <p className="mt-3 text-[10px] text-gray-700 max-w-[220px]">
        Verifica la connessione al database o le credenziali Supabase nelle variabili d&apos;ambiente.
      </p>
    </div>
  );
}

// ─── Componente principale ────────────────────────────────────────────────────

export default function AdminPage() {
  const router   = useRouter();
  const [orders, setOrders]             = useState<Order[]>([]);
  const [loading, setLoading]           = useState(true);
  const [fetchError, setFetchError]     = useState<string | null>(null);
  const [expanded, setExpanded]         = useState<string | null>(null);
  const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>({});
  const [savingTracking, setSavingTracking] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId]         = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setFetchError(null);

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*, products(image_url))')
        .order('created_at', { ascending: false });

      if (error) {
        setFetchError(error.message ?? 'Errore sconosciuto dal database');
        setOrders([]);
      } else {
        const fetched = (data ?? []) as Order[];
        setOrders(fetched);
        // Pre-popola i campi tracking con i valori salvati
        const inputs: Record<string, string> = {};
        fetched.forEach((o) => { if (o.tracking_code) inputs[o.id] = o.tracking_code; });
        setTrackingInputs((prev) => ({ ...inputs, ...prev }));
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Impossibile raggiungere il database';
      setFetchError(message);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // BUG FIX: il vecchio codice chiamava supabase.auth.getSession() che è SEMPRE null
    // perché l'auth admin usa un sistema custom (cookie vault), non Supabase Auth.
    // Risultato: loop infinito → /admin/login anche con sessione valida.
    // La protezione è già garantita da middleware.ts + app/admin/layout.tsx (server-side).
    loadOrders();
  }, [loadOrders]);

  const handleLogout = async () => {
    // BUG FIX: il vecchio codice chiamava supabase.auth.signOut() che non fa nulla
    // perché la sessione admin è il cookie kitwer_vault_session, non Supabase Auth.
    // Il cookie deve essere cancellato via API route server-side (httpOnly = non accessibile da JS).
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/admin/login');
  };

  const updateStatus = async (orderId: string, status: string) => {
    await supabase.from('orders').update({ status }).eq('id', orderId);
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
  };

  const saveTracking = async (orderId: string) => {
    const code = (trackingInputs[orderId] ?? '').trim();
    setSavingTracking((prev) => ({ ...prev, [orderId]: true }));
    await supabase.from('orders').update({ tracking_code: code || null }).eq('id', orderId);
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, tracking_code: code || null } : o))
    );
    setSavingTracking((prev) => ({ ...prev, [orderId]: false }));
  };

  const copyTrackingLink = async (orderId: string) => {
    const code = trackingInputs[orderId] ?? '';
    if (!code.trim()) return;
    try {
      await navigator.clipboard.writeText(trackingLink(code));
      setCopiedId(orderId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch { /* no-op */ }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#00D4FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">

      {/* Header admin */}
      <div className="sticky top-0 z-40 bg-[#0A0A0A]/95 backdrop-blur-sm border-b border-gray-800 px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon.png"
            alt="Kitwer"
            className="h-10 w-auto object-contain"
            style={{ filter: 'drop-shadow(0 0 6px rgba(0,212,255,0.3))' }}
          />
          <div>
            <span className="text-xs font-black text-white block leading-none">Admin</span>
            <span className="text-[10px] text-[#00D4FF]">{orders.length} ordini</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={loadOrders} className="text-gray-500 active:text-white transition-colors" aria-label="Aggiorna">
            <RefreshCw size={17} />
          </button>
          <button onClick={handleLogout} className="text-gray-500 active:text-white transition-colors" aria-label="Esci">
            <LogOut size={17} />
          </button>
        </div>
      </div>

      {/* Strumenti admin */}
      <div className="px-3 pt-3 pb-1 flex gap-2">
        <Link
          href="/admin/generate-descriptions"
          className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl bg-[#111111] border border-gray-800 text-[11px] font-bold text-[#00D4FF] active:scale-95 transition-transform"
        >
          <Sparkles size={12} />
          Descrizioni IA
        </Link>
        <Link
          href="/admin/manage-links"
          className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl bg-[#111111] border border-gray-800 text-[11px] font-bold text-gray-400 active:scale-95 transition-transform"
        >
          <Link2 size={12} />
          Link Amazon
        </Link>
        <Link
          href="/admin/import"
          className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl bg-[#111111] border border-gray-800 text-[11px] font-bold text-orange-400 active:scale-95 transition-transform"
        >
          <Upload size={12} />
          Import
        </Link>
      </div>

      {/* Lista ordini */}
      <div className="px-3 py-4 space-y-2.5 pb-16">
        {fetchError ? (
          <MissionErrorState message={fetchError} onRetry={loadOrders} />
        ) : orders.length === 0 ? (
          <MissionEmptyState onRetry={loadOrders} />
        ) : (
          orders.map((order) => {
            const isOpen    = expanded === order.id;
            const trackCode = trackingInputs[order.id] ?? '';
            const isCopied  = copiedId === order.id;

            // Paese e marketplace
            const countryCode   = order.customer_country ?? 'IT';
            const flag          = COUNTRY_FLAGS[countryCode] ?? '🌍';
            const countryName   = COUNTRY_NAMES[countryCode] ?? countryCode;
            const domain        = AMAZON_DOMAINS[countryCode] ?? 'amazon.it';
            const isForeign     = countryCode !== 'IT';

            // Profitto
            const collected  = Number(order.total_amount);
            const amazonCost = Math.round((collected / 1.2) * 100) / 100;
            const netProfit  = Math.round((collected - amazonCost) * 100) / 100;

            return (
              <div key={order.id} className="bg-[#111111] rounded-2xl border border-gray-800/60 overflow-hidden">

                {/* Header ordine (clic per espandere) */}
                <button
                  onClick={() => setExpanded(isOpen ? null : order.id)}
                  className="w-full px-4 py-3 flex items-start gap-3 text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[10px] text-gray-500">
                        {new Date(order.created_at).toLocaleDateString('it-IT', {
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wide ${STATUS_STYLE[order.status] ?? STATUS_STYLE.pending}`}>
                        {STATUS_LABEL[order.status] ?? order.status}
                      </span>
                      {/* Badge paese se estero */}
                      {isForeign && (
                        <span className="text-[9px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/25 px-2 py-0.5 rounded-full uppercase tracking-wide">
                          {flag} {countryCode}
                        </span>
                      )}
                      {order.tracking_code && (
                        <span className="text-[9px] font-bold text-purple-400 bg-purple-400/10 border border-purple-400/25 px-2 py-0.5 rounded-full uppercase tracking-wide flex items-center gap-1">
                          <Truck size={9} />
                          Tracking attivo
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-bold text-white">
                      {order.customer_name} {order.customer_surname}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {order.customer_city} — {order.customer_phone}
                    </p>
                  </div>
                  <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
                    <p className="text-base font-black text-[#00D4FF]">
                      €{collected.toFixed(2).replace('.', ',')}
                    </p>
                    {isOpen
                      ? <ChevronUp size={14} className="text-gray-600" />
                      : <ChevronDown size={14} className="text-gray-600" />}
                  </div>
                </button>

                {/* Dettagli espansi */}
                {isOpen && (
                  <div className="border-t border-gray-800 px-4 py-3 space-y-4">

                    {/* Paese e Marketplace */}
                    <div className="bg-[#1A1A1A] rounded-xl p-3">
                      <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-2">
                        🌍 Paese ordine &amp; Marketplace
                      </p>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-white">
                            {flag} {countryName} <span className="text-gray-500 font-normal text-xs">({countryCode})</span>
                          </p>
                          <p className="text-xs text-[#00D4FF] mt-0.5">
                            Acquisto su: <strong>{domain}</strong>
                          </p>
                        </div>
                        <a
                          href={`https://www.${domain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-3 h-8 bg-[#1a2a1a] border border-[#00FF94]/30 text-[#00FF94] text-[10px] font-bold rounded-lg active:scale-95 transition-transform"
                        >
                          <ExternalLink size={10} />
                          {domain}
                        </a>
                      </div>
                    </div>

                    {/* Profitto */}
                    <div className="bg-[#0d2010] border border-[#1a4a2a] rounded-xl p-3">
                      <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-2">
                        💰 Riepilogo economico
                      </p>
                      <div className="flex justify-between items-center text-xs mb-1">
                        <span className="text-gray-400">Incassato dal cliente</span>
                        <span className="font-bold text-white">€{collected.toFixed(2).replace('.', ',')}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs mb-2">
                        <span className="text-gray-400">Costo Amazon stimato (−20%)</span>
                        <span className="text-orange-400">−€{amazonCost.toFixed(2).replace('.', ',')}</span>
                      </div>
                      <div className="flex justify-between items-center border-t border-[#1a4a2a] pt-2">
                        <span className="text-xs font-bold text-white">Profitto netto</span>
                        <span className="text-base font-black text-[#00FF94]">+€{netProfit.toFixed(2).replace('.', ',')}</span>
                      </div>
                    </div>

                    {/* Dati spedizione */}
                    <div className="bg-[#1A1A1A] rounded-xl p-3 text-xs space-y-0.5">
                      <p className="text-white font-semibold mb-1">
                        {order.customer_name} {order.customer_surname}
                      </p>
                      <p className="text-gray-400">{order.customer_address}</p>
                      <p className="text-gray-400">{order.customer_cap} {order.customer_city}</p>
                      <p className="text-gray-300 font-medium mt-1">📱 {order.customer_phone}</p>
                      {order.customer_email && (
                        <p className="text-gray-500">{order.customer_email}</p>
                      )}
                    </div>

                    {/* Prodotti da acquistare */}
                    <div>
                      <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-2">
                        🛒 Prodotti da acquistare
                      </p>
                      <div className="space-y-2">
                        {order.order_items.map((item) => {
                          const mpUrl = getMarketplaceUrl(item.product_url, countryCode);
                          return (
                            <div key={item.id} className="flex items-center gap-2.5 bg-[#1A1A1A] rounded-xl p-2.5">
                              {/* Immagine prodotto */}
                              {item.products?.image_url && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={item.products.image_url}
                                  alt={item.product_title}
                                  className="w-12 h-12 object-cover rounded-lg flex-shrink-0 bg-zinc-900"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                {/* Titolo cliccabile → marketplace del cliente */}
                                {mpUrl ? (
                                  <a
                                    href={mpUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-gray-200 font-medium line-clamp-2 leading-snug hover:text-[#00D4FF] transition-colors"
                                  >
                                    {item.product_title}
                                  </a>
                                ) : (
                                  <p className="text-xs text-gray-200 font-medium line-clamp-2 leading-snug">
                                    {item.product_title}
                                  </p>
                                )}
                                {item.product_variant && (
                                  <p className="text-[10px] text-[#00D4FF] mt-0.5">{item.product_variant}</p>
                                )}
                                <p className="text-[10px] text-gray-500 mt-0.5">
                                  ×{item.quantity} — €{(item.price_at_purchase * item.quantity).toFixed(2).replace('.', ',')}
                                </p>
                                {isForeign && mpUrl && (
                                  <p className="text-[9px] text-amber-400 mt-0.5">
                                    {flag} {domain}
                                  </p>
                                )}
                              </div>
                              <div className="flex flex-col gap-1.5 flex-shrink-0">
                                {mpUrl ? (
                                  <a
                                    href={mpUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 px-3 h-8 bg-[#00D4FF] text-[#0A0A0A] text-[11px] font-black rounded-lg active:scale-95 transition-transform"
                                  >
                                    <ExternalLink size={11} />
                                    Acquista
                                  </a>
                                ) : (
                                  <span className="text-[10px] text-gray-700">no link</span>
                                )}
                                <a
                                  href={`https://www.amazon.it/s?k=${encodeURIComponent(item.product_title)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 px-3 h-8 bg-[#FF9900] text-[#0A0A0A] text-[11px] font-black rounded-lg active:scale-95 transition-transform"
                                >
                                  🛒 Ordina su Amazon
                                </a>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* ── Tracking neutro (17track) ──────────────────────── */}
                    <div>
                      <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-2 flex items-center gap-1.5">
                        <Truck size={10} />
                        Tracking spedizione
                      </p>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={trackCode}
                          onChange={(e) =>
                            setTrackingInputs((prev) => ({ ...prev, [order.id]: e.target.value }))
                          }
                          placeholder="Es. IT123456789CN"
                          className="flex-1 h-9 px-3 bg-[#1A1A1A] text-white text-xs rounded-xl border border-gray-800 focus:outline-none focus:border-[#00D4FF] placeholder-gray-700"
                        />
                        <button
                          onClick={() => saveTracking(order.id)}
                          disabled={savingTracking[order.id]}
                          className="h-9 px-3 bg-[#1A1A1A] border border-gray-800 rounded-xl text-xs text-gray-400 active:text-white transition-colors disabled:opacity-40"
                        >
                          {savingTracking[order.id] ? '...' : 'Salva'}
                        </button>
                      </div>

                      {/* Link 17track da mandare al cliente */}
                      {trackCode.trim() && (
                        <div className="flex items-center gap-2 bg-[#1A1A1A] rounded-xl p-2.5">
                          <Truck size={13} className="text-purple-400 flex-shrink-0" />
                          <a
                            href={trackingLink(trackCode)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 text-[10px] text-purple-400 underline truncate"
                          >
                            {trackingLink(trackCode)}
                          </a>
                          <button
                            onClick={() => copyTrackingLink(order.id)}
                            className="flex-shrink-0 flex items-center gap-1 px-2.5 h-7 rounded-lg text-[10px] font-bold transition-all active:scale-95"
                            style={{
                              background: isCopied ? 'rgba(0,255,148,0.15)' : 'rgba(168,85,247,0.15)',
                              color: isCopied ? '#00FF94' : '#c084fc',
                            }}
                          >
                            {isCopied ? <><Check size={10} /> Copiato!</> : <><Copy size={10} /> Copia</>}
                          </button>
                        </div>
                      )}
                      <p className="text-[9px] text-gray-700 mt-1.5">
                        Il cliente aprirà il link su 17track.net — nessun riferimento al fornitore.
                      </p>
                    </div>

                    {/* Stato ordine */}
                    <div>
                      <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-2">
                        Stato ordine
                      </p>
                      <div className="flex gap-1.5 flex-wrap">
                        {STATUSES.map((s) => (
                          <button
                            key={s}
                            onClick={() => updateStatus(order.id, s)}
                            className={`px-3 h-7 rounded-full text-[10px] font-bold border transition-all active:scale-95 ${
                              order.status === s
                                ? STATUS_STYLE[s]
                                : 'text-gray-600 border-gray-800 bg-transparent'
                            }`}
                          >
                            {STATUS_LABEL[s]}
                          </button>
                        ))}
                      </div>
                    </div>

                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
