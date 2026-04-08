import type { BlogPost } from './types';
import { ledgerVsTrezor }  from '@/content/blog/ledger-vs-trezor';
import { djiMini2026 }     from '@/content/blog/dji-mini-2026';
import { fpvCreator2026 }  from '@/content/blog/fpv-creator-2026';
import { casaSicura2026 }  from '@/content/blog/casa-sicura-2026';
import { simRacing2026 }    from '@/content/blog/sim-racing-2026';
import { selfCustody2026 }  from '@/content/blog/self-custody-2026';

const ALL_POSTS: BlogPost[] = [
  selfCustody2026,
  ledgerVsTrezor,
  djiMini2026,
  fpvCreator2026,
  casaSicura2026,
  simRacing2026,
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
