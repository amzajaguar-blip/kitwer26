'use client';

import { useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from './Header';
import SearchBar from './SearchBar';
import CategoryFilter from './CategoryFilter';
import SubCategoryFilter from './SubCategoryFilter';
import ProductGrid from './ProductGrid';
import ProductDrawer from './ProductDrawer';
import CartDrawer from './CartDrawer';
import Footer from './Footer';
import CookieBanner from './CookieBanner';
import { ChatBotHelpFloating } from './ChatBotHelp';
import HeroSection from './HeroSection';
import BundleSection from './BundleSection';
import LazyAdBanner from './LazyAdBanner';
import { useProducts } from '@/hooks/useProducts';
import { Category } from '@/lib/products';
import { Product } from '@/types/product';
import { useIntl } from '@/context/InternationalizationContext';

const ADSENSE_ID   = process.env.NEXT_PUBLIC_ADSENSE_ID   ?? '';
const ADSENSE_SLOT = process.env.NEXT_PUBLIC_ADSENSE_SLOT ?? '';

function HomepageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialCat    = (searchParams.get('cat') ?? 'all') as Category;
  const initialSubCat = searchParams.get('sub') ?? '';

  const {
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
  } = useProducts({ initialCategory: initialCat, initialSubCategory: initialSubCat });

  const { t } = useIntl();

  const [drawerProduct, setDrawerProduct] = useState<Product | null>(null);

  const handleOpenDrawer = (p: Product) => {
    sessionStorage.setItem('kitwer_product_clicked', '1');
    setDrawerProduct(p);
  };

  // Aggiorna la categoria e resetta la sotto-categoria
  const handleCategoryChange = useCallback((cat: Category) => {
    setCategory(cat);
    setSubCategory('');
    const params = new URLSearchParams();
    if (cat !== 'all') params.set('cat', cat);
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : '/', { scroll: false });
  }, [setCategory, setSubCategory, router]);

  // Aggiorna la sotto-categoria e la URL (?sub=...)
  const handleSubCategoryChange = useCallback((sub: string) => {
    setSubCategory(sub);
    const params = new URLSearchParams();
    if (category !== 'all') params.set('cat', category);
    if (sub) params.set('sub', sub);
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : '/', { scroll: false });
  }, [category, setSubCategory, router]);

  return (
    <div className="min-h-screen pt-[88px] overflow-x-hidden bg-zinc-950">
      <Header />

      {/* Hero — boot sequence + CTAs */}
      <HeroSection />

      {/* Bundle section */}
      <BundleSection />

      {/* Divider */}
      <div className="mx-4 border-t border-zinc-800 mb-6" />

      {/* Sticky search + filter bar */}
      <div
        id="products"
        className="sticky top-[88px] z-40 border-b border-zinc-800/80 bg-zinc-950/95 backdrop-blur-xl scroll-mt-0"
      >
        <SearchBar value={search} onChange={setSearch} placeholder={t('search')} />
        <CategoryFilter active={category} onChange={handleCategoryChange} />
        {/* Sub-category pills — visibili solo quando una categoria specifica è attiva */}
        {category !== 'all' && (
          <SubCategoryFilter
            category={category}
            active={subCategory}
            onChange={handleSubCategoryChange}
          />
        )}
      </div>

      {/* Product grid header */}
      <div className="px-4 pt-4 pb-2 flex items-center gap-2">
        <span className="font-mono text-[9px] tracking-[0.3em] text-zinc-600 uppercase">
          {t('database')}
        </span>
        <span className="font-mono text-[9px] tracking-widest text-cyan-500/80 uppercase">
          {category === 'all'
            ? t('allProtocols')
            : category === 'UNSORTED'
            ? t('uncategorized')
            : category.replace(/-/g, ' ').toUpperCase()
          }
        </span>
        {subCategory && (
          <>
            <span className="font-mono text-[9px] text-zinc-700">/</span>
            <span className="font-mono text-[9px] tracking-widest text-cyan-400/70 uppercase">
              {subCategory.replace(/-/g, ' ')}
            </span>
          </>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="font-mono text-[8px] text-zinc-600 tracking-widest">{t('live')}</span>
        </div>
      </div>

      {/* Product grid */}
      <div className="pb-16 sm:pb-24">
        <ProductGrid
          products={products}
          loading={loading}
          loadingMore={loadingMore}
          hasMore={hasMore}
          onLoadMore={loadMore}
          onOpenDrawer={handleOpenDrawer}
        />
      </div>

      {/* Footer */}
      <LazyAdBanner adClient={ADSENSE_ID} adSlot={ADSENSE_SLOT} />
      <Footer />

      {/* Drawers */}
      <ProductDrawer product={drawerProduct} onClose={() => setDrawerProduct(null)} />
      <CartDrawer />

      {/* Cookie + Chatbot assistance */}
      <CookieBanner />
      <ChatBotHelpFloating />
    </div>
  );
}

export default function HomepageClient() {
  return (
    <Suspense>
      <HomepageInner />
    </Suspense>
  );
}
