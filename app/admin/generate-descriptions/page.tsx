'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { Category } from '@/lib/products';
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  Check,
  AlertCircle,
  Search,
  ChevronDown,
  ChevronUp,
  FileText,
} from 'lucide-react';

// ─── Tipi ─────────────────────────────────────────────────────────────────────

type ProductForDesc = {
  id: string;
  title: string;
  description: string | null;
};

// ─── Costanti ─────────────────────────────────────────────────────────────────

const CATEGORY_OPTIONS: { value: Exclude<Category, 'all'>; label: string }[] = [
  { value: 'Crypto Wallets', label: 'Crypto Wallets' },
  { value: 'FPV Drones',     label: 'FPV Drones' },
  { value: 'Sim Racing',     label: 'Sim Racing' },
  { value: 'Cyber Security', label: 'Cyber Security' },
  { value: 'fpv-drones-tech', label: 'FPV Drones (legacy DB)' },
];

// ─── Componente principale ────────────────────────────────────────────────────

export default function GenerateDescriptionsPage() {
  const [products, setProducts]     = useState<ProductForDesc[]>([]);
  const [loading, setLoading]       = useState(true);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [search, setSearch]         = useState('');
  const [expanded, setExpanded]     = useState<string | null>(null);

  // Stato per ogni prodotto
  const [descriptions, setDescriptions] = useState<Record<string, string>>({});
  const [selectedCat, setSelectedCat]   = useState<Record<string, Exclude<Category, 'all'>>>({});
  const [generating, setGenerating]     = useState<string | null>(null);
  const [saving, setSaving]             = useState<string | null>(null);
  const [successId, setSuccessId]       = useState<string | null>(null);
  const [errors, setErrors]             = useState<Record<string, string>>({});

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setGlobalError(null);

    const { data, error } = await supabase
      .from('products')
      .select('id, title, description')
      .order('title', { ascending: true });

    if (error) {
      setGlobalError('Impossibile caricare i prodotti. Riprova.');
      setProducts([]);
    } else {
      const list = (data ?? []) as ProductForDesc[];
      setProducts(list);
      const descMap: Record<string, string> = {};
      list.forEach((p) => { descMap[p.id] = p.description ?? ''; });
      setDescriptions(descMap);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  // ── Genera descrizione IA ─────────────────────────────────────────────────

  const handleGenerate = async (productId: string, title: string) => {
    const category = selectedCat[productId] ?? CATEGORY_OPTIONS[0].value;
    setGenerating(productId);
    setErrors((prev) => ({ ...prev, [productId]: '' }));

    try {
      const res = await fetch('/api/admin/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: title, category }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? 'Errore API');
      setDescriptions((prev) => ({ ...prev, [productId]: json.description }));
    } catch {
      setErrors((prev) => ({ ...prev, [productId]: 'Generazione fallita. Controlla la connessione e riprova.' }));
    } finally {
      setGenerating(null);
    }
  };

  // ── Salva descrizione ─────────────────────────────────────────────────────

  const handleSave = async (productId: string) => {
    setSaving(productId);
    setErrors((prev) => ({ ...prev, [productId]: '' }));

    try {
      const res = await fetch('/api/admin/update-product-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, description: descriptions[productId] ?? '' }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? 'Errore salvataggio');

      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId ? { ...p, description: descriptions[productId] } : p
        )
      );
      setSuccessId(productId);
      setTimeout(() => setSuccessId((c) => (c === productId ? null : c)), 2000);
    } catch {
      setErrors((prev) => ({ ...prev, [productId]: 'Salvataggio fallito. Riprova.' }));
    } finally {
      setSaving(null);
    }
  };

  // ── Filtraggio ─────────────────────────────────────────────────────────────

  const filtered = products.filter((p) =>
    !search.trim() || p.title.toLowerCase().includes(search.toLowerCase())
  );

  // ── Loading screen ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-[#00D4FF] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-gray-500">Caricamento prodotti...</p>
        </div>
      </div>
    );
  }

  // ── UI ────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col">

      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#0A0A0A]/95 backdrop-blur-sm border-b border-gray-800 px-4 h-14 flex items-center gap-3">
        <Link
          href="/admin"
          className="flex items-center justify-center w-8 h-8 rounded-full border border-gray-800 text-gray-400 active:scale-95 active:text-white transition-all"
          aria-label="Torna agli ordini"
        >
          <ArrowLeft size={16} />
        </Link>
        <div className="flex flex-col leading-none">
          <span className="text-xs font-black uppercase tracking-wide flex items-center gap-1.5">
            <Sparkles size={12} className="text-[#00D4FF]" />
            Descrizioni IA
          </span>
          <span className="text-[10px] text-[#00D4FF]">{products.length} prodotti</span>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pt-3 pb-2.5 border-b border-gray-900 bg-[#0A0A0A]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={14} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca prodotto per nome..."
            className="w-full h-9 pl-8 pr-3 rounded-xl bg-[#111111] border border-gray-800 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#00D4FF]"
          />
        </div>
        {globalError && (
          <div className="mt-2 flex items-center gap-2 text-[11px] text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
            <AlertCircle size={13} />
            {globalError}
          </div>
        )}
      </div>

      {/* Lista prodotti */}
      <div className="flex-1 px-3 py-3 space-y-2.5 pb-8">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-600 text-xs">
            <FileText size={28} className="mb-2 opacity-25" />
            Nessun prodotto trovato.
          </div>
        ) : (
          filtered.map((product) => {
            const isOpen       = expanded === product.id;
            const isGenerating = generating === product.id;
            const isSaving     = saving === product.id;
            const isSuccess    = successId === product.id;
            const desc         = descriptions[product.id] ?? '';
            const catValue     = selectedCat[product.id] ?? CATEGORY_OPTIONS[0].value;
            const errMsg       = errors[product.id] ?? '';
            const hasDesc      = !!product.description;

            return (
              <div
                key={product.id}
                className={`bg-[#111111] rounded-2xl border overflow-hidden transition-colors ${
                  isSuccess ? 'border-emerald-500/60' : 'border-gray-800/60'
                }`}
              >
                {/* Card header — tap per espandere */}
                <button
                  onClick={() => setExpanded(isOpen ? null : product.id)}
                  className="w-full px-4 py-3 flex items-center gap-3 text-left"
                >
                  <FileText
                    size={14}
                    className={hasDesc ? 'text-[#00FF94] flex-shrink-0' : 'text-gray-700 flex-shrink-0'}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white leading-snug line-clamp-2">
                      {product.title}
                    </p>
                    <p className="text-[9px] mt-0.5 text-gray-600">
                      {hasDesc ? 'Descrizione presente' : 'Nessuna descrizione'}
                    </p>
                  </div>
                  {isOpen
                    ? <ChevronUp size={14} className="text-gray-600 flex-shrink-0" />
                    : <ChevronDown size={14} className="text-gray-600 flex-shrink-0" />}
                </button>

                {/* Form espanso */}
                {isOpen && (
                  <div className="border-t border-gray-800 px-4 py-4 space-y-3">

                    {/* Selezione categoria */}
                    <div>
                      <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold block mb-1.5">
                        Categoria prodotto
                      </label>
                      <select
                        value={catValue}
                        onChange={(e) =>
                          setSelectedCat((prev) => ({
                            ...prev,
                            [product.id]: e.target.value as Exclude<Category, 'all'>,
                          }))
                        }
                        className="w-full h-9 px-3 rounded-xl bg-[#181818] border border-gray-800 text-xs text-white focus:outline-none focus:border-[#00D4FF]"
                      >
                        {CATEGORY_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Pulsante Genera — prominente, sopra la textarea */}
                    <button
                      onClick={() => handleGenerate(product.id, product.title)}
                      disabled={isGenerating}
                      className="w-full h-12 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60"
                      style={{
                        background: isGenerating
                          ? 'rgba(0,212,255,0.08)'
                          : 'linear-gradient(135deg, #00D4FF 0%, #7C3AED 100%)',
                        color: isGenerating ? '#00D4FF' : '#fff',
                        border: isGenerating ? '1px solid rgba(0,212,255,0.3)' : 'none',
                      }}
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Generazione in corso...
                        </>
                      ) : (
                        <>
                          <Sparkles size={15} />
                          ✨ Genera con IA (DeepSeek)
                        </>
                      )}
                    </button>

                    {/* Textarea descrizione */}
                    <div>
                      <label className="text-[9px] text-gray-500 uppercase tracking-widest font-bold block mb-1.5">
                        Descrizione (HTML)
                      </label>
                      <textarea
                        value={desc}
                        onChange={(e) =>
                          setDescriptions((prev) => ({ ...prev, [product.id]: e.target.value }))
                        }
                        placeholder="Premi ✨ Genera per riempire questo campo, poi modifica se vuoi e clicca Salva."
                        rows={8}
                        className="w-full px-3 py-2.5 rounded-xl bg-[#181818] border border-gray-800 text-xs text-gray-200 placeholder-gray-700 focus:outline-none focus:border-[#00D4FF] resize-none leading-relaxed font-mono"
                      />
                    </div>

                    {/* Errore */}
                    {errMsg && (
                      <div className="flex items-center gap-2 text-[11px] text-red-400 bg-red-500/10 border border-red-500/25 rounded-xl px-3 py-2">
                        <AlertCircle size={12} className="flex-shrink-0" />
                        {errMsg}
                      </div>
                    )}

                    {/* Salva */}
                    <button
                      onClick={() => handleSave(product.id)}
                      disabled={isSaving || !desc.trim()}
                      className="w-full h-10 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40"
                      style={{
                        background: isSuccess ? 'rgba(0,255,148,0.15)' : '#00FF94',
                        color: isSuccess ? '#00FF94' : '#0A0A0A',
                        border: isSuccess ? '1px solid rgba(0,255,148,0.4)' : 'none',
                      }}
                    >
                      {isSaving ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Salvataggio...</>
                      ) : isSuccess ? (
                        <><Check size={15} /> Salvato!</>
                      ) : (
                        'Salva Modifiche'
                      )}
                    </button>

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
