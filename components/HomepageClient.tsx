'use client';

import { useState, useCallback, useEffect, Suspense } from 'react';
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
import HeroSection from './HeroSection';
import TrustBar from './TrustBar';
import FeaturedCategories from './FeaturedCategories';
import BundleSection from './BundleSection';
import TacticalDealsSection from './TacticalDealsSection';
import BlogPreviewSection from './BlogPreviewSection';
import LazyAdBanner from './LazyAdBanner';
import { useProducts } from '@/hooks/useProducts';
import { Category, PAGE_SIZE, fetchSubCategoryCounts } from '@/lib/products';
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

  const MAX_HOMEPAGE_PAGES = 4;
  const [bypassHomepageCap, setBypassHomepageCap] = useState(false);
  const isHomepageDefault  = category === 'all' && !search && !subCategory;
  const homepageCap        = MAX_HOMEPAGE_PAGES * PAGE_SIZE; // 48
  const capActive          = isHomepageDefault && !bypassHomepageCap;
  const cappedHasMore      = hasMore && !(capActive && products.length >= homepageCap);
  const showCatalogCTA     = capActive && !cappedHasMore && products.length >= homepageCap;

  const [drawerProduct, setDrawerProduct] = useState<Product | null>(null);
  const [subCounts, setSubCounts] = useState<Record<string, number>>({});

  const handleOpenDrawer = (p: Product) => {
    sessionStorage.setItem('kitwer_product_clicked', '1');
    setDrawerProduct(p);
  };

  // Aggiorna la categoria e resetta la sotto-categoria
  // Qualsiasi click su un filtro (incluso "All Protocols") toglie il cap homepage
  const handleCategoryChange = useCallback((cat: Category) => {
    setBypassHomepageCap(true);
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

  useEffect(() => {
    if (!category || category === 'all') { setSubCounts({}); return; }
    fetchSubCategoryCounts(category).then(setSubCounts);
  }, [category]);

  return (
    <div className="min-h-screen pt-[88px] pb-16 md:pb-0 overflow-x-hidden bg-zinc-950">
      <Header />

      {/* Hero — boot sequence + CTAs */}
      <HeroSection />

      {/* Trust signals */}
      <TrustBar />

      {/* Featured categories grid */}
      <FeaturedCategories />

      {/* Bundle section */}
      <BundleSection />

      {/* Tactical Deals — Budget King products con pricing comparativo */}
      <TacticalDealsSection />

      {/* Blog preview — 3 articoli recenti */}
      <BlogPreviewSection />

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
            activeCounts={subCounts}
          />
        )}
      </div>

      {/* Product grid header */}
      <div className="px-4 pt-4 pb-2 flex items-center gap-2">
        <span className="font-mono text-[9px] tracking-[0.3em] text-th-subtle uppercase">
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
            <span className="font-mono text-[9px] text-th-subtle">/</span>
            <span className="font-mono text-[9px] tracking-widest text-cyan-400/70 uppercase">
              {subCategory.replace(/-/g, ' ')}
            </span>
          </>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="font-mono text-[8px] text-th-subtle tracking-widest">{t('live')}</span>
        </div>
      </div>

      {/* Product grid */}
      <div className="pb-16 sm:pb-24">
        <ProductGrid
          products={products}
          loading={loading}
          loadingMore={loadingMore}
          hasMore={cappedHasMore}
          onLoadMore={loadMore}
          onOpenDrawer={handleOpenDrawer}
        />

        {/* CTA Catalogo completo — mostrato solo nella homepage default dopo 48 prodotti */}
        {showCatalogCTA && (
          <div className="flex flex-col items-center gap-3 py-10 px-4">
            <p className="font-mono text-[11px] text-th-subtle tracking-widest uppercase">
              — Stai vedendo i primi {homepageCap} prodotti —
            </p>
            <button
              onClick={() => setBypassHomepageCap(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-sm bg-zinc-900 border border-cyan-500/40 font-mono text-[12px] text-cyan-400 tracking-wide hover:bg-zinc-800 hover:border-cyan-400 transition-all"
            >
              <span>→ Sfoglia tutto il catalogo</span>
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <LazyAdBanner adClient={ADSENSE_ID} adSlot={ADSENSE_SLOT} />
      <Footer />

      {/* Drawers */}
      <ProductDrawer product={drawerProduct} onClose={() => setDrawerProduct(null)} />
      <CartDrawer />

      <CookieBanner />

      {/* Sticky mobile bottom CTA bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-800/80 px-4 py-3 safe-area-bottom">
        <button
          type="button"
          onClick={() => {
            const el = document.getElementById('products');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          className="w-full inline-flex items-center justify-center gap-2 py-3 font-mono font-bold text-sm tracking-widest uppercase text-black rounded-sm transition-all active:scale-95"
          style={{
            background: '#00D4FF',
            boxShadow: '0 0 16px rgba(0,212,255,0.3)',
          }}
        >
          Esplora il Catalogo
        </button>
      </div>
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
