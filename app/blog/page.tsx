'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, Shield, Zap, Radio, Cpu, LockKeyhole, Home } from 'lucide-react';
import { getAllPosts } from '@/lib/blog/posts';
import type { BlogPost } from '@/lib/blog/types';
import GeneratedBlogVisual from '@/components/blog/GeneratedBlogVisual';

// Category → icon + color mapping
const CAT_META: Record<string, { icon: React.ReactNode; accent: string; label: string }> = {
  'Crypto Wallets': {
    icon:   <Shield className="h-3.5 w-3.5" />,
    accent: 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10',
    label:  'Crypto Wallets',
  },
  'FPV Drones': {
    icon:   <Radio className="h-3.5 w-3.5" />,
    accent: 'text-orange-400 border-orange-500/40 bg-orange-500/10',
    label:  'FPV Drones',
  },
  'Sim Racing': {
    icon:   <Zap className="h-3.5 w-3.5" />,
    accent: 'text-yellow-400 border-yellow-500/40 bg-yellow-500/10',
    label:  'Sim Racing',
  },
  'Cyber Security': {
    icon:   <Cpu className="h-3.5 w-3.5" />,
    accent: 'text-red-400 border-red-500/40 bg-red-500/10',
    label:  'Cyber Security',
  },
  'Crypto Security': {
    icon:   <LockKeyhole className="h-3.5 w-3.5" />,
    accent: 'text-sky-300 border-sky-500/40 bg-sky-500/10',
    label:  'Crypto Security',
  },
  'Smart Security': {
    icon:   <Home className="h-3.5 w-3.5" />,
    accent: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10',
    label:  'Smart Security',
  },
};
const DEFAULT_META = {
  icon:   <Shield className="h-3.5 w-3.5" />,
  accent: 'text-zinc-400 border-zinc-600/40 bg-zinc-800/40',
  label:  'Intel',
};

function getCatMeta(cat: string) {
  return CAT_META[cat] ?? DEFAULT_META;
}

const ALL_FILTER = '__all__';

const cardVariants = {
  hidden:  { opacity: 0, y: 32 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.45, delay: i * 0.07, ease: 'easeOut' as const },
  }),
};

function PostCard({ post, index }: { post: BlogPost; index: number }) {
  const meta = getCatMeta(post.category);
  const date = new Date(post.updatedAt).toLocaleDateString('it-IT', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, y: -16, transition: { duration: 0.2 } }}
      layout
    >
      <Link
        href={`/blog/${post.slug}`}
        className="group relative flex flex-col gap-4 overflow-hidden border border-zinc-800 bg-zinc-950 p-5 transition-all duration-300 hover:border-zinc-600 hover:bg-zinc-900/80"
      >
        <GeneratedBlogVisual
          title={post.title}
          category={post.category}
          excerpt={post.excerpt}
          variant="card"
          className="min-h-[11rem]"
        />

        {/* Neon corner accent */}
        <div className="pointer-events-none absolute right-0 top-0 h-16 w-16 overflow-hidden">
          <div className="absolute right-0 top-0 h-px w-8 bg-gradient-to-l from-cyan-500/60 to-transparent" />
          <div className="absolute right-0 top-0 h-8 w-px bg-gradient-to-b from-cyan-500/60 to-transparent" />
        </div>

        {/* Category chip */}
        <div className={`inline-flex w-fit items-center gap-1.5 border px-2 py-0.5 font-mono text-xs font-bold uppercase tracking-widest ${meta.accent}`}>
          {meta.icon}
          {post.category}
        </div>

        {/* Title */}
        <h2 className="font-mono text-sm font-extrabold leading-snug tracking-tight text-zinc-200 transition-colors duration-200 group-hover:text-white sm:text-base">
          {post.title}
        </h2>

        {/* Excerpt */}
        <p className="line-clamp-2 text-xs leading-relaxed text-zinc-600 group-hover:text-zinc-500 transition-colors">
          {post.excerpt}
        </p>

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between pt-2 border-t border-zinc-800/80">
          <span className="font-mono text-[10px] text-zinc-700">{date}</span>
          <div className="flex items-center gap-1 font-mono text-xs text-zinc-600 transition-all group-hover:translate-x-0.5 group-hover:text-cyan-400">
            <span>Leggi</span>
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function BlogIndexPage() {
  const posts = getAllPosts();
  const categories = Array.from(new Set(posts.map(p => p.category)));
  const [activeFilter, setActiveFilter] = useState(ALL_FILTER);

  const filtered = activeFilter === ALL_FILTER
    ? posts
    : posts.filter(p => p.category === activeFilter);

  return (
    <main className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-10">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-3 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-zinc-600"
        >
          <span className="h-px w-6 bg-cyan-500/60" />
          Intel & Confronti Tattici
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="font-mono text-3xl font-extrabold tracking-tight text-white md:text-4xl"
          style={{ textShadow: '0 0 60px rgba(6,182,212,0.15)' }}
        >
          Blog<span className="text-cyan-500">.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.12 }}
          className="mt-2 max-w-lg text-sm text-zinc-500"
        >
          Confronti hardware, analisi operative, guide di sicurezza digitale. Dati, non opinioni.
        </motion.p>
      </div>

      {/* Category filter */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.18 }}
        className="mb-8 flex flex-wrap gap-2"
      >
        <button
          onClick={() => setActiveFilter(ALL_FILTER)}
          className={`inline-flex items-center gap-1.5 border px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest transition-all ${
            activeFilter === ALL_FILTER
              ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400'
              : 'border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
          }`}
        >
          All ({posts.length})
        </button>
        {categories.map(cat => {
          const meta = getCatMeta(cat);
          const count = posts.filter(p => p.category === cat).length;
          const isActive = activeFilter === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              className={`inline-flex items-center gap-1.5 border px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest transition-all ${
                isActive ? meta.accent : 'border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
              }`}
            >
              {meta.icon}
              {cat} ({count})
            </button>
          );
        })}
      </motion.div>

      {/* Grid */}
      <motion.div layout className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {filtered.map((post, i) => (
            <PostCard key={post.slug} post={post} index={i} />
          ))}
        </AnimatePresence>
      </motion.div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-20 text-center">
          <span className="font-mono text-xs uppercase tracking-widest text-zinc-700">Nessun articolo trovato</span>
        </div>
      )}

      {/* Catalog links — internal linking */}
      <div className="mt-16 border-t border-zinc-800 pt-10">
        <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-600">
          Esplora il catalogo
        </p>
        <div className="flex flex-wrap gap-3">
          {([
            { cat: 'Crypto Wallets', label: 'Hardware Wallet' },
            { cat: 'FPV Drones',     label: 'FPV Drones'     },
            { cat: 'Sim Racing',     label: 'Sim Racing'      },
            { cat: 'Cyber Security', label: 'Cyber Security'  },
          ] as const).map(({ cat, label }) => (
            <Link
              key={cat}
              href={`/?cat=${encodeURIComponent(cat)}`}
              className="border border-zinc-800 bg-zinc-900 px-3 py-1.5 font-mono text-xs text-zinc-500 transition-all hover:border-zinc-600 hover:text-zinc-300"
            >
              {label} →
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
