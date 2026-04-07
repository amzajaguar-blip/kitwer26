'use client';

import { motion } from 'framer-motion';
import { Shield, Clock, Tag } from 'lucide-react';

interface ArticleHeroProps {
  title:      string;
  excerpt:    string;
  author:     string;
  authorRole: string;
  updatedAt:  string;
  category:   string;
  tags:       string[];
}

export default function ArticleHero({
  title, excerpt, author, authorRole, updatedAt, category, tags,
}: ArticleHeroProps) {
  const dateFormatted = new Date(updatedAt).toLocaleDateString('it-IT', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  return (
    <header className="relative overflow-hidden border-b border-cyan-500/20 pb-10 mb-10">
      {/* Scanline overlay */}
      <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(6,182,212,0.015)_2px,rgba(6,182,212,0.015)_4px)]" />

      {/* Category badge */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-4 flex items-center gap-2"
      >
        <span className="inline-flex items-center gap-1.5 rounded-none border border-cyan-500/50 bg-cyan-500/10 px-3 py-1 font-mono text-xs tracking-widest text-cyan-400 uppercase">
          <Shield className="h-3 w-3" />
          {category}
        </span>
      </motion.div>

      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.05 }}
        className="mb-4 font-mono text-3xl font-extrabold leading-tight tracking-tight text-white md:text-4xl lg:text-5xl"
        style={{ textShadow: '0 0 40px rgba(6,182,212,0.3)' }}
      >
        {title}
      </motion.h1>

      {/* Excerpt */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.12 }}
        className="mb-6 max-w-3xl text-lg leading-relaxed text-zinc-400"
      >
        {excerpt}
      </motion.p>

      {/* Meta row */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="flex flex-wrap items-center gap-4 font-mono text-xs text-zinc-500"
      >
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-cyan-500 shadow-[0_0_6px_rgba(6,182,212,0.8)]" />
          <span className="text-zinc-300">{author}</span>
          <span className="text-zinc-600">·</span>
          <span>{authorRole}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-3 w-3" />
          <span>Aggiornato: {dateFormatted}</span>
        </div>
      </motion.div>

      {/* Tags */}
      {tags.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.28 }}
          className="mt-4 flex flex-wrap items-center gap-2"
        >
          <Tag className="h-3 w-3 text-zinc-600" />
          {tags.map(tag => (
            <span
              key={tag}
              className="rounded-none border border-zinc-700 bg-zinc-900 px-2 py-0.5 font-mono text-xs text-zinc-500"
            >
              {tag}
            </span>
          ))}
        </motion.div>
      )}
    </header>
  );
}
