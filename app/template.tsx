/**
 * template.tsx — re-monta ad ogni navigazione (a differenza di layout.tsx),
 * consentendo la transizione fade-in tra le pagine.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-transition">{children}</div>
}
