'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem('kitwer_cookies')) setVisible(true);
    } catch { /* no-op */ }
  }, []);

  const accept = () => {
    try { localStorage.setItem('kitwer_cookies', 'accepted'); } catch { /* no-op */ }
    setVisible(false);
  };

  const decline = () => {
    try { localStorage.setItem('kitwer_cookies', 'declined'); } catch { /* no-op */ }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[60] p-4 border-t shadow-2xl animate-slide-up"
      style={{
        background: 'var(--th-card)',
        borderColor: 'var(--th-border)',
      }}
    >
      <div className="max-w-lg mx-auto">
        <p className="text-xs mb-3 leading-relaxed" style={{ color: 'var(--th-muted)' }}>
          🍪 Questo sito utilizza cookie tecnici per il corretto funzionamento e cookie analitici
          per migliorare l&apos;esperienza utente. Consulta la nostra{' '}
          <Link href="/cookie-policy" className="text-[#00D4FF] underline">
            Cookie Policy
          </Link>{' '}
          e la{' '}
          <Link href="/privacy-policy" className="text-[#00D4FF] underline">
            Privacy Policy
          </Link>.
        </p>
        <div className="flex gap-3">
          <button
            onClick={decline}
            className="flex-1 h-10 rounded-xl text-xs font-semibold border transition-colors"
            style={{
              background: 'var(--th-input)',
              borderColor: 'var(--th-border)',
              color: 'var(--th-muted)',
            }}
          >
            Solo necessari
          </button>
          <button
            onClick={accept}
            className="flex-1 h-10 rounded-xl text-xs font-bold bg-[#00D4FF] text-[#0A0A0A] active:scale-95 transition-transform"
          >
            Accetta tutti
          </button>
        </div>
      </div>
    </div>
  );
}
