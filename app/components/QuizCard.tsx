import { Sparkles } from 'lucide-react'
import Link from 'next/link'

export default function QuizCard() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-accent/30 bg-gradient-to-br from-bg-card via-bg-card to-neon-purple/10 p-8 md:p-10">
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent/5 blur-3xl" />
      <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-neon-purple/5 blur-3xl" />

      <div className="relative">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
          <Sparkles className="h-3.5 w-3.5" />
          Quiz Interattivo
        </div>

        <h3 className="mb-3 text-2xl font-bold text-text-primary md:text-3xl">
          Trova il tuo setup ideale
          <span className="block text-accent">in 3 domande</span>
        </h3>

        <p className="mb-6 max-w-md text-sm text-text-secondary">
          Rispondi a 3 semplici domande sul tuo stile di gioco e il tuo budget.
          Ti consigliamo il bundle perfetto per te.
        </p>

        <Link
          href="/bundles"
          className="inline-block rounded-xl bg-accent px-6 py-3 text-sm font-bold text-bg-dark transition-all hover:bg-accent-hover hover:shadow-lg hover:shadow-accent/20"
        >
          Scopri il Tuo Setup →
        </Link>
      </div>
    </div>
  )
}
