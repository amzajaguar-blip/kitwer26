import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Cookie Policy — Kitwer' };

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen py-10 px-5 max-w-2xl mx-auto" style={{ background: 'var(--th-bg)', color: 'var(--th-text)' }}>
      <Link href="/" className="flex items-center gap-2 text-sm mb-8" style={{ color: 'var(--th-muted)' }}>
        <ArrowLeft size={16} /> Torna allo shop
      </Link>

      <h1 className="text-2xl font-black mb-2">Cookie Policy</h1>
      <p className="text-xs mb-8" style={{ color: 'var(--th-faint)' }}>Ultimo aggiornamento: febbraio 2026</p>

      <div className="space-y-6 text-sm leading-relaxed" style={{ color: 'var(--th-muted)' }}>
        <section>
          <h2 className="font-bold mb-2" style={{ color: 'var(--th-text)' }}>Cosa sono i cookie</h2>
          <p>I cookie sono piccoli file di testo salvati nel tuo browser quando visiti un sito. Servono a far funzionare correttamente il sito e a migliorare la tua esperienza.</p>
        </section>

        <section>
          <h2 className="font-bold mb-2" style={{ color: 'var(--th-text)' }}>Cookie tecnici (necessari)</h2>
          <p>Questi cookie sono indispensabili per il funzionamento del sito. Non richiedono il tuo consenso.</p>
          <div className="bg-[#1A1A1A] rounded-xl p-4 mt-3 space-y-3">
            {[
              { name: 'kitwer_cart', desc: 'Salva i prodotti nel carrello', duration: 'Sessione' },
              { name: 'kitwer_theme', desc: 'Memorizza la preferenza dark/light mode', duration: '1 anno' },
              { name: 'kitwer_cookies', desc: 'Ricorda la tua scelta sui cookie', duration: '1 anno' },
            ].map((c) => (
              <div key={c.name} className="text-xs space-y-0.5">
                <p className="font-mono text-[#00D4FF] font-bold">{c.name}</p>
                <p style={{ color: 'var(--th-muted)' }}>{c.desc}</p>
                <p style={{ color: 'var(--th-faint)' }}>Durata: {c.duration}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="font-bold mb-2" style={{ color: 'var(--th-text)' }}>Cookie di terze parti — Google AdSense</h2>
          <p>Questo sito utilizza Google AdSense per la pubblicazione di annunci pubblicitari. Google, in qualità di fornitore terzo, utilizza cookie per pubblicare annunci basati sulle tue visite precedenti a questo e ad altri siti.</p>
          <div className="bg-[#1A1A1A] rounded-xl p-4 mt-3 space-y-3">
            {[
              { name: 'DART (DoubleClick)', desc: 'Cookie di Google usato per mostrare annunci personalizzati su siti che usano AdSense', duration: '2 anni' },
              { name: '_gads', desc: 'Usato da Google Advertising per registrare le interazioni con gli annunci', duration: '13 mesi' },
            ].map((c) => (
              <div key={c.name} className="text-xs space-y-0.5">
                <p className="font-mono text-[#00D4FF] font-bold">{c.name}</p>
                <p style={{ color: 'var(--th-muted)' }}>{c.desc}</p>
                <p style={{ color: 'var(--th-faint)' }}>Durata: {c.duration}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs" style={{ color: 'var(--th-muted)' }}>
            Puoi disattivare i cookie personalizzati di Google visitando la pagina{' '}
            <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-[#00D4FF] underline">
              google.com/settings/ads
            </a>.
          </p>
        </section>

        <section>
          <h2 className="font-bold mb-2" style={{ color: 'var(--th-text)' }}>Come gestire i cookie</h2>
          <p>Puoi eliminare i cookie in qualsiasi momento dalle impostazioni del tuo browser. Tieni presente che disabilitare i cookie tecnici potrebbe compromettere il funzionamento del sito (es. carrello vuoto ad ogni visita).</p>
        </section>

        <section>
          <h2 className="font-bold mb-2" style={{ color: 'var(--th-text)' }}>Maggiori informazioni</h2>
          <p>Per informazioni sul trattamento dei dati personali, consulta la nostra <Link href="/privacy-policy" className="text-[#00D4FF] underline">Privacy Policy</Link>.</p>
        </section>
      </div>
    </div>
  );
}
