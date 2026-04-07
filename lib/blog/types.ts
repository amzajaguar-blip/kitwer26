// ── Blog System Types ───────────────────────────────────────────────────────

export type BlogSection =
  | { type: 'markdown';         content: string }
  | { type: 'comparison_table'; headers: string[]; rows: string[][] }
  | { type: 'product_card';     productId: string }
  | { type: 'image_placeholder';id: number; alt: string }
  | { type: 'divider' }

export interface BlogProductRef {
  /** Symbolic ID used in content (e.g. "LEDGER-NX") */
  id:          string;
  /** Pattern matched against DB product name (case-insensitive contains) */
  namePattern: string;
  /** Optional: direct affiliate URL fallback */
  affiliateUrl?: string;
}

export interface BlogFAQ {
  question: string;
  answer:   string;
}

export interface BlogPost {
  slug:              string;
  title:             string;
  excerpt:           string;
  author:            string;
  authorRole:        string;
  updatedAt:         string;          // ISO date string
  category:          string;          // e.g. "Crypto Security"
  tags:              string[];
  /** Symbolic product ID for the sticky "Acquista il Vincitore" bar */
  winnerProductId?:  string;
  winnerLabel?:      string;          // e.g. "Ledger Nano X"
  faq?:              BlogFAQ[];
  /** All products referenced — used for Product schema & card fetching */
  products:          BlogProductRef[];
  sections:          BlogSection[];
}
