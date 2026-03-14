'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchProducts, Category, PAGE_SIZE, FetchProductsResult } from '@/lib/products';
import { Product } from '@/types/product';

const DEBOUNCE_MS = 350;

export function useProducts() {
  const [products, setProducts]       = useState<Product[]>([]);
  const [total, setTotal]             = useState<number | null>(null);
  const [search, setSearch]           = useState('');
  const [category, setCategory]       = useState<Category>('all');
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore]         = useState(true);

  const pageRef     = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const load = useCallback(
    async (s: string, cat: Category, page: number, append: boolean) => {
      if (page === 0) setLoading(true);
      else setLoadingMore(true);

      try {
        const result: FetchProductsResult = await fetchProducts({ search: s, category: cat, page });
        setProducts((prev) => (append ? [...prev, ...result.products] : result.products));
        setTotal(result.total);
        setHasMore(result.products.length === PAGE_SIZE);
      } catch (e) {
        console.error('[useProducts]', e);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  // Ogni volta che search o category cambiano → reset pagina + debounce
  useEffect(() => {
    pageRef.current = 0;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      load(search, category, 0, false);
    }, DEBOUNCE_MS);
    return () => clearTimeout(debounceRef.current);
  }, [search, category, load]);

  const loadMore = useCallback(() => {
    pageRef.current += 1;
    load(search, category, pageRef.current, true);
  }, [search, category, load]);

  return {
    products,
    total,
    search,
    setSearch,
    category,
    setCategory,
    loading,
    loadingMore,
    hasMore,
    loadMore,
  };
}
