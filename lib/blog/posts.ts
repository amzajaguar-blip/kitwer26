import type { BlogPost } from './types';
import { fpvDroneGuida2026 }           from '@/content/blog/fpv-drone-guida-2026';
import { simRacingSetup2026 }          from '@/content/blog/sim-racing-setup-2026';
import { hardwareWalletConfronto2026 } from '@/content/blog/hardware-wallet-confronto-2026';
import { cyberSecurityToolkit2026 }    from '@/content/blog/cyber-security-toolkit-2026';

// ── 4 canonical posts — one per category ────────────────────────────────────
const ALL_POSTS: BlogPost[] = [
  fpvDroneGuida2026,
  simRacingSetup2026,
  hardwareWalletConfronto2026,
  cyberSecurityToolkit2026,
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
