import { ImageResponse } from 'next/og';

export const runtime = 'edge';

// 1200×630 — standard OG / Twitter large card
const W = 1200;
const H = 630;

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width:           W,
          height:          H,
          background:      '#09090b',
          display:         'flex',
          flexDirection:   'column',
          alignItems:      'center',
          justifyContent:  'center',
          fontFamily:      'monospace',
          position:        'relative',
          overflow:        'hidden',
        }}
      >
        {/* ── Outer border — classified document frame ── */}
        <div
          style={{
            position:     'absolute',
            inset:        0,
            border:       '3px solid #22c55e',
            boxShadow:    'inset 0 0 60px rgba(34,197,94,0.08)',
            display:      'flex',
          }}
        />

        {/* ── Corner markers ── */}
        {[
          { top: 16, left: 16 },
          { top: 16, right: 16 },
          { bottom: 16, left: 16 },
          { bottom: 16, right: 16 },
        ].map((pos, i) => (
          <div
            key={i}
            style={{
              position:        'absolute',
              width:           32,
              height:          32,
              border:          '2px solid #22c55e',
              borderRadius:    0,
              display:         'flex',
              ...pos,
            }}
          />
        ))}

        {/* ── Top classification banner ── */}
        <div
          style={{
            position:       'absolute',
            top:            0,
            left:           0,
            right:          0,
            background:     '#22c55e',
            color:          '#09090b',
            fontSize:       13,
            fontWeight:     700,
            letterSpacing:  '0.35em',
            textAlign:      'center',
            padding:        '6px 0',
            display:        'flex',
            justifyContent: 'center',
          }}
        >
          // DOCUMENTO RISERVATO — ACCESSO LIMITATO //
        </div>

        {/* ── Grid background lines ── */}
        <div
          style={{
            position:   'absolute',
            inset:      0,
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(34,197,94,0.04) 40px),' +
              'repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(34,197,94,0.04) 40px)',
            display: 'flex',
          }}
        />

        {/* ── Code ID top-right ── */}
        <div
          style={{
            position:      'absolute',
            top:           40,
            right:         48,
            color:         'rgba(34,197,94,0.4)',
            fontSize:      11,
            letterSpacing: '0.15em',
            display:       'flex',
          }}
        >
          REF: KW26-OPS-2026
        </div>

        {/* ── Main content ── */}
        <div
          style={{
            display:       'flex',
            flexDirection: 'column',
            alignItems:    'center',
            gap:           20,
            position:      'relative',
            zIndex:        1,
            marginTop:     16,
          }}
        >
          {/* Hexagon badge */}
          <div
            style={{
              color:         '#22c55e',
              fontSize:      40,
              letterSpacing: '0.1em',
              display:       'flex',
            }}
          >
            ⬡
          </div>

          {/* Brand name */}
          <div
            style={{
              color:         '#f8fafc',
              fontSize:      80,
              fontWeight:    900,
              letterSpacing: '0.12em',
              lineHeight:    1,
              display:       'flex',
            }}
          >
            KITWER26
          </div>

          {/* Separator line */}
          <div
            style={{
              width:      480,
              height:     1,
              background: 'linear-gradient(90deg, transparent, #22c55e, transparent)',
              display:    'flex',
            }}
          />

          {/* Tagline */}
          <div
            style={{
              color:         '#94a3b8',
              fontSize:      20,
              letterSpacing: '0.08em',
              textAlign:     'center',
              lineHeight:    1.5,
              maxWidth:      700,
              display:       'flex',
            }}
          >
            Protocolli di Sicurezza & Asset d&apos;Élite
          </div>

          {/* Description */}
          <div
            style={{
              color:         '#64748b',
              fontSize:      15,
              letterSpacing: '0.04em',
              textAlign:     'center',
              maxWidth:      620,
              display:       'flex',
            }}
          >
            Soluzioni hardware avanzate per operazioni ad alta precisione.
            Tecnologia stealth, droni tattici e visione notturna professionale.
          </div>
        </div>

        {/* ── Bottom status bar ── */}
        <div
          style={{
            position:       'absolute',
            bottom:         0,
            left:           0,
            right:          0,
            background:     'rgba(34,197,94,0.06)',
            borderTop:      '1px solid rgba(34,197,94,0.3)',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
            padding:        '10px 48px',
          }}
        >
          <span style={{ color: '#22c55e', fontSize: 11, letterSpacing: '0.2em', display: 'flex' }}>
            STATUS: ONLINE ●
          </span>
          <span style={{ color: 'rgba(148,163,184,0.5)', fontSize: 11, letterSpacing: '0.15em', display: 'flex' }}>
            kitwer26.com
          </span>
          <span style={{ color: 'rgba(148,163,184,0.4)', fontSize: 11, letterSpacing: '0.15em', display: 'flex' }}>
            SISTEMA PROTETTO
          </span>
        </div>
      </div>
    ),
    {
      width:  W,
      height: H,
    },
  );
}
