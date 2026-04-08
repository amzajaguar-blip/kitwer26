import { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';
import { BUNDLE_META } from '@/lib/bundles';
import { getAllPosts } from '@/lib/blog/posts';

const BASE = 'https://kitwer26.com';

const SITE_UPDATED = new Date('2026-04-08');

// ── Static pages ──────────────────────────────────────────────────────────────
const STATIC_PAGES: MetadataRoute.Sitemap = [
  { url: BASE,                         lastModified: SITE_UPDATED, changeFrequency: 'weekly',  priority: 1.0 },
  { url: `${BASE}/about`,              lastModified: SITE_UPDATED, changeFrequency: 'monthly', priority: 0.6 },
  { url: `${BASE}/spedizioni`,         lastModified: SITE_UPDATED, changeFrequency: 'yearly',  priority: 0.3 },
  { url: `${BASE}/reso`,               lastModified: SITE_UPDATED, changeFrequency: 'yearly',  priority: 0.3 },
  { url: `${BASE}/legal`,              lastModified: SITE_UPDATED, changeFrequency: 'yearly',  priority: 0.2 },
  { url: `${BASE}/privacy-policy`,     lastModified: SITE_UPDATED, changeFrequency: 'yearly',  priority: 0.2 },
  { url: `${BASE}/cookie-policy`,      lastModified: SITE_UPDATED, changeFrequency: 'yearly',  priority: 0.2 },
  { url: `${BASE}/termini-condizioni`, lastModified: SITE_UPDATED, changeFrequency: 'yearly',  priority: 0.2 },
  // /checkout and /track intentionally excluded — transactional, not indexable
];

// ── Blog pages ────────────────────────────────────────────────────────────────
const BLOG_PAGES: MetadataRoute.Sitemap = [
  { url: `${BASE}/blog`, lastModified: SITE_UPDATED, changeFrequency: 'weekly', priority: 0.8 },
  ...getAllPosts().map(p => ({
    url:             `${BASE}/blog/${p.slug}`,
    lastModified:    new Date(p.updatedAt),
    changeFrequency: 'monthly' as const,
    priority:        0.75,
  })),
];

// ── Bundle pages ──────────────────────────────────────────────────────────────
const BUNDLE_PAGES: MetadataRoute.Sitemap = BUNDLE_META.map((b) => ({
  url:             `${BASE}/bundle/${b.id}`,
  lastModified:    SITE_UPDATED,
  changeFrequency: 'weekly' as const,
  priority:        0.9,
}));

// ── Dynamic product pages ─────────────────────────────────────────────────────
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return [...STATIC_PAGES, ...BLOG_PAGES, ...BUNDLE_PAGES];
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Fetch id + updated_at for accurate lastModified per product
  const { data: products } = await supabase
    .from('products')
    .select('id, updated_at');

  const productPages: MetadataRoute.Sitemap = (products ?? []).map((p) => ({
    url:             `${BASE}/product/${p.id}`,
    lastModified:    p.updated_at ? new Date(p.updated_at) : SITE_UPDATED,
    changeFrequency: 'weekly' as const,
    priority:        0.85,
  }));

  return [...STATIC_PAGES, ...BLOG_PAGES, ...BUNDLE_PAGES, ...productPages];
}
