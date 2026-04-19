const AFFILIATE_TAG = 'kitwer26-21';
const AMAZON_HOST_RE = /(^|\.)amazon\.(it|com|de|fr|es|co\.uk|co\.jp)$/i;

function toBinary(input: Uint8Array): string {
  let output = '';
  for (const byte of input) output += String.fromCharCode(byte);
  return output;
}

function fromBinary(input: string): Uint8Array {
  const bytes = new Uint8Array(input.length);
  for (let i = 0; i < input.length; i += 1) {
    bytes[i] = input.charCodeAt(i);
  }
  return bytes;
}

function encodeBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  return btoa(toBinary(bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  const binary = atob(`${normalized}${padding}`);
  return new TextDecoder().decode(fromBinary(binary));
}

export function isAmazonHostname(hostname: string): boolean {
  return AMAZON_HOST_RE.test(hostname.toLowerCase());
}

export function isAmazonUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return /^https?:$/i.test(parsed.protocol) && isAmazonHostname(parsed.hostname);
  } catch {
    return false;
  }
}

export function ensureTag(url: string, tag: string = AFFILIATE_TAG): string {
  const parsed = new URL(url);

  if (!isAmazonHostname(parsed.hostname)) {
    throw new Error('Affiliate cloaking is limited to Amazon URLs.');
  }

  parsed.protocol = 'https:';
  parsed.username = '';
  parsed.password = '';
  parsed.hash = '';
  parsed.searchParams.set('tag', tag);

  return parsed.toString();
}

export function wrapAmazonLink(url: string): string {
  const normalized = ensureTag(url);
  const encoded = encodeBase64Url(normalized);
  return `/go/${encoded}`;
}

function extractAsin(url: string): string | null {
  const match = url.match(/\/dp\/([A-Z0-9]{10})(?:[/?#]|$)/i);
  return match ? match[1].toUpperCase() : null;
}

export function buildAffiliateLink(productUrl: string | null | undefined): string | null {
  if (!productUrl || !productUrl.trim()) return null;

  const rawUrl = productUrl.trim();
  if (!isAmazonUrl(rawUrl)) return rawUrl;

  const asin = extractAsin(rawUrl);
  if (asin) {
    return wrapAmazonLink(`https://www.amazon.it/dp/${asin}`);
  }

  return wrapAmazonLink(rawUrl);
}

export { AFFILIATE_TAG };
