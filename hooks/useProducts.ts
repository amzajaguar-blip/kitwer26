'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchProducts, Category, PAGE_SIZE, FetchProductsResult } from '@/lib/products';
import { Product } from '@/types/product';

const DEBOUNCE_MS    = 350; // delay per ricerca/filtri (evita request ad ogni tasto)
const INITIAL_DELAY  = 0;   // nessun delay al primo mount — i prodotti appaiono subito

export function useProducts(opts?: { initialCategory?: Category; initialSubCategory?: string }) {
  const [products, setProducts]       = useState<Product[]>([]);
  const [total, setTotal]             = useState<number | null>(null);
  const [search, setSearch]           = useState('');
  const [category, setCategory]       = useState<Category>(opts?.initialCategory ?? 'all');
  const [subCategory, setSubCategory] = useState<string>(opts?.initialSubCategory ?? '');
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore]         = useState(true);

  const pageRef      = useRef(0);
  const debounceRef  = useRef<ReturnType<typeof setTimeout>>();
  const isMounted    = useRef(false);

  const load = useCallback(
    async (s: string, cat: Category, sub: string, page: number, append: boolean) => {
      if (page === 0) setLoading(true);
      else setLoadingMore(true);

      try {
        const result: FetchProductsResult = await fetchProducts({ search: s, category: cat, subCategory: sub, page });
        setProducts((prev) => (append ? [...prev, ...result.products] : result.products));
        setTotal(result.total);
        // Ultima pagina: meno risultati di PAGE_SIZE → non c'è altro
        // Pagina piena: confronta prodotti accumulati (page+1)*PAGE_SIZE col totale
        // Evita che l'ultimo batch esatto (total % PAGE_SIZE === 0) mostri "carica altro"
        const pagesLoaded   = page + 1;
        const accumulated   = pagesLoaded * PAGE_SIZE;
        const lastPage      = result.products.length < PAGE_SIZE;
        const receivedAll   = lastPage || (result.total !== null && accumulated >= result.total);
        setHasMore(!receivedAll);
      } catch (e) {
        console.error('[useProducts]', e);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  // Mount iniziale → carica subito (0ms). Cambi successivi → debounce 350ms.
  useEffect(() => {
    const delay = isMounted.current ? DEBOUNCE_MS : INITIAL_DELAY;
    isMounted.current = true;

    pageRef.current = 0;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      load(search, category, subCategory, 0, false);
    }, delay);
    return () => clearTimeout(debounceRef.current);
  }, [search, category, subCategory, load]);

  const loadMore = useCallback(() => {
    pageRef.current += 1;
    load(search, category, subCategory, pageRef.current, true);
  }, [search, category, subCategory, load]);

  return {
    products,
    total,
    search,
    setSearch,
    category,
    setCategory,
    subCategory,
    setSubCategory,
    loading,
    loadingMore,
    hasMore,
    loadMore,
  };
}
