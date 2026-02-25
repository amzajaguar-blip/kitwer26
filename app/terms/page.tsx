import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Termini e Condizioni di Vendita | Kitwer26',
  description: 'Leggi i termini e condizioni di vendita di Kitwer26 — Gaming Hardware & Streaming Gear.',
}

export default function TermsPage() {
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
            Termini e Condizioni di Vendita
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Ultimo aggiornamento: Febbraio 2026 &middot; Kitwer26
          </p>
        </div>
      </div>

      {/* Content */}
      <article className="mx-auto max-w-3xl px-4 py-10">
        <div className="space-y-10 text-[15px] leading-relaxed text-text-secondary">

          {/* 1 */}
          <section>
            <h2 className="mb-3 text-lg font-bold text-text-primary">1. Oggetto del Contratto</h2>
            <p>
              Il presente contratto ha per oggetto la vendita di prodotti hardware e accessori gaming
              tramite il sito <span className="font-medium text-accent">kitwer26.vercel.app</span> (o il dominio futuro).
              Il contratto si intende concluso nel momento in cui l&apos;utente riceve la mail di conferma d&apos;ordine.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="mb-3 text-lg font-bold text-text-primary">2. Processo d&apos;Acquisto e Disponibilità</h2>
            <p className="mb-3">
              Ogni ordine viene preso in carico dal nostro team entro <strong className="text-text-primary">48–72 ore</strong> dalla
              conferma del pagamento. Prima dell&apos;affidamento al corriere internazionale, ogni prodotto
              viene sottoposto a una fase di <strong className="text-text-primary">test e controllo qualità</strong> presso
              il nostro magazzino centrale, per garantire che arrivi al cliente in condizioni perfette.
            </p>
            <div className="rounded-xl border border-accent/20 bg-accent/5 px-5 py-4">
              <p className="text-sm text-text-primary">
                ✅ In caso di eccezionale indisponibilità del prodotto selezionato, il cliente verrà
                contattato e rimborsato integralmente entro <strong>24–48 ore</strong>.
              </p>
            </div>
          </section>

          {/* 3 */}
          <section>
            <h2 className="mb-3 text-lg font-bold text-text-primary">3. Tempi di Elaborazione e Spedizione</h2>
            <p className="mb-4">
              I nostri tempi di consegna sono strutturati per garantire la massima qualità del prodotto ricevuto:
            </p>
            <div className="space-y-2">
              {[
                {
                  label: 'Elaborazione ordine',
                  value: '48–72 ore',
                  desc: 'presa in carico e verifica disponibilità',
                },
                {
                  label: 'Test & Controllo Qualità',
                  value: '1–2 giorni lavorativi',
                  desc: 'ispezione prima della spedizione',
                },
                {
                  label: 'Spedizione internazionale',
                  value: '7–14 giorni lavorativi',
                  desc: 'dalla presa in carico del corriere',
                  highlight: true,
                },
              ].map((row) => (
                <div
                  key={row.label}
                  className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
                    row.highlight
                      ? 'border-accent/30 bg-accent/8'
                      : 'border-border bg-bg-card'
                  }`}
                >
                  <div>
                    <p className={`text-sm font-semibold ${row.highlight ? 'text-accent' : 'text-text-primary'}`}>
                      {row.label}
                    </p>
                    <p className="text-xs text-text-secondary">{row.desc}</p>
                  </div>
                  <span className={`shrink-0 text-sm font-bold ${row.highlight ? 'text-accent' : 'text-text-primary'}`}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Shipping summary highlight */}
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-neon-green/25 bg-neon-green/5 px-5 py-4">
              <svg className="mt-0.5 h-5 w-5 shrink-0 text-neon-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-neon-green">
                  Spedizione Standard Assicurata: 7–14 giorni lavorativi
                </p>
                <p className="mt-0.5 text-xs text-text-secondary">
                  Controllo qualità incluso prima della partenza &middot; Le date di consegna sono stime indicative.
                </p>
              </div>
            </div>
          </section>

          {/* 4 */}
          <section>
            <h2 className="mb-3 text-lg font-bold text-text-primary">4. Prezzi e Pagamenti</h2>
            <p className="mb-3">
              Tutti i prezzi sono espressi in <strong className="text-text-primary">Euro (€)</strong> e
              includono le tasse applicabili. Il pagamento avviene tramite circuiti sicuri gestiti da
              <strong className="text-text-primary"> Mollie</strong> (Carte di Credito, PayPal, Apple Pay, Google Pay).
            </p>
            <div className="flex items-start gap-3 rounded-xl border border-badge-green/20 bg-badge-green/5 px-5 py-4">
              <svg className="mt-0.5 h-5 w-5 shrink-0 text-badge-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <p className="text-sm text-badge-green">
                Nessun dato della carta viene salvato sui server di Kitwer26. Il pagamento è gestito
                interamente da Mollie con crittografia SSL 256-bit.
              </p>
            </div>
          </section>

          {/* 5 */}
          <section>
            <h2 className="mb-3 text-lg font-bold text-text-primary">5. Diritto di Recesso (Reso)</h2>
            <p className="mb-3">
              In conformità con le norme UE, il cliente ha il diritto di recedere dall&apos;acquisto
              entro <strong className="text-text-primary">14 giorni</strong> dal ricevimento della merce.
            </p>
            <ul className="space-y-2">
              {[
                'Il prodotto deve essere integro, nella confezione originale e non utilizzato.',
                'Le spese di spedizione per la restituzione sono a carico del cliente, salvo diversa indicazione.',
                'Il rimborso verrà effettuato entro 14 giorni dalla ricezione della merce restituita.',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          {/* 6 */}
          <section>
            <h2 className="mb-3 text-lg font-bold text-text-primary">6. Garanzia</h2>
            <p>
              Tutti i prodotti godono della <strong className="text-text-primary">garanzia legale di conformità</strong> secondo
              la normativa vigente. Ogni articolo viene verificato prima della spedizione. In caso di difetto
              di fabbrica, il cliente è tenuto a contattare l&apos;assistenza all&apos;indirizzo email dedicato.
            </p>
          </section>

          {/* Contact */}
          <section className="rounded-2xl border border-border bg-bg-card p-6">
            <h2 className="mb-2 text-base font-bold text-text-primary">Assistenza e Contatti</h2>
            <p className="mb-4 text-sm">
              Per qualsiasi domanda relativa a questi Termini contattaci a:
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
