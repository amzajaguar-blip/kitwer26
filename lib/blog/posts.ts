import type { BlogPost } from './types';
import { ledgerVsTrezor } from '@/content/blog/ledger-vs-trezor';
import { djiMini2026 }    from '@/content/blog/dji-mini-2026';

const ALL_POSTS: BlogPost[] = [
  ledgerVsTrezor,
  djiMini2026,
];

export function getAllPosts(): BlogPost[] {
  return ALL_POSTS;
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return ALL_POSTS.find(p => p.slug === slug);
}

export function getAllSlugs(): string[] {
  return ALL_POSTS.map(p => p.slug);
}
