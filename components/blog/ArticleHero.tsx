'use client';

import { motion } from 'framer-motion';
import { Clock, Tag } from 'lucide-react';
import GeneratedBlogVisual from './GeneratedBlogVisual';
import TrustBadge from './TrustBadge';

interface ArticleHeroProps {
  slug:        string;
  title:       string;
  excerpt:     string;
  author:      string;
  authorRole:  string;
  updatedAt:   string;
  category:    string;
  tags:        string[];
  winnerLabel?: string;
}

function getCategoryVariant(category: string): 'defcon' | 'verified' | 'top-rated' | 'bundle' {
  const c = category.toLowerCase();
  if (c.includes('crypto') || c.includes('security')) return 'defcon';
  if (c.includes('fpv') || c.includes('droni')) return 'top-rated';
  return 'verified';
}

export default function ArticleHero({
  slug, title, excerpt, author, authorRole, updatedAt, category, tags, winnerLabel,
}: ArticleHeroProps) {
  const dateFormatted = new Date(updatedAt).toLocaleDateString('it-IT', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  return (
    <header className="relative mb-12 overflow-hidden">
      {/* Full-bleed background panel */}
      <div className="absolute inset-x-[-100vw] inset-y-0 -z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(6,182,212,0.08),transparent)]" />

      {/* Scanlines */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[repeating-linear-gradient(0deg,transparent,transparent_3px,rgba(6,182,212,0.012)_3px,rgba(6,182,212,0.012)_4px)]" />

      {/* Top border accent */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mb-8 h-px origin-left bg-gradient-to-r from-cyan-500/80 via-cyan-500/20 to-transparent"
      />

      <div className="space-y-6 pb-10">
        {/* Category + winner badges */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-wrap items-center gap-2"
        >
          <TrustBadge variant={getCategoryVariant(category)} label={category} />
          {winnerLabel && (
            <TrustBadge variant="bundle" label={`Vincitore: ${winnerLabel}`} />
          )}
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
          className="font-mono text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-3xl md:text-4xl lg:text-[2.6rem]"
          style={{ textShadow: '0 0 50px rgba(6,182,212,0.25)' }}
        >
          {title}
        </motion.h1>

        {/* Excerpt */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.14 }}
          className="max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg"
        >
          {excerpt}
        </motion.p>

        {/* Meta */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.22 }}
          className="flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-xs text-zinc-600"
        >
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 shadow-[0_0_5px_rgba(6,182,212,0.9)]" />
            <span className="text-zinc-400">{author}</span>
            <span>·</span>
            <span>{authorRole}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            <span>{dateFormatted}</span>
          </div>
        </motion.div>

        {/* Tags */}
        {tags.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="flex flex-wrap items-center gap-2"
          >
            <Tag className="h-3 w-3 text-zinc-700" />
            {tags.map(tag => (
              <span
                key={tag}
                className="border border-zinc-800 bg-zinc-900 px-2 py-0.5 font-mono text-[10px] text-zinc-600"
              >
                {tag}
              </span>
            ))}
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
        >
          <GeneratedBlogVisual
            title={title}
            category={category}
            excerpt={excerpt}
            badge={`${slug.slice(0, 18).replace(/-/g, ' ')} / review`}
            variant="hero"
          />
        </motion.div>
      </div>

      {/* Bottom divider */}
      <div className="h-px bg-gradient-to-r from-cyan-500/30 via-zinc-700/40 to-transparent" />
    </header>
  );
}
