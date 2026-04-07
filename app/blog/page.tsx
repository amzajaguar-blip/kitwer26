import Link from 'next/link';
import type { Metadata } from 'next';
import { getAllPosts } from '@/lib/blog/posts';
import { ArrowRight, Shield } from 'lucide-react';

export const metadata: Metadata = {
  title:       'Blog & Confronti | Kitwer26',
  description: 'Guide tattiche, confronti hardware e analisi di sicurezza digitale. Tutto quello che devi sapere prima di acquistare.',
  alternates:  { canonical: 'https://kitwer26.com/blog' },
};

export default function BlogIndexPage() {
  const posts = getAllPosts();

  return (
    <main className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-12 border-b border-cyan-500/20 pb-8">
        <div className="mb-3 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-cyan-400">
          <Shield className="h-3.5 w-3.5" />
          <span>Intel & Confronti Tattici</span>
        </div>
        <h1 className="font-mono text-3xl font-extrabold tracking-tight text-white md:text-4xl">
          Blog Kitwer26
        </h1>
        <p className="mt-3 max-w-xl text-zinc-400">
          Confronti hardware, guide di sicurezza digitale e analisi operative. Dati, non opinioni.
        </p>
      </div>

      {/* Posts grid */}
      <div className="grid gap-6 sm:grid-cols-2">
        {posts.map(post => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="group flex flex-col gap-3 rounded-none border border-zinc-700 bg-zinc-900/60 p-5 transition-all hover:border-cyan-500/40 hover:bg-zinc-900"
          >
            <div className="inline-flex w-fit items-center gap-1.5 border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-xs uppercase tracking-widest text-cyan-400">
              {post.category}
            </div>
            <h2 className="font-mono text-base font-bold leading-snug text-white group-hover:text-cyan-300 transition-colors">
              {post.title}
            </h2>
            <p className="text-sm leading-relaxed text-zinc-500 line-clamp-2">
              {post.excerpt}
            </p>
            <div className="mt-auto flex items-center justify-between">
              <span className="font-mono text-xs text-zinc-600">
                {new Date(post.updatedAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
              <ArrowRight className="h-4 w-4 text-zinc-600 transition-transform group-hover:translate-x-1 group-hover:text-cyan-400" />
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
