'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  /** Publisher ID (es. ca-pub-1234567890123456). Se vuoto, nulla viene renderizzato. */
  adClient: string;
  /** Slot ID dell'unità pubblicitaria creata in AdSense. */
  adSlot: string;
}

/**
 * Banner AdSense "di recupero" — compare solo quando l'utente
 * raggiunge il fondo della pagina senza aver aperto un prodotto.
 * Usa IntersectionObserver per caricare l'ad in modo lazy.
 */
export default function LazyAdBanner({ adClient, adSlot }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [adPushed, setAdPushed] = useState(false);

  // Mostra il banner solo se l'utente non ha mai aperto un prodotto
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    // Se in questa sessione l'utente ha già cliccato un prodotto, non mostrare l'ad
    const clicked = sessionStorage.getItem('kitwer_product_clicked');
    if (!clicked) setShouldShow(true);
  }, []);

  useEffect(() => {
    if (!shouldShow || !containerRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [shouldShow]);

  // Inizializza l'unità AdSense una sola volta, dopo che diventa visibile
  useEffect(() => {
    if (!visible || adPushed || !adClient || !adSlot) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      setAdPushed(true);
    } catch {
      // AdSense non ancora pronto — riproverà al prossimo render
    }
  }, [visible, adPushed, adClient, adSlot]);

  if (!adClient || !adSlot || !shouldShow) return null;

  return (
    <div
      ref={containerRef}
      className="w-full px-4 py-6"
      aria-label="Pubblicità"
    >
      {visible && (
        <div className="max-w-2xl mx-auto">
          <p
            className="text-[9px] uppercase tracking-widest text-center mb-2"
            style={{ color: 'var(--th-faint)' }}
          >
            Pubblicità
          </p>
          <ins
            className="adsbygoogle"
            style={{ display: 'block' }}
            data-ad-client={adClient}
            data-ad-slot={adSlot}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        </div>
      )}
    </div>
  );
}
