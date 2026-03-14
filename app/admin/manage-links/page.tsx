'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { Product } from '@/types/product';
import {
  ArrowLeft,
  ExternalLink,
  Link2,
  Loader2,
  Check,
  AlertCircle,
  Search,
} from 'lucide-react';

type ProductWithRequiredId = Product & { id: string };

export default function ManageLinksPage() {
  const [products, setProducts] = useState<ProductWithRequiredId[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setGlobalError(null);
    const { data, error } = await supabase
      .from('products')
      .select('id, title, url')
      .order('title', { ascending: true });

    if (error) {
      console.error('[manage-links] Errore fetch products:', error.message);
      setGlobalError('Impossibile caricare i prodotti.');
      setProducts([]);
    } else {
      const list = (data ?? []) as unknown as ProductWithRequiredId[];
      setProducts(list);
      const nextInputs: Record<string, string> = {};
      list.forEach((p) => {
        if (p.id) nextInputs[p.id] = p.url ?? '';
      });
      setInputs((prev) => ({ ...nextInputs, ...prev }));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleChange = (id: string, value: string) => {
    setInputs((prev) => ({ ...prev, [id]: value }));
  };

  const handleUpdate = async (id: string) => {
    const url = (inputs[id] ?? '').trim();

    setSavingId(id);
    setSuccessId(null);
    setErrorId(null);

    try {
      const res = await fetch('/api/admin/update-product-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: id, url }),
      });

      const payload = await res.json().catch(() => ({}));

      if (!res.ok || !payload?.success) {
        throw new Error(payload?.error || 'Errore salvataggio link');
      }

      setProducts((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                url: url || undefined,
              }
            : p
        )
      );

      setSuccessId(id);
      setTimeout(() => {
        setSuccessId((current) => (current === id ? null : current));
      }, 1500);
    } catch (err) {
      console.error('[manage-links] Update error:', err);
      setErrorId(id);
      setTimeout(() => {
        setErrorId((current) => (current === id ? null : current));
      }, 2000);
    } finally {
      setSavingId(null);
    }
  };

  const filteredProducts = products.filter((p) => {
    if (!search.trim()) return true;
    return (p.title ?? '').toLowerCase().includes(search.toLowerCase());
  });

  if (loading && products.length === 0) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-[#00D4FF] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-gray-500">Caricamento prodotti...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col">
      {/* Header mobile-first */}
      <div className="sticky top-0 z-40 bg-[#0A0A0A]/95 backdrop-blur-sm border-b border-gray-800 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            href="/admin"
            className="flex items-center justify-center w-8 h-8 rounded-full border border-gray-800 text-gray-400 active:scale-95 active:text-white transition-all"
            aria-label="Torna agli ordini"
          >
            <ArrowLeft size={16} />
          </Link>
          <div className="flex flex-col leading-none">
            <span className="text-xs font-black uppercase tracking-wide">
              Gestione link Amazon
            </span>
            <span className="text-[10px] text-[#00D4FF]">
              {products.length} prodotti
            </span>
          </div>
        </div>
        <Link
          href="/admin"
          className="text-[10px] text-gray-500 underline underline-offset-2"
        >
          Ordini
        </Link>
      </div>

      {/* Barra ricerca + stato */}
      <div className="px-4 pt-3 pb-2 space-y-2 border-b border-gray-900 bg-[#0A0A0A]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={14} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca per nome prodotto"
            className="w-full h-9 pl-8 pr-3 rounded-xl bg-[#111111] border border-gray-800 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#00D4FF]"
          />
        </div>
        {globalError && (
          <div className="flex items-center gap-2 text-[11px] text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
            <AlertCircle size={13} />
            <span>{globalError}</span>
          </div>
        )}
        <p className="text-[10px] text-gray-600">
          Incolla i nuovi link Amazon.it. Il salvataggio usa un accesso sicuro
          al database (service role), solo lato server.
        </p>
      </div>

      {/* Lista prodotti */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 pb-6">
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-600 text-xs">
            <Link2 size={26} className="mb-2 opacity-30" />
            Nessun prodotto trovato.
          </div>
        ) : (
          filteredProducts.map((product) => {
            const id = product.id;
            const value = id ? inputs[id] ?? product.url ?? '' : '';
            const isSaving = savingId === id;
            const isSuccess = successId === id;
            const isError = errorId === id;

            return (
              <div
                key={id}
                className={`bg-[#111111] rounded-2xl border px-3.5 py-3.5 space-y-2.5 ${
                  isSuccess
                    ? 'border-emerald-500/70 shadow-[0_0_0_1px_rgba(16,185,129,0.35)]'
                    : isError
                    ? 'border-red-500/70 shadow-[0_0_0_1px_rgba(248,113,113,0.35)]'
                    : 'border-gray-800/70'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5">
                    <Link2 size={14} className="text-[#00D4FF]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white leading-snug line-clamp-3">
                      {product.title}
                    </p>
                    {product.url && (
                      <p className="text-[9px] text-gray-500 mt-0.5 truncate">
                        Attuale: {product.url}
                      </p>
                    )}
                  </div>
                  {product.url ? (
                    <a
                      href={product.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 h-7 rounded-full bg-[#00D4FF] text-[#0A0A0A] text-[10px] font-black active:scale-95 transition-transform"
                    >
                      <ExternalLink size={11} />
                      Test
                    </a>
                  ) : (
                    <span className="flex-shrink-0 text-[9px] text-gray-600">
                      Nessun link
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => id && handleChange(id, e.target.value)}
                    placeholder="Incolla qui il nuovo link Amazon.it"
                    className="w-full h-9 px-3 rounded-xl bg-[#181818] border border-gray-800 text-[11px] text-white placeholder-gray-600 focus:outline-none focus:border-[#00D4FF]"
                    inputMode="url"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[9px] text-gray-600 max-w-[65%]">
                      Suggerimento: controlla che il dominio sia{' '}
                      <span className="text-[#00D4FF] font-semibold">amazon.it</span> prima di
                      salvare.
                    </p>
                    <button
                      onClick={() => id && handleUpdate(id)}
                      disabled={!id || isSaving}
                      className="flex-shrink-0 inline-flex items-center justify-center gap-1 px-3.5 h-8 rounded-xl text-[11px] font-bold bg-[#00D4FF] text-[#0A0A0A] disabled:opacity-50 active:scale-95 transition-transform"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Salvataggio...</span>
                        </>
                      ) : isSuccess ? (
                        <>
                          <Check size={12} />
                          <span>Salvato</span>
                        </>
                      ) : (
                        <span>Aggiorna Link</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

