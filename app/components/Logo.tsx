/**
 * Logo K26 — inline SVG puro, nessun <text>, sfondo 100% trasparente.
 * La lettera "K" è un <path> geometrico per evitare qualsiasi artefatto
 * di rendering dei font nei browser.
 */
interface LogoProps {
  height?: number
  showText?: boolean
  className?: string
}

export default function Logo({ height = 44, showText = true, className = '' }: LogoProps) {
  // Icon-only: 56×52 | Full: 190×52
  const viewW = showText ? 190 : 56
  const width = Math.round((height / 52) * viewW)

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${viewW} 52`}
      width={width}
      height={height}
      aria-label="Kitwer26"
      role="img"
      className={className}
      style={{ overflow: 'visible' }}
    >
      {/* ── Esagono giallo (flat-top, R=24, centro 28,26) ── */}
      <polygon points="28,4 49,16 49,36 28,48 7,36 7,16" fill="#FFC107" />

      {/* ── K — pure path, zero dipendenze font ── */}
      {/*  Barra verticale sinistra + due diagonali che si incontrano a 28,26  */}
      <path
        d="M21,15 L21,37 M21,27 L34,15 M21,27 L34,38"
        stroke="#111116"
        strokeWidth="4.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* ── Wordmark: ITWER · 26 ── */}
      {showText && (
        <>
          {/* "ITWER" in bianco */}
          <text
            x="60"
            y="27"
            dominantBaseline="middle"
            fontFamily="system-ui,-apple-system,Arial,Helvetica,sans-serif"
            fontSize="15"
            fontWeight="700"
            fill="#f1f5f9"
            letterSpacing="0.8"
          >
            ITWER
          </text>
          {/* "26" in giallo accent */}
          <text
            x="120"
            y="27"
            dominantBaseline="middle"
            fontFamily="system-ui,-apple-system,Arial,Helvetica,sans-serif"
            fontSize="15"
            fontWeight="900"
            fill="#FFC107"
          >
            26
          </text>
        </>
      )}
    </svg>
  )
}
