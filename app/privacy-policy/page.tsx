import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Privacy Policy — Kitwer' };

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen py-10 px-5 max-w-2xl mx-auto" style={{ background: 'var(--th-bg)', color: 'var(--th-text)' }}>
      <Link href="/" className="flex items-center gap-2 text-sm mb-8" style={{ color: 'var(--th-muted)' }}>
        <ArrowLeft size={16} /> Torna allo shop
      </Link>

      <h1 className="text-2xl font-black mb-2">Privacy Policy</h1>
      <p className="text-xs mb-8" style={{ color: 'var(--th-faint)' }}>Ultimo aggiornamento: febbraio 2026</p>

      <div className="space-y-6 text-sm leading-relaxed" style={{ color: 'var(--th-muted)' }}>
        <section>
          <h2 className="font-bold mb-2" style={{ color: 'var(--th-text)' }}>1. Titolare del trattamento</h2>
          <p>Il titolare del trattamento dei dati è Kitwer, con sede in Italia. Per qualsiasi richiesta relativa ai tuoi dati personali puoi contattarci tramite i recapiti indicati nel sito.</p>
        </section>

        <section>
          <h2 className="font-bold mb-2" style={{ color: 'var(--th-text)' }}>2. Dati raccolti</h2>
          <p>Raccogliamo i seguenti dati esclusivamente ai fini della gestione degli ordini:</p>
          <ul className="list-disc ml-5 mt-2 space-y-1">
            <li>Nome e cognome</li>
            <li>Indirizzo di spedizione</li>
            <li>Numero di telefono</li>
            <li>Indirizzo email (opzionale)</li>
          </ul>
        </section>

        <section>
          <h2 className="font-bold mb-2" style={{ color: 'var(--th-text)' }}>3. Finalità del trattamento</h2>
          <p>I dati raccolti vengono utilizzati esclusivamente per elaborare e gestire il tuo ordine, contattarti per confermare la spedizione e gestire eventuali resi.</p>
        </section>

        <section>
          <h2 className="font-bold mb-2" style={{ color: 'var(--th-text)' }}>4. Base giuridica</h2>
          <p>Il trattamento è necessario per l&apos;esecuzione di un contratto di cui l&apos;interessato è parte (art. 6 comma 1 lett. b GDPR).</p>
        </section>

        <section>
          <h2 className="font-bold mb-2" style={{ color: 'var(--th-text)' }}>5. Conservazione dei dati</h2>
          <p>I dati vengono conservati per il tempo strettamente necessario alla gestione dell&apos;ordine e per gli obblighi fiscali previsti dalla legge italiana (max 10 anni).</p>
        </section>

        <section>
          <h2 className="font-bold mb-2" style={{ color: 'var(--th-text)' }}>6. Diritti dell&apos;interessato</h2>
          <p>Hai il diritto di accedere, rettificare e cancellare i tuoi dati personali contattandoci direttamente.</p>
        </section>

        <section>
          <h2 className="font-bold mb-2" style={{ color: 'var(--th-text)' }}>7. Cookie e Google AdSense</h2>
          <p>Questo sito utilizza Google AdSense, un servizio di pubblicità fornito da Google LLC. Google AdSense utilizza cookie (incluso il cookie DART) per pubblicare annunci personalizzati basati sulla tua navigazione su questo e altri siti.</p>
          <ul className="list-disc ml-5 mt-2 space-y-1">
            <li>Google, in qualità di fornitore terzo, utilizza i cookie per pubblicare annunci su questo sito.</li>
            <li>L&apos;utilizzo del cookie DART consente a Google di mostrare annunci pertinenti in base alle visite degli utenti a questo sito e ad altri siti.</li>
            <li>Gli utenti possono rinunciare all&apos;utilizzo del cookie DART visitando la{' '}
              <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-[#00D4FF] underline">
                pagina delle impostazioni degli annunci Google
              </a>.
            </li>
          </ul>
          <p className="mt-2">Per informazioni dettagliate sui cookie, consulta la nostra <Link href="/cookie-policy" className="text-[#00D4FF] underline">Cookie Policy</Link>.</p>
        </section>

        <section>
          <h2 className="font-bold mb-2" style={{ color: 'var(--th-text)' }}>8. Affiliazione Amazon</h2>
          <p>In qualità di Affiliato Amazon, kitwer26.com riceve un guadagno per ciascun acquisto idoneo effettuato tramite i link presenti su questo sito. I prezzi dei prodotti e la disponibilità sono accurati alla data/ora indicata e sono soggetti a modifiche. Qualsiasi informazione su prezzi e disponibilità visualizzata su Amazon al momento dell&apos;acquisto si applicherà all&apos;acquisto del prodotto.</p>
          <p className="mt-2">Quando clicchi su un link di prodotto, sarai reindirizzato al sito Amazon.it per completare l&apos;acquisto.</p>
        </section>
      </div>
    </div>
  );
}
