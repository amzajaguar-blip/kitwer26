/**
 * lib/affiliate.ts — Client-safe affiliate URL builder for kitwer26
 *
 * Builds Amazon affiliate links from product_url (or ASIN extraction).
 * Default tag: kitwer26-21 (Amazon.it).
 *
 * Precedence:
 *   1. product_url already contains an ASIN → extract and rebuild with tag
 *   2. product_url has no ASIN but is an Amazon URL → append tag param
 *   3. product_url is present but not Amazon → use as-is
 *   4. No product_url → null (caller should hide the button or fall back to search)
 */

const AFFILIATE_TAG = 'kitwer26-21';
const AMAZON_DOMAIN = 'www.amazon.it';

/**
 * Extracts ASIN from any Amazon URL.
 * Returns null if none found.
 */
function extractAsin(url: string): string | null {
  const match = url.match(/\/dp\/([A-Z0-9]{10})(?:[/?#]|$)/i);
  return match ? match[1].toUpperCase() : null;
}

/**
 * Returns true if the URL is an Amazon domain.
 */
function isAmazonUrl(url: string): boolean {
  return /amazon\.(it|com|de|fr|es|co\.uk|co\.jp)/i.test(url);
}

/**
 * Appends or replaces the `tag` query parameter in an Amazon URL.
 */
function appendTag(url: string, tag: string): string {
  try {
    const u = new URL(url);
    u.searchParams.set('tag', tag);
    return u.toString();
  } catch {
    // Malformed URL — return as-is
    return url;
  }
}

/**
 * Builds the affiliate URL for a product given its product_url.
 *
 * @param productUrl - The raw URL stored in the DB (product_url column)
 * @param tag        - The affiliate tag (defaults to kitwer26-21)
 * @returns Affiliate URL string, or null if no usable URL
 */
export function buildAffiliateLink(
  productUrl: string | null | undefined,
  tag: string = AFFILIATE_TAG,
): string | null {
  if (!productUrl || !productUrl.trim()) return null;

  const url = productUrl.trim();

  if (isAmazonUrl(url)) {
    // Try ASIN extraction first — gives a clean /dp/ URL
    const asin = extractAsin(url);
    if (asin) {
      return `https://${AMAZON_DOMAIN}/dp/${asin}?tag=${tag}`;
    }
    // No ASIN found but it's an Amazon URL — append tag
    return appendTag(url, tag);
  }

  // Non-Amazon URL — return as-is (rare case: external store)
  return url;
}

/**
 * Ensures the affiliate tag appears exactly once.
 * Safe to call on URLs that may already contain the tag.
 */
export function ensureTag(url: string, tag: string = AFFILIATE_TAG): string {
  try {
    const u = new URL(url);
    u.searchParams.set('tag', tag); // set() replaces if already present
    return u.toString();
  } catch {
    return url;
  }
}

export { AFFILIATE_TAG, AMAZON_DOMAIN };
