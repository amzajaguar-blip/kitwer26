import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    // Permette qualsiasi hostname HTTPS — necessario perché i prodotti Amazon
    // usano molti CDN diversi (m.media-amazon.com, images-eu.ssl-images-amazon.com,
    // eccc.) e altri prodotti possono avere immagini da sorgenti esterne.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
