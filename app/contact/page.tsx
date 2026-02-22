import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Contattaci | Kitwer26',
  description: 'Hai bisogno di aiuto? Contatta il team Kitwer26. Risposta garantita entro 24 ore.',
}

const SUPPORT_EMAIL = 'kitwer26@zohomail.eu'
const SUPPORT_PHONE = '+39 3756443391'

export default function ContactPage() {
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
          <h1 className="text-2xl font-bold text-text-primary md:text-3xl">Contattaci</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Siamo persone reali — risposta garantita entro 24 ore, 7 giorni su 7.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="space-y-5">

          {/* Email — CTA principale */}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="group relative flex items-center gap-5 overflow-hidden rounded-2xl border border-accent/30 bg-bg-card p-6 transition-all hover:border-accent/60 hover:shadow-lg hover:shadow-accent/10"
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-accent/15 ring-1 ring-accent/30 transition group-hover:bg-accent/25">
              <svg className="h-6 w-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-text-primary group-hover:text-accent transition">Email Supporto</p>
              <p className="text-sm text-accent font-medium break-all">{SUPPORT_EMAIL}</p>
              <p className="mt-1 text-xs text-text-secondary">Risposta entro 24 ore · 7 giorni su 7</p>
            </div>
            <svg className="h-5 w-5 shrink-0 text-text-secondary/40 transition group-hover:translate-x-1 group-hover:text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </a>

          {/* Telefono */}
          <a
            href={`tel:${SUPPORT_PHONE.replace(/\s/g, '')}`}
            className="group relative flex items-center gap-5 overflow-hidden rounded-2xl border border-border bg-bg-card p-6 transition-all hover:border-neon-green/50 hover:shadow-lg hover:shadow-neon-green/5"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-neon-green/10 ring-1 ring-neon-green/20 transition group-hover:bg-neon-green/20">
              <svg className="h-6 w-6 text-neon-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-text-primary group-hover:text-neon-green transition">Telefono / WhatsApp</p>
              <p className="text-sm text-neon-green font-medium">{SUPPORT_PHONE}</p>
              <p className="mt-1 text-xs text-text-secondary">Lun–Sab 9:00–20:00</p>
            </div>
            <svg className="h-5 w-5 shrink-0 text-text-secondary/40 transition group-hover:translate-x-1 group-hover:text-neon-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </a>

          {/* Tempi risposta */}
          <div className="rounded-2xl border border-border bg-bg-card p-6">
            <h2 className="mb-4 font-bold text-text-primary">Tempi di risposta</h2>
            <div className="space-y-3">
              {[
                { icon: '📧', label: 'Email', time: 'Entro 24 ore', color: 'text-accent' },
                { icon: '📞', label: 'Telefono / WhatsApp', time: 'Lun–Sab 9:00–20:00', color: 'text-neon-green' },
                { icon: '📦', label: 'Aggiornamenti ordine', time: 'Automatici via email', color: 'text-neon-purple' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between rounded-xl border border-border bg-bg-dark px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-sm text-text-primary">{item.label}</span>
                  </div>
                  <span className={`text-xs font-semibold ${item.color}`}>{item.time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* FAQ rapida */}
          <div className="rounded-2xl border border-border bg-bg-card p-6">
            <h2 className="mb-4 font-bold text-text-primary">Domande frequenti</h2>
            <div className="space-y-4 text-sm">
              {[
                { q: 'Quanto tempo ci vuole per ricevere l\'ordine?', a: '8–12 giorni lavorativi totali (elaborazione + spedizione).' },
                { q: 'Posso tracciare il mio pacco?', a: 'Sì, riceverai il codice tracking via email non appena il corriere prende in carico il pacco.' },
                { q: 'Come funziona il reso?', a: 'Hai 14 giorni dalla ricezione per richiedere il reso. Il prodotto deve essere integro e nella confezione originale.' },
                { q: 'Il pagamento è sicuro?', a: 'Il pagamento è gestito da Mollie con crittografia SSL 256-bit. Nessun dato della carta viene salvato da noi.' },
              ].map(item => (
                <div key={item.q} className="border-b border-border pb-4 last:border-0 last:pb-0">
                  <p className="mb-1 font-semibold text-text-primary">{item.q}</p>
                  <p className="text-text-secondary">{item.a}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Link legali */}
          <div className="flex flex-wrap gap-3 pt-2">
            <Link href="/terms" className="rounded-xl border border-border px-4 py-2.5 text-sm text-text-secondary transition hover:border-accent hover:text-accent">
              Termini e Condizioni →
            </Link>
            <Link href="/privacy" className="rounded-xl border border-border px-4 py-2.5 text-sm text-text-secondary transition hover:border-accent hover:text-accent">
              Privacy Policy →
            </Link>
          </div>

        </div>
      </div>
    </main>
  )
}
