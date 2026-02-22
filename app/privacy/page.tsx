import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy | Kitwer26',
  description: 'Informativa sulla privacy di Kitwer26 — come raccogliamo, usiamo e proteggiamo i tuoi dati.',
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
          <h1 className="text-2xl font-bold text-text-primary md:text-3xl">
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Ultimo aggiornamento: Febbraio 2026 &middot; Kitwer26
          </p>
        </div>
      </div>

      {/* Content */}
      <article className="mx-auto max-w-3xl px-4 py-10">
        <div className="space-y-10 text-[15px] leading-relaxed text-text-secondary">

          <section>
            <h2 className="mb-3 text-lg font-bold text-text-primary">1. Titolare del Trattamento</h2>
            <p>
              Il titolare del trattamento dei dati è <strong className="text-text-primary">Kitwer26</strong>,
              raggiungibile all&apos;indirizzo email{' '}
              <a href="mailto:kitwer26@zohomail.eu" className="text-accent hover:underline">
                kitwer26@zohomail.eu
              </a>.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-text-primary">2. Dati Raccolti</h2>
            <p className="mb-3">Raccogliamo i seguenti dati personali al momento dell&apos;ordine:</p>
            <ul className="space-y-2">
              {[
                'Nome e Cognome',
                'Indirizzo email',
                'Numero di telefono (opzionale)',
                'Indirizzo di spedizione',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm">
              I dati di pagamento (numero carta, ecc.) sono gestiti esclusivamente da{' '}
              <strong className="text-text-primary">Mollie</strong> e non vengono mai salvati sui nostri server.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-text-primary">3. Finalità del Trattamento</h2>
            <p className="mb-3">I dati raccolti sono utilizzati esclusivamente per:</p>
            <ul className="space-y-2">
              {[
                'Elaborare e completare il tuo ordine',
                'Inviarti aggiornamenti sullo stato della spedizione',
                'Rispondere a richieste di assistenza',
                'Adempiere agli obblighi legali e fiscali',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-text-primary">4. Condivisione dei Dati</h2>
            <p>
              I tuoi dati non vengono venduti né ceduti a terzi per finalità di marketing.
              Possono essere condivisi esclusivamente con:
            </p>
            <ul className="mt-3 space-y-2">
              {[
                'Corrieri e spedizionieri (solo indirizzo di consegna)',
                'Mollie B.V. (processore pagamenti)',
                'Supabase (infrastruttura database sicura)',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-neon-green" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-text-primary">5. Conservazione dei Dati</h2>
            <p>
              I dati degli ordini vengono conservati per <strong className="text-text-primary">10 anni</strong> in
              conformità con la normativa fiscale italiana. Puoi richiedere la cancellazione dei tuoi dati
              personali (fatta eccezione per quelli necessari agli obblighi fiscali) contattandoci via email.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-text-primary">6. I Tuoi Diritti (GDPR)</h2>
            <p className="mb-3">In conformità al Regolamento Europeo sulla Privacy (GDPR), hai diritto a:</p>
            <ul className="space-y-2">
              {[
                'Accedere ai tuoi dati personali',
                'Richiedere la rettifica di dati inesatti',
                'Richiedere la cancellazione dei dati (diritto all\'oblio)',
                'Opporti al trattamento dei tuoi dati',
                'Richiedere la portabilità dei dati',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-text-primary">7. Cookie</h2>
            <p>
              Questo sito utilizza esclusivamente cookie tecnici necessari al funzionamento.
              Non vengono utilizzati cookie di profilazione o di tracciamento di terze parti,
              salvo l&apos;eventuale attivazione di Google AdSense (che ha propria policy).
            </p>
          </section>

          {/* Contact */}
          <section className="rounded-2xl border border-border bg-bg-card p-6">
            <h2 className="mb-2 text-base font-bold text-text-primary">Contattaci per la Privacy</h2>
            <p className="mb-4 text-sm">
              Per esercitare i tuoi diritti o per qualsiasi domanda sulla privacy:
            </p>
            <a
              href="mailto:kitwer26@zohomail.eu"
              className="inline-flex items-center gap-2 rounded-xl bg-accent/10 px-5 py-2.5 text-sm font-semibold text-accent transition hover:bg-accent/20"
            >
              kitwer26@zohomail.eu
            </a>
          </section>

        </div>
      </article>
    </main>
  )
}
