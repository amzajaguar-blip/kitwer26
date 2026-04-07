import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPostBySlug, getAllSlugs } from '@/lib/blog/posts';
import { fetchBlogProduct }            from '@/lib/blog/db';
import type { BlogProductData }        from '@/lib/blog/db';
import BlogPageClient                  from './BlogPageClient';

// ── Static params ─────────────────────────────────────────────────────────────
export function generateStaticParams() {
  return getAllSlugs().map(slug => ({ slug }));
}

// ── Metadata ──────────────────────────────────────────────────────────────────
export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};

  const canonical = `https://kitwer26.com/blog/${post.slug}`;

  return {
    title:       `${post.title} | Kitwer26`,
    description: post.excerpt,
    alternates:  { canonical },
    openGraph: {
      title:       post.title,
      description: post.excerpt,
      url:         canonical,
      type:        'article',
      publishedTime: post.updatedAt,
      modifiedTime:  post.updatedAt,
      authors:       [post.author],
      tags:          post.tags,
    },
  };
}

// ── JSON-LD helpers ───────────────────────────────────────────────────────────
function buildJsonLd(
  post:        ReturnType<typeof getPostBySlug> & object,
  productMap:  Record<string, BlogProductData>,
  winnerData:  BlogProductData | null,
): object[] {
  const url = `https://kitwer26.com/blog/${post.slug}`;

  const article = {
    '@context':         'https://schema.org',
    '@type':            'Article',
    headline:           post.title,
    description:        post.excerpt,
    url,
    datePublished:      post.updatedAt,
    dateModified:       post.updatedAt,
    author: {
      '@type': 'Person',
      name:    post.author,
      jobTitle: post.authorRole,
    },
    publisher: {
      '@type': 'Organization',
      name:    'Kitwer26',
      url:     'https://kitwer26.com',
    },
    keywords: post.tags.join(', '),
  };

  const schemas: object[] = [article];

  // FAQPage
  if (post.faq && post.faq.length > 0) {
    schemas.push({
      '@context':   'https://schema.org',
      '@type':      'FAQPage',
      mainEntity: post.faq.map(f => ({
        '@type':          'Question',
        name:             f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer },
      })),
    });
  }

  // Product schemas for winner + all products
  for (const [, pd] of Object.entries(productMap)) {
    if (!pd || pd.price <= 0) continue;
    schemas.push({
      '@context': 'https://schema.org',
      '@type':    'Product',
      name:       pd.name,
      image:      pd.image_urls?.[0] ?? pd.image_url ?? undefined,
      offers: {
        '@type':       'Offer',
        priceCurrency: 'EUR',
        price:         pd.price.toFixed(2),
        availability:  'https://schema.org/InStock',
        url:           pd.affiliate_url ?? url,
      },
    });
  }

  return schemas;
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function BlogPostPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  // Fetch all products in parallel
  const productEntries = await Promise.all(
    post.products.map(async ref => {
      const data = await fetchBlogProduct(ref.namePattern, ref.affiliateUrl);
      return [ref.id, data] as [string, BlogProductData | null];
    }),
  );

  const productMap: Record<string, BlogProductData> = {};
  for (const [id, data] of productEntries) {
    if (data) productMap[id] = data;
  }

  const winnerData = post.winnerProductId
    ? (productMap[post.winnerProductId] ?? null)
    : null;

  const jsonLdSchemas = buildJsonLd(post, productMap, winnerData);

  return (
    <>
      {/* JSON-LD */}
      {jsonLdSchemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}

      <BlogPageClient
        post={post}
        productMap={productMap}
        winnerData={winnerData}
      />
    </>
  );
}
