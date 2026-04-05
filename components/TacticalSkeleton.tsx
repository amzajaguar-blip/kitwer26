'use client';

/**
 * TacticalSkeleton — Loading state system per KITWER26 Admin Dashboard.
 *
 * Ogni blocco usa un gradiente "laser scan" che scorre da sinistra a destra
 * in sync con l'animazione shimmer definita in tailwind.config.ts.
 * I colori accent (cyan/orange/etc.) tingono la punta del laser per
 * richiamare il widget reale che verrà mostrato.
 */

import React from 'react';

// ── Durations staggerate per i widget — rende il caricamento fluido ────────────
const STAGGER_MS = [0, 120, 240, 360];

// ── Heights preimpostate per i 7 data point dei grafici ───────────────────────
// Simulano la varianza realistica di visits/revenue su 7 giorni
const LINE_PTS_PCT = [38, 66, 50, 85, 32, 74, 58]; // % dal basso (line chart dots)
const BAR_PTS_PCT  = [42, 70, 52, 90, 38, 78, 62]; // % dal basso (bar chart bars)

// ── Base shimmer block ─────────────────────────────────────────────────────────

function Sk({
  style,
  className = '',
  accent = '#22d3ee',
  delay = 0,
}: {
  style?: React.CSSProperties;
  className?: string;
  accent?: string;
  delay?: number;
}) {
  return (
    <div
      className={`animate-shimmer ${className}`}
      style={{
        borderRadius: 1,
        background: `linear-gradient(90deg,
          #0c0c0c   0%,
          #141414  30%,
          ${accent}0d 47%,
          ${accent}1a 50%,
          ${accent}0d 53%,
          #141414  70%,
          #0c0c0c 100%)`,
        backgroundSize: '300% 100%',
        animationDelay: `${delay}ms`,
        flexShrink: 0,
        ...style,
      }}
    />
  );
}

// ── Telemetry init text ────────────────────────────────────────────────────────

function TelemetryInit({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 10 }}>
      <span
        style={{
          fontFamily: 'monospace',
          fontSize: 9,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: '#22d3ee33',
        }}
      >
        {`[ INITIALIZING_${label}... ]`}
      </span>
      <span
        style={{
          fontFamily: 'monospace',
          fontSize: 9,
          color: '#22d3ee66',
          animation: 'cursor-blink 1s step-end infinite',
        }}
      >
        ▮
      </span>
    </div>
  );
}

// ── Chart grid lines (simula CartesianGrid) ────────────────────────────────────

function GridLines() {
  return (
    <>
      {[0.2, 0.5, 0.8].map((pct) => (
        <div
          key={pct}
          style={{
            position:   'absolute',
            top:        `${(1 - pct) * 100}%`,
            left:       28,
            right:      0,
            height:     1,
            background: '#1a1a1a',
            pointerEvents: 'none',
          }}
        />
      ))}
      {/* Y-axis tick labels */}
      {[0.2, 0.5, 0.8].map((pct, i) => (
        <Sk
          key={pct}
          style={{
            position:   'absolute',
            top:        `calc(${(1 - pct) * 100}% - 3px)`,
            left:       0,
            width:      22,
            height:     7,
          }}
          delay={i * 80}
        />
      ))}
    </>
  );
}

// ── LINE CHART SKELETON ────────────────────────────────────────────────────────

