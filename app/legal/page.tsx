import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Legal & Affiliate Disclosure — Kitwer26',
  description: 'Informativa affiliazione Amazon, disclaimer, privacy GDPR e termini d\'uso di Kitwer26.',
};

const SECTIONS = [
  {
    id: 'affiliate',
    tag: '[ AFFILIATE DISCLOSURE ]',
    color: 'text-orange-400',
    content: (
      <>
        <p>
          Kitwer26 partecipa al <span className="text-orange-400 font-semibold">Programma di Affiliazione Amazon EU</span>,
          un programma pubblicitario che consente ai siti di ricevere commissioni pubblicitarie tramite link ad Amazon.it.
        </p>
        <p className="mt-3">
          Ciò significa che quando acquisti un prodotto tramite i nostri link, Kitwer26 riceve una piccola commissione —
          <span className="text-zinc-300"> senza alcun costo aggiuntivo per te</span>. I prezzi mostrati sul sito
          includono la commissione di selezione e intermediazione applicata da Kitwer26.
        </p>
        <p className="mt-3 text-zinc-500 text-xs">
          I prezzi e la disponibilità indicati sono soggetti a variazione. Per informazioni aggiornate su prezzi e
          disponibilità, consulta sempre la pagina prodotto su Amazon.it.
        </p>
      </>
    ),
  },
  {
    id: 'disclaimer',
    tag: '[ DISCLAIMER ]',
    color: 'text-purple-400',
    content: (
      <>
        <p>
          Le informazioni presenti su Kitwer26 hanno scopo <span className="text-purple-400 font-semibold">puramente informativo e promozionale</span>.
          Non costituiscono consulenza finanziaria, legale o di sicurezza professionale.
        </p>
        <p className="mt-3">
          Kitwer26 seleziona i prodotti in buona fede sulla base di ricerche pubbliche e recensioni verificabili,
          ma non è responsabile di eventuali danni diretti o indiretti derivanti dall&apos;uso dei prodotti acquistati.
        </p>
        <p className="mt-3">
          Per i prodotti di sicurezza digitale (hardware wallet, dispositivi 2FA, ecc.), ricordiamo che{' '}
          <span className="text-cyan-400 font-semibold">nessun sistema è infallibile</span>. La sicurezza delle tue
          chiavi private è sempre e solo responsabilità tua.
        </p>
      </>
    ),
  },
  {
    id: 'privacy',
    tag: '[ PRIVACY POLICY — GDPR ]',
    color: 'text-cyan-400',
    content: (
      <>
        <p>
          Kitwer26 raccoglie dati in modo minimale e nel pieno rispetto del{' '}
          <span className="text-cyan-400 font-semibold">Regolamento Generale sulla Protezione dei Dati (GDPR — UE 2016/679)</span>.
        </p>
        <div className="mt-3 space-y-2 text-zinc-400">
          <div className="flex items-start gap-2">
            <span className="text-cyan-500 font-mono shrink-0">▸</span>
            <p><span className="text-zinc-300 font-semibold">Dati raccolti:</span> indirizzi IP anonimi, preferenze cookie (via consenso), interazioni con il sito per finalità analitiche aggregate.</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-cyan-500 font-mono shrink-0">▸</span>
            <p><span className="text-zinc-300 font-semibold">Terze parti:</span> Google Analytics (se abilitato dall&apos;utente), Google AdSense, Amazon Affiliate tracking cookie.</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-cyan-500 font-mono shrink-0">▸</span>
            <p><span className="text-zinc-300 font-semibold">Retention:</span> I dati analitici sono conservati per un massimo di 26 mesi, in linea con le politiche Google.</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-cyan-500 font-mono shrink-0">▸</span>
            <p><span className="text-zinc-300 font-semibold">Diritti:</span> Hai il diritto di accesso, rettifica, cancellazione, limitazione e portabilità dei tuoi dati personali.</p>
          </div>
        </div>
        <p className="mt-3">
          Per la{' '}
          <Link href="/privacy-policy" className="text-cyan-400 underline hover:text-cyan-300 transition-colors">
            Privacy Policy completa
          </Link>{' '}
          e la{' '}
          <Link href="/cookie-policy" className="text-cyan-400 underline hover:text-cyan-300 transition-colors">
            Cookie Policy
          </Link>{' '}
          visita le rispettive pagine.
        </p>
      </>
    ),
  },
  {
    id: 'terms',
    tag: '[ TERMINI D\'USO ]',
    color: 'text-green-400',
    content: (
      <>
        <p>
          L&apos;accesso e l&apos;utilizzo di Kitwer26 sono soggetti ai seguenti termini:
        </p>
        <div className="mt-3 space-y-2 text-zinc-400">
          <div className="flex items-start gap-2">
            <span className="text-green-500 font-mono shrink-0">01</span>
            <p>Il contenuto del sito è protetto da copyright. È vietata la riproduzione senza autorizzazione scritta.</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-500 font-mono shrink-0">02</span>
            <p>I link affiliati reindirizzano a siti terzi (Amazon.it) soggetti alle proprie politiche e condizioni.</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-500 font-mono shrink-0">03</span>
            <p>Kitwer26 si riserva il diritto di modificare prezzi, contenuti e selezione prodotti in qualsiasi momento.</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-500 font-mono shrink-0">04</span>
            <p>L&apos;utilizzo del sito implica l&apos;accettazione della presente informativa nella sua versione più recente.</p>
          </div>
        </div>
      </>
    ),
  },
];

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-zinc-950 blueprint-grid">
      {/* Corner borders */}
      <div className="pointer-events-none fixed inset-4 z-0">
        <span className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-cyan-500/60" />
        <span className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-cyan-500/60" />
        <span className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-cyan-500/60" />
        <span className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-cyan-500/60" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-5 py-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-mono text-xs text-zinc-500 hover:text-cyan-400 transition-colors mb-8"
        >
          <ArrowLeft size={14} /> TORNA AL DATABASE
        </Link>

        {/* Title */}
        <div className="mb-8 border border-zinc-800 bg-zinc-900/60 rounded-sm p-6">
          <p className="font-mono text-[9px] tracking-[0.4em] text-cyan-400/70 uppercase mb-2">
            DOCUMENTO UFFICIALE — REV. {new Date().getFullYear()}
          </p>
          <h1 className="font-mono font-extrabold text-2xl sm:text-3xl text-white">
            LEGAL &{' '}
            <span className="text-orange-400">DISCLOSURE</span>
          </h1>
          <p className="font-mono text-xs text-zinc-600 mt-1 tracking-widest">
            KITWER26 · AFFILIATO AMAZON IT · GDPR COMPLIANT
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-6 text-sm font-sans">
          {SECTIONS.map(({ id, tag, color, content }) => (
            <section key={id} id={id} className="border border-zinc-800 rounded-sm">
              <div className="px-4 py-2 border-b border-zinc-800 bg-zinc-900/50">
                <p className={`font-mono text-[10px] tracking-[0.25em] uppercase font-bold ${color}`}>
                  {tag}
                </p>
              </div>
              <div className="px-4 py-4 leading-relaxed text-zinc-400">
                {content}
              </div>
            </section>
          ))}

          {/* Data removal */}
          <section className="border border-red-900/40 rounded-sm bg-red-950/10">
            <div className="px-4 py-2 border-b border-red-900/40 bg-red-950/20">
              <p className="font-mono text-[10px] tracking-[0.25em] text-red-400 uppercase font-bold">
                [ RICHIESTA RIMOZIONE DATI ]
              </p>
            </div>
            <div className="px-4 py-4 leading-relaxed text-zinc-400">
              <p>
                In conformità all&apos;art. 17 del GDPR (&quot;Diritto all&apos;oblio&quot;), puoi richiedere la cancellazione
                dei tuoi dati personali in nostro possesso inviando una mail a:
              </p>
              <div className="mt-3 p-3 bg-zinc-900 border border-zinc-700 rounded-sm">
                <p className="font-mono text-sm text-cyan-400 tracking-wider">
                  privacy@kitwer26.com
                </p>
                <p className="font-mono text-[10px] text-zinc-600 mt-1">
                  OGGETTO: GDPR — Richiesta Rimozione Dati
                </p>
              </div>
              <p className="mt-3 text-xs text-zinc-500">
                Le richieste vengono elaborate entro 30 giorni dalla ricezione, come previsto dalla normativa vigente.
              </p>
            </div>
          </section>
        </div>

        {/* Watermark */}
        <div className="mt-16 text-center">
          <p className="font-mono text-[10px] tracking-[0.5em] text-zinc-800 uppercase select-none">
            KITWER26 · DOCUMENTO LEGALE · GDPR ART. 13-14
          </p>
        </div>

        <div className="mt-6 flex gap-4">
          <Link
            href="/about"
            className="font-mono text-[10px] text-zinc-700 hover:text-zinc-500 transition-colors underline"
          >
            Operative Profile
          </Link>
          <Link
            href="/privacy-policy"
            className="font-mono text-[10px] text-zinc-700 hover:text-zinc-500 transition-colors underline"
          >
            Privacy Policy
          </Link>
          <Link
            href="/cookie-policy"
            className="font-mono text-[10px] text-zinc-700 hover:text-zinc-500 transition-colors underline"
          >
            Cookie Policy
          </Link>
        </div>
      </div>
    </div>
  );
}
