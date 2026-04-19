'use client';

import { memo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import ArticleHero from '@/components/blog/ArticleHero';
import ComparisonTable from '@/components/blog/ComparisonTable';
import BlogProductCard from '@/components/blog/BlogProductCard';
import GeneratedBlogVisual from '@/components/blog/GeneratedBlogVisual';
import StickyWinnerBar from '@/components/blog/StickyWinnerBar';
import type { BlogPost } from '@/lib/blog/types';
import type { BlogProductData } from '@/lib/blog/db';

// ── Minimal markdown renderer (no external dependency) ───────────────────────
const SimpleMarkdown = memo(function SimpleMarkdown({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('### ')) {
      elements.push(<h3 key={i}>{parseInline(line.slice(4))}</h3>);
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={i}>{parseInline(line.slice(3))}</h2>);
    } else if (line.startsWith('# ')) {
      elements.push(<h2 key={i}>{parseInline(line.slice(2))}</h2>);
    } else if (line.startsWith('> ')) {
      elements.push(<blockquote key={i}><p>{parseInline(line.slice(2))}</p></blockquote>);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      const items: string[] = [];
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
        items.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`}>
          {items.map((item, j) => <li key={j}>{parseInline(item)}</li>)}
        </ul>
      );
      continue;
    } else if (line.trim() === '') {
      // intentional no-op
    } else {
      elements.push(<p key={i}>{parseInline(line)}</p>);
    }
    i++;
  }

  return <>{elements}</>;
});

function parseInline(text: string): React.ReactNode {
  // Bold **text**, then inline code `code`
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i}>{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

interface Props {
  post:        BlogPost;
  productMap:  Record<string, BlogProductData>;
  winnerData:  BlogProductData | null;
}

const fadeUp = {
  hidden:  { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function BlogPageClient({ post, productMap, winnerData }: Props) {
  return (
    <>
      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <ArticleHero
          slug={post.slug}
          title={post.title}
          excerpt={post.excerpt}
          author={post.author}
          authorRole={post.authorRole}
          updatedAt={post.updatedAt}
          category={post.category}
          tags={post.tags}
          winnerLabel={post.winnerLabel}
        />

        <div className="space-y-2">
          {post.sections.map((section, idx) => {
            if (section.type === 'markdown') {
              return (
                <motion.div
                  key={idx}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: '-40px' }}
                  className="prose prose-invert prose-sm sm:prose-base max-w-none
                    prose-headings:font-mono prose-headings:tracking-tight prose-headings:text-white
                    prose-h2:text-xl prose-h2:font-extrabold prose-h2:border-b prose-h2:border-cyan-500/20 prose-h2:pb-2 prose-h2:mt-10
                    prose-h3:text-lg prose-h3:text-cyan-300
                    prose-p:text-zinc-300 prose-p:leading-relaxed
                    prose-strong:text-orange-400 prose-strong:font-bold
                    prose-blockquote:border-l-orange-500 prose-blockquote:bg-zinc-900/60 prose-blockquote:pl-4 prose-blockquote:py-2 prose-blockquote:not-italic
                    prose-blockquote:text-zinc-300
                    prose-a:text-cyan-400 prose-a:no-underline hover:prose-a:underline
                    prose-li:text-zinc-300
                    prose-code:text-cyan-300 prose-code:bg-zinc-800 prose-code:px-1 prose-code:rounded-none"
                >
                  <SimpleMarkdown content={section.content} />
                </motion.div>
              );
            }

            if (section.type === 'comparison_table') {
              return (
                <ComparisonTable
                  key={idx}
                  headers={section.headers}
                  rows={section.rows}
                />
              );
            }

            if (section.type === 'product_card') {
              const productData = productMap[section.productId];
              if (!productData) return null;
              return (
                <motion.div
                  key={idx}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: '-40px' }}
                >
                  <BlogProductCard product={productData} />
                </motion.div>
              );
            }

            if (section.type === 'image_placeholder') {
              return (
                <motion.div
                  key={idx}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: '-40px' }}
                  className="my-8"
                >
                  <GeneratedBlogVisual
                    title={section.alt}
                    category={post.category}
                    alt={section.alt}
                    badge={`scene ${section.id.toString().padStart(2, '0')}`}
                    variant="inline"
                  />
                </motion.div>
              );
            }

            if (section.type === 'divider') {
              return <hr key={idx} className="my-8 border-zinc-800" />;
            }

            return null;
          })}
        </div>

        {/* FAQ — rendered if present */}
        {post.faq && post.faq.length > 0 && (
          <motion.section
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            className="mt-14 border-t border-zinc-800 pt-10"
          >
            <h2 className="mb-6 font-mono text-xl font-extrabold uppercase tracking-widest text-white">
              FAQ
            </h2>
            <dl className="space-y-6">
              {post.faq.map((item, i) => (
                <div key={i} className="border-l-2 border-cyan-500/40 pl-4">
                  <dt className="mb-1 font-mono text-sm font-bold text-cyan-300">{item.question}</dt>
                  <dd className="text-sm leading-relaxed text-zinc-400">{item.answer}</dd>
                </div>
              ))}
            </dl>
          </motion.section>
        )}
      </article>

      <div className="mx-auto max-w-3xl px-4 pb-16 sm:px-6 lg:px-8">
        <Link
          href={`/?cat=${encodeURIComponent(post.category)}`}
          className="inline-flex items-center gap-2 border border-zinc-800 bg-zinc-900 px-4 py-2 font-mono text-xs text-zinc-500 transition-all hover:border-zinc-600 hover:text-zinc-300"
        >
          ← Esplora {post.category} nel catalogo
        </Link>
      </div>

      {/* Sticky winner bar — mobile only */}
      {winnerData && post.winnerLabel && (
        <StickyWinnerBar product={winnerData} winnerLabel={post.winnerLabel} />
      )}
    </>
  );
}
