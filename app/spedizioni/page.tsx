import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Spedizioni e Resi — Kitwer' };

export default function SpedizioniPage() {
  return (
    <div className="min-h-screen py-10 px-5 max-w-2xl mx-auto" style={{ background: 'var(--th-bg)', color: 'var(--th-text)' }}>
      <Link href="/" className="flex items-center gap-2 text-sm mb-8" style={{ color: 'var(--th-muted)' }}>
        <ArrowLeft size={16} /> Torna allo shop
      </Link>

      <h1 className="text-2xl font-black mb-2">Spedizioni e Resi</h1>
      <p className="text-xs mb-8" style={{ color: 'var(--th-faint)' }}>Ultimo aggiornamento: febbraio 2026</p>

      <div className="space-y-6 text-sm leading-relaxed" style={{ color: 'var(--th-muted)' }}>
        <section>
          <h2 className="font-bold mb-2" style={{ color: 'var(--th-text)' }}>Tempi di consegna</h2>
          <div className="bg-[#1A1A1A] rounded-xl p-4 space-y-2">
            {[
              ['Italia standard', '3–7 giorni lavorativi'],
              ['Prodotti da importazione', '7–20 giorni lavorativi'],
              ['Consegna stimata', 'Comunicata via telefono/messaggio'],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between text-xs">
                <span style={{ color: 'var(--th-faint)' }}>{label}</span>
                <span className="font-semibold text-[#00D4FF]">{value}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="font-bold mb-2" style={{ color: 'var(--th-text)' }}>Tracking spedizione</h2>
          <p>Una volta spedito il prodotto, riceverai un codice di tracciamento tramite messaggio. Potrai seguire il tuo pacco in tempo reale su <a href="https://t.17track.net/it" target="_blank" rel="noopener noreferrer" className="text-[#00D4FF] underline">17track.net</a>.</p>
        </section>

        <section>
          <h2 className="font-bold mb-2" style={{ color: 'var(--th-text)' }}>Costi di spedizione</h2>
          <p>I costi di spedizione sono già inclusi nel prezzo mostrato sul sito. Non ci sono sorprese al checkout.</p>
        </section>

        <section>
          <h2 className="font-bold mb-2" style={{ color: 'var(--th-text)' }}>Resi e rimborsi</h2>
          <p>Hai diritto di recesso entro 14 giorni dal ricevimento del prodotto ai sensi del D.Lgs. 21/2014. Per avviare un reso, contattaci direttamente con numero d&apos;ordine e motivazione. Il rimborso viene effettuato con lo stesso metodo di pagamento utilizzato.</p>
        </section>

        <section>
          <h2 className="font-bold mb-2" style={{ color: 'var(--th-text)' }}>Prodotti difettosi</h2>
          <p>In caso di prodotto difettoso o danneggiato durante il trasporto, contattaci entro 48 ore dalla consegna con foto del danno. Provvederemo alla sostituzione o al rimborso.</p>
        </section>
      </div>
    </div>
  );
}
