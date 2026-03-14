import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Termini e Condizioni — Kitwer' };

export default function TerminiCondizioniPage() {
  return (
    <div className="min-h-screen py-10 px-5 max-w-2xl mx-auto" style={{ background: 'var(--th-bg)', color: 'var(--th-text)' }}>
      <Link href="/" className="flex items-center gap-2 text-sm mb-8" style={{ color: 'var(--th-muted)' }}>
        <ArrowLeft size={16} /> Torna allo shop
      </Link>

      <h1 className="text-2xl font-black mb-2">Termini e Condizioni</h1>
      <p className="text-xs mb-8" style={{ color: 'var(--th-faint)' }}>Ultimo aggiornamento: febbraio 2026</p>

      <div className="space-y-6 text-sm leading-relaxed" style={{ color: 'var(--th-muted)' }}>
        <section>
          <h2 className="font-bold mb-2" style={{ color: 'var(--th-text)' }}>1. Il servizio Kitwer</h2>
          <p>Kitwer è un servizio di selezione e intermediazione commerciale. I prezzi mostrati sul sito includono il costo del prodotto e la commissione di servizio di Kitwer. I prodotti vengono spediti direttamente dal fornitore al cliente.</p>
        </section>

        <section>
          <h2 className="font-bold mb-2" style={{ color: 'var(--th-text)' }}>2. Ordini e pagamenti</h2>
          <p>Gli ordini sono confermati telefonicamente o via messaggio. Il pagamento avviene secondo le modalità concordate al momento della conferma dell&apos;ordine.</p>
        </section>

        <section>
          <h2 className="font-bold mb-2" style={{ color: 'var(--th-text)' }}>3. Spedizioni</h2>
          <p>Le tempistiche di spedizione variano in base alla disponibilità del prodotto e alla destinazione. Per maggiori informazioni consulta la pagina <Link href="/spedizioni" className="text-[#00D4FF] underline">Spedizioni e Resi</Link>.</p>
        </section>

        <section>
          <h2 className="font-bold mb-2" style={{ color: 'var(--th-text)' }}>4. Disponibilità dei prodotti</h2>
          <p>Kitwer si impegna a mantenere aggiornata la disponibilità dei prodotti. In caso di indisponibilità dopo l&apos;ordine, il cliente verrà contattato tempestivamente.</p>
        </section>

        <section>
          <h2 className="font-bold mb-2" style={{ color: 'var(--th-text)' }}>5. Limitazione di responsabilità</h2>
          <p>Kitwer agisce in qualità di intermediario e non è direttamente responsabile per difetti di produzione, danni durante la spedizione o ritardi imputabili al corriere.</p>
        </section>

        <section>
          <h2 className="font-bold mb-2" style={{ color: 'var(--th-text)' }}>6. Legge applicabile</h2>
          <p>I presenti termini sono regolati dalla legge italiana. Per qualsiasi controversia è competente il Foro di residenza del consumatore ai sensi del Codice del Consumo.</p>
        </section>
      </div>
    </div>
  );
}
