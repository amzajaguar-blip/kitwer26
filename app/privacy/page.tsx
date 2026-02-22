import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy | Kitwer26',
  description: 'Informativa sulla privacy di Kitwer26 — come raccogliamo, usiamo e proteggiamo i tuoi dati personali.',
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-bg-dark">
      {/* Header */}
      <div className="border-b border-border bg-bg-card">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <Link href="/" className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-secondary transition hover:text-accent">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Torna alla Home
          </Link>
          <h1 className="text-2xl font-bold text-text-primary md:text-3xl">Privacy Policy</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Ultimo aggiornamento: Febbraio 2026 &middot; kitwer26.vercel.app
          </p>
        </div>
      </div>

      {/* Content */}
      <article className="mx-auto max-w-3xl px-4 py-10">
        <div className="space-y-10 text-[15px] leading-relaxed text-text-secondary">

          <section>
            <h2 className="mb-3 text-lg font-bold text-text-primary">1. Titolare del Trattamento</h2>
            <p>
              Il sito <span className="font-medium text-accent">kitwer26.vercel.app</span> gestisce i dati
              degli utenti esclusivamente per finalità di vendita e spedizione dei prodotti acquistati.
              Per qualsiasi richiesta relativa ai dati personali, puoi contattarci a{' '}
              <a href="mailto:kitwer26@zohomail.eu" className="text-accent hover:underline">
                kitwer26@zohomail.eu
              </a>.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-text-primary">2. Dati Raccolti</h2>
            <p className="mb-4">Raccogliamo solo i dati strettamente necessari al completamento dell&apos;ordine:</p>
            <ul className="mb-4 space-y-2">
              {['Nome e Cognome', 'Indirizzo di spedizione', 'Indirizzo email', 'Numero di telefono'].map(item => (
                <li key={item} className="flex items-center gap-2.5 text-sm">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="flex items-start gap-3 rounded-xl border border-badge-green/20 bg-badge-green/5 px-5 py-4">
              <svg className="mt-0.5 h-5 w-5 shrink-0 text-badge-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <p className="text-sm text-badge-green">
                I dati di pagamento (numero carta, ecc.) sono gestiti esclusivamente da{' '}
                <strong>Mollie</strong> e non transitano né vengono salvati sui nostri server.
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-text-primary">3. Finalità del Trattamento</h2>
            <p className="mb-3">I dati vengono utilizzati per:</p>
            <ul className="space-y-2">
              {[
                'Elaborare l\'ordine e acquistare il prodotto dal fornitore',
                'Inviare aggiornamenti sullo stato della spedizione (tramite Resend)',
                'Assistenza clienti post-vendita',
              ].map(item => (
                <li key={item} className="flex items-start gap-2.5 text-sm">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-text-primary">4. Conservazione dei Dati</h2>
            <p>
              I dati sono salvati in modo sicuro sul database <strong className="text-text-primary">Supabase</strong>{' '}
              (infrastruttura cloud certificata ISO 27001) e non vengono mai venduti né ceduti a terzi
              per finalità commerciali o di marketing.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-text-primary">5. Diritti dell&apos;Utente</h2>
            <p className="mb-3">
              In conformità al GDPR, in ogni momento puoi richiedere:
            </p>
            <ul className="mb-4 space-y-2">
              {[
                'La cancellazione dei tuoi dati personali',
                'La rettifica di dati inesatti',
                'L\'accesso ai dati che ti riguardano',
                'La portabilità dei dati',
              ].map(item => (
                <li key={item} className="flex items-start gap-2.5 text-sm">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="text-sm">
              Per esercitare i tuoi diritti scrivi a{' '}
              <a href="mailto:kitwer26@zohomail.eu" className="text-accent hover:underline">
                kitwer26@zohomail.eu
              </a>.
              Risponderemo entro <strong className="text-text-primary">48 ore</strong>.
            </p>
          </section>

          {/* CTA */}
          <section className="rounded-2xl border border-border bg-bg-card p-6">
            <h2 className="mb-2 text-base font-bold text-text-primary">Hai domande sulla privacy?</h2>
            <p className="mb-4 text-sm">Siamo trasparenti — contattaci senza esitare.</p>
            <div className="flex flex-wrap gap-3">
              <a href="mailto:kitwer26@zohomail.eu"
                className="inline-flex items-center gap-2 rounded-xl bg-accent/10 px-5 py-2.5 text-sm font-semibold text-accent transition hover:bg-accent/20">
                kitwer26@zohomail.eu
              </a>
              <Link href="/terms"
                className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm text-text-secondary transition hover:border-accent hover:text-accent">
                Termini e Condizioni →
              </Link>
            </div>
          </section>

        </div>
      </article>
    </main>
  )
}
