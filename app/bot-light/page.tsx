import type { Metadata } from 'next';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Kitwer26',
  description: 'Lightweight crawler-safe view.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function BotLightPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '2rem',
        background: '#09090b',
        color: '#f4f4f5',
      }}
    >
      <section style={{ maxWidth: '42rem', textAlign: 'left' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '1rem' }}>
          Kitwer26
        </h1>
        <p style={{ lineHeight: 1.7, marginBottom: '0.75rem' }}>
          Lightweight response served for automated traffic.
        </p>
        <p style={{ lineHeight: 1.7, marginBottom: '0.75rem' }}>
          Browse the main site for full category pages covering cyber security, FPV drones,
          sim racing, and crypto wallets.
        </p>
        <p style={{ lineHeight: 1.7 }}>
          This endpoint intentionally avoids personalized logic, database lookups, and
          dynamic affiliate rendering.
        </p>
      </section>
    </main>
  );
}
