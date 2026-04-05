import { ImageResponse } from 'next/og';

export const runtime     = 'edge';
export const alt         = 'KITWER26 — Elite Security Protocols & Tactical Assets';
export const size        = { width: 1200, height: 630 };
export const contentType = 'image/png';

const GOLD   = '#C9A84C';
const BLACK  = '#000000';
const WHITE  = '#FFFFFF';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width:           '1200px',
          height:          '630px',
          background:      BLACK,
          display:         'flex',
          flexDirection:   'column',
          alignItems:      'center',
          justifyContent:  'center',
          fontFamily:      'monospace',
          position:        'relative',
          overflow:        'hidden',
        }}
      >
        {/* ── Subtle radial glow behind brand name ─────────────────────── */}
        <div
          style={{
            position:     'absolute',
            top:          '50%',
            left:         '50%',
            transform:    'translate(-50%, -50%)',
            width:        '700px',
            height:       '350px',
            background:   `radial-gradient(ellipse, rgba(201,168,76,0.08) 0%, transparent 70%)`,
            display:      'flex',
          }}
        />

        {/* ── Outer border frame ──────────────────────────────────────── */}
        <div
          style={{
            position:      'absolute',
            top:           '28px',
            left:          '28px',
            right:         '28px',
            bottom:        '28px',
            border:        `1px solid rgba(201,168,76,0.25)`,
            display:       'flex',
          }}
        />

        {/* ── Corner accents ───────────────────────────────────────────── */}
        {/* top-left */}
        <div style={{ position: 'absolute', top: '28px',    left: '28px',    width: '48px', height: '48px', borderTop:    `2px solid ${GOLD}`, borderLeft:   `2px solid ${GOLD}`, display: 'flex' }} />
        {/* top-right */}
        <div style={{ position: 'absolute', top: '28px',    right: '28px',   width: '48px', height: '48px', borderTop:    `2px solid ${GOLD}`, borderRight:  `2px solid ${GOLD}`, display: 'flex' }} />
        {/* bottom-left */}
        <div style={{ position: 'absolute', bottom: '28px', left: '28px',    width: '48px', height: '48px', borderBottom: `2px solid ${GOLD}`, borderLeft:   `2px solid ${GOLD}`, display: 'flex' }} />
        {/* bottom-right */}
        <div style={{ position: 'absolute', bottom: '28px', right: '28px',   width: '48px', height: '48px', borderBottom: `2px solid ${GOLD}`, borderRight:  `2px solid ${GOLD}`, display: 'flex' }} />

        {/* ── Top label ───────────────────────────────────────────────── */}
        <div
          style={{
            position:      'absolute',
            top:           '56px',
            fontSize:      '11px',
            color:         GOLD,
            letterSpacing: '6px',
            opacity:       0.55,
            textTransform: 'uppercase',
            display:       'flex',
          }}
        >
          GLOBAL SECURITY OPERATIONS
        </div>

        {/* ── Brand name ──────────────────────────────────────────────── */}
        <div
          style={{
            fontSize:      '108px',
            fontWeight:    '800',
            color:         GOLD,
            letterSpacing: '-3px',
            lineHeight:    1,
            marginBottom:  '18px',
            display:       'flex',
          }}
        >
          KITWER26
        </div>

        {/* ── Gold divider ────────────────────────────────────────────── */}
        <div
          style={{
            width:         '120px',
            height:        '1px',
            background:    GOLD,
            opacity:       0.5,
            marginBottom:  '26px',
            display:       'flex',
          }}
        />

        {/* ── Tagline ─────────────────────────────────────────────────── */}
        <div
          style={{
            fontSize:      '21px',
            color:         WHITE,
            letterSpacing: '3.5px',
            textTransform: 'uppercase',
            opacity:       0.80,
            display:       'flex',
            textAlign:     'center',
          }}
        >
          Elite Security Protocols &amp; Tactical Assets
        </div>

        {/* ── Bottom URL ──────────────────────────────────────────────── */}
        <div
          style={{
            position:      'absolute',
            bottom:        '56px',
            fontSize:      '13px',
            color:         GOLD,
            letterSpacing: '4px',
            opacity:       0.45,
            display:       'flex',
          }}
        >
          kitwer26.com
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
