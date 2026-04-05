import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // ── Googlebot — explicit allow (positive crawl authority signal) ────
      {
        userAgent: 'Googlebot',
        allow:    '/',
        disallow: ['/admin/', '/api/', '/checkout/', '/track/'],
      },
      // ── Bingbot — explicit allow (covers Bing + DuckDuckGo index) ──────
      {
        userAgent: 'Bingbot',
        allow:    '/',
        disallow: ['/admin/', '/api/', '/checkout/', '/track/'],
      },
      // ── All other standard crawlers ─────────────────────────────────────
      {
        userAgent: '*',
        allow:    '/',
        disallow: ['/admin/', '/api/', '/checkout/', '/track/'],
      },
      // ── AI training data — explicit block ───────────────────────────────
      { userAgent: 'GPTBot',              disallow: '/' },
      { userAgent: 'CCBot',               disallow: '/' },
      { userAgent: 'Google-Extended',     disallow: '/' },
      { userAgent: 'anthropic-ai',        disallow: '/' },
      { userAgent: 'ClaudeBot',           disallow: '/' },
      { userAgent: 'meta-externalagent',  disallow: '/' },
      { userAgent: 'Amazonbot',           disallow: '/' },
      { userAgent: 'Bytespider',          disallow: '/' },
      { userAgent: 'Diffbot',             disallow: '/' },
      { userAgent: 'omgili',              disallow: '/' },
      { userAgent: 'FacebookBot',         disallow: '/' },
    ],
    sitemap: 'https://kitwer26.com/sitemap.xml',
    host:    'https://kitwer26.com',
  };
}