export function SkeletonLineChart({
  label  = 'TELEMETRY_LINK',
  accent = '#22d3ee',
}: {
  label?:  string;
  accent?: string;
}) {
  const CHART_H = 140; // px — corrisponde a ResponsiveContainer height={160} meno padding

  return (
    <div style={{ background: '#050505', border: '1px solid #1c1c1c', borderRadius: 2, padding: '20px 16px 12px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: accent + '33', flexShrink: 0 }} />
        <Sk accent={accent} style={{ height: 9, width: '52%' }} />
      </div>

      {/* Chart body */}
      <div style={{ position: 'relative', height: CHART_H, marginBottom: 8 }}>
        <GridLines />

        {/* Dots + faint connectors */}
        <div style={{ position: 'absolute', inset: 0, paddingLeft: 30, display: 'flex', alignItems: 'flex-end', gap: 0 }}>
          {LINE_PTS_PCT.map((pct, i) => {
            const fromBottom = Math.round((pct / 100) * (CHART_H - 16));
            return (
              <div
                key={i}
                style={{
                  flex:           1,
                  height:         '100%',
                  display:        'flex',
                  flexDirection:  'column',
                  justifyContent: 'flex-end',
                  alignItems:     'center',
                  paddingBottom:  fromBottom,
                  position:       'relative',
                }}
              >
                {/* Connector to next dot */}
                {i < LINE_PTS_PCT.length - 1 && (
                  <div style={{
                    position:   'absolute',
                    bottom:     fromBottom + 2,
                    left:       '50%',
                    right:      '-50%',
                    height:     1,
                    background: accent + '22',
                  }} />
                )}
                {/* Dot */}
                <Sk
                  accent={accent}
                  delay={i * 40}
                  style={{ width: 5, height: 5, borderRadius: '50%' }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* X-axis label stubs */}
      <div style={{ display: 'flex', gap: 2, paddingLeft: 28 }}>
        {LINE_PTS_PCT.map((_, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <Sk accent={accent} delay={i * 35} style={{ height: 7, width: '65%' }} />
          </div>
        ))}
      </div>

      <TelemetryInit label={label} />
    </div>
  );
}

// ── BAR CHART SKELETON ─────────────────────────────────────────────────────────

export function SkeletonBarChart({
  label  = 'CAPITAL_FLOW',
  accent = '#ff9a3e',
}: {
  label?:  string;
  accent?: string;
}) {
  const CHART_H = 140;

  return (
    <div style={{ background: '#050505', border: '1px solid #1c1c1c', borderRadius: 2, padding: '20px 16px 12px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: accent + '33', flexShrink: 0 }} />
        <Sk accent={accent} style={{ height: 9, width: '58%' }} />
      </div>

      {/* Chart body */}
      <div style={{ position: 'relative', height: CHART_H, marginBottom: 8 }}>
        <GridLines />

        {/* Bars */}
        <div style={{
          position:   'absolute',
          bottom:     0,
          left:       30,
          right:      0,
          top:        0,
          display:    'flex',
          alignItems: 'flex-end',
          gap:        5,
          paddingBottom: 1,
        }}>
          {BAR_PTS_PCT.map((pct, i) => (
            <Sk
              key={i}
              accent={accent}
              delay={i * 45}
              style={{
                flex:         1,
                height:       Math.round((pct / 100) * (CHART_H - 4)),
                borderRadius: '2px 2px 0 0',
              }}
            />
          ))}
        </div>
      </div>

      {/* X-axis label stubs */}
      <div style={{ display: 'flex', gap: 2, paddingLeft: 28 }}>
        {BAR_PTS_PCT.map((_, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <Sk accent={accent} delay={i * 35} style={{ height: 7, width: '65%' }} />
          </div>
        ))}
      </div>

      <TelemetryInit label={label} />
    </div>
  );
}

// ── STAT WIDGET SKELETON ───────────────────────────────────────────────────────

export function SkeletonWidget({
  accent = '#22d3ee',
  delay  = 0,
}: {
  accent?: string;
  delay?:  number;
}) {
  return (
    <div
      className="rounded-sm p-4"
      style={{ border: '1px solid #1c1c1c', background: '#0a0a0a' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{
          width:        8,
          height:       8,
          borderRadius: '50%',
          background:   accent + '22',
          flexShrink:   0,
        }} />
        <Sk accent={accent} delay={delay} style={{ height: 7, width: '54%' }} />
      </div>
      <Sk accent={accent} delay={delay + 60} style={{ height: 22, width: '48%' }} />
    </div>
  );
}

// ── ORDERS TABLE SKELETON ROW ──────────────────────────────────────────────────

function SkeletonOrderRow({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="px-5 py-4"
      style={{ borderBottom: '1px solid #0f0f0f' }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Row 1: ID + status badge + customer info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Sk accent="#22d3ee" delay={delay}      style={{ height: 10, width: 90 }} />
          <Sk accent="#f59e0b" delay={delay + 40} style={{ height: 10, width: 60, borderRadius: 2 }} />
          <Sk                  delay={delay + 80} style={{ height: 9,  width: 180 }} />
        </div>
        {/* Row 2: amount + action area */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sk accent="#22c55e" delay={delay + 60}  style={{ height: 9, width: 60 }} />
          <Sk accent="#ff9a3e" delay={delay + 100} style={{ height: 9, width: 80 }} />
          <div style={{ flex: 1 }} />
          <Sk delay={delay + 120} style={{ height: 30, width: 200, borderRadius: 2 }} />
          <Sk delay={delay + 140} style={{ height: 30, width: 90,  borderRadius: 2 }} />
        </div>
      </div>
    </div>
  );
}

// ── ORDERS TABLE SKELETON ──────────────────────────────────────────────────────

export function SkeletonOrdersTable() {
  return (
    <div>
      {/* Telemetry init text */}
      <div style={{
        padding:     '10px 20px 6px',
        borderBottom: '1px solid #0a0a0a',
        display:     'flex',
        alignItems:  'center',
        gap:         6,
      }}>
        <span
          style={{
            fontFamily:    'monospace',
            fontSize:      9,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color:         '#22d3ee33',
          }}
        >
          [ INITIALIZING_TELEMETRY_LINK... ]
        </span>
        <span style={{
          fontFamily: 'monospace',
          fontSize:   9,
          color:      '#22d3ee66',
          animation:  'cursor-blink 1s step-end infinite',
        }}>
          ▮
        </span>
      </div>
      {[0, 160, 320].map((delay) => (
        <SkeletonOrderRow key={delay} delay={delay} />
      ))}
    </div>
  );
}

// ── CHART SECTION SKELETON (2 charts) ─────────────────────────────────────────

export function SkeletonChartSection() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
      <SkeletonLineChart label="TELEMETRY_LINK" accent="#22d3ee" />
      <SkeletonBarChart  label="CAPITAL_FLOW"   accent="#ff9a3e" />
    </div>
  );
}

// ── 4-WIDGET ROW SKELETON ──────────────────────────────────────────────────────

export function SkeletonWidgetRow4() {
  const ACCENTS = ['#f59e0b', '#22d3ee', '#22c55e', '#ff9a3e'];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
      {ACCENTS.map((accent, i) => (
        <SkeletonWidget key={accent} accent={accent} delay={STAGGER_MS[i]} />
      ))}
    </div>
  );
}

// ── 3-WIDGET ROW SKELETON ──────────────────────────────────────────────────────

export function SkeletonWidgetRow3() {
  const ACCENTS = ['#22d3ee', '#a855f7', '#ef4444'];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
      {ACCENTS.map((accent, i) => (
        <SkeletonWidget key={accent} accent={accent} delay={STAGGER_MS[i]} />
      ))}
    </div>
  );
}
