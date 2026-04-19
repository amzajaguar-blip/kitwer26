import type { BlogPost } from './types';
import { casaSicura2026 }              from '@/content/blog/casa-sicura-2026';
import { cyberSecurityToolkit2026 }    from '@/content/blog/cyber-security-toolkit-2026';
import { djiMini2026 }                 from '@/content/blog/dji-mini-2026';
import { fpvCreator2026 }              from '@/content/blog/fpv-creator-2026';
import { fpvDroneGuida2026 }           from '@/content/blog/fpv-drone-guida-2026';
import { hardwareWalletConfronto2026 } from '@/content/blog/hardware-wallet-confronto-2026';
import { ledgerVsTrezor }              from '@/content/blog/ledger-vs-trezor';
import { selfCustody2026 }             from '@/content/blog/self-custody-2026';
import { simRacing2026 }               from '@/content/blog/sim-racing-2026';
import { simRacingSetup2026 }          from '@/content/blog/sim-racing-setup-2026';

const ALL_POSTS: BlogPost[] = [
  hardwareWalletConfronto2026,
  cyberSecurityToolkit2026,
  fpvDroneGuida2026,
  simRacingSetup2026,
  djiMini2026,
  fpvCreator2026,
  simRacing2026,
  casaSicura2026,
  ledgerVsTrezor,
  selfCustody2026,
].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

export function getAllPosts(): BlogPost[] {
  return ALL_POSTS;
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return ALL_POSTS.find(p => p.slug === slug);
}

export function getAllSlugs(): string[] {
  return ALL_POSTS.map(p => p.slug);
}
