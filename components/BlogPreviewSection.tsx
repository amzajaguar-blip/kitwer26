'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowUpRight, BookOpen, Shield, Radio, Zap, Cpu } from 'lucide-react';
import { getAllPosts } from '@/lib/blog/posts';

const CAT_ICON: Record<string, React.ReactNode> = {
  'Crypto Wallets':  <Shield className="h-3 w-3" />,
  'FPV Drones':      <Radio className="h-3 w-3" />,
  'Sim Racing':      <Zap className="h-3 w-3" />,
  'Cyber Security':  <Cpu className="h-3 w-3" />,
};

const CAT_COLOR: Record<string, string> = {
  'Crypto Wallets':  'text-cyan-400 border-cyan-500/40',
  'FPV Drones':      'text-orange-400 border-orange-500/40',
  'Sim Racing':      'text-yellow-400 border-yellow-500/40',
  'Cyber Security':  'text-red-400 border-red-500/40',
};

export default function BlogPreviewSection() {
  const posts = getAllPosts().slice(0, 3);

  return (
    <section className="border-t border-zinc-800/60 bg-zinc-950 py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-end justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-zinc-600">
              <span className="h-px w-5 bg-cyan-500/60" />
              <BookOpen className="h-3 w-3" />
              Intel & Confronti
            </div>
            <h2 className="font-mono text-xl font-extrabold tracking-tight text-white sm:text-2xl">
              Guide Tattiche
            </h2>
          </div>
          <Link
            href="/blog"
            className="group hidden items-center gap-1.5 font-mono text-xs text-zinc-500 transition-colors hover:text-cyan-400 sm:flex"
          >
            Tutti gli articoli
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          {posts.map((post, i) => {
            const catColor = CAT_COLOR[post.category] ?? 'text-zinc-400 border-zinc-600/40';
            const catIcon  = CAT_ICON[post.category] ?? <Shield className="h-3 w-3" />;

            return (
              <motion.div
                key={post.slug}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
              >
                <Link
                  href={`/blog/${post.slug}`}
                  className="group relative flex h-full flex-col gap-3 border border-zinc-800 bg-zinc-900/40 p-4 transition-all duration-300 hover:border-zinc-700 hover:bg-zinc-900"
                >
                  {/* Neon corner */}
                  <div className="pointer-events-none absolute right-0 top-0 h-12 w-12 overflow-hidden">
                    <div className="absolute right-0 top-0 h-px w-6 bg-gradient-to-l from-cyan-500/40 to-transparent" />
                    <div className="absolute right-0 top-0 h-6 w-px bg-gradient-to-b from-cyan-500/40 to-transparent" />
                  </div>

                  <div className={`inline-flex w-fit items-center gap-1 border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest ${catColor}`}>
                    {catIcon}
                    {post.category}
                  </div>

                  <h3 className="line-clamp-2 font-mono text-sm font-bold leading-snug text-zinc-200 transition-colors group-hover:text-white">
                    {post.title}
                  </h3>

                  <p className="line-clamp-2 text-xs leading-relaxed text-zinc-600">
                    {post.excerpt}
                  </p>

                  <div className="mt-auto flex items-center justify-end gap-1 font-mono text-xs text-zinc-700 transition-colors group-hover:text-cyan-500">
                    Leggi
                    <ArrowUpRight className="h-3 w-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Mobile CTA */}
        <div className="mt-6 flex justify-center sm:hidden">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 border border-zinc-700 px-4 py-2 font-mono text-xs text-zinc-400 transition-colors hover:border-cyan-500/50 hover:text-cyan-400"
          >
            Tutti gli articoli
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
