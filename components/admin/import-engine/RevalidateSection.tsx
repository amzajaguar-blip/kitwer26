'use client';
/**
 * @module RevalidateSection
 * Pulsanti di refresh cache ISR per Tactical Deals e Bundle.
 * Usa fetch diretto (non SSE) — risposta immediata con stato inline.
 */
import React, { useState, useCallback } from 'react';
import { T } from './types';

type Target = 'deals' | 'bundles' | 'all';
type BtnState = 'idle' | 'loading' | 'ok' | 'error';

interface RevalidateSectionProps {
  adminSecret?: string;
}

const BUTTONS: { target: Target; label: string; icon: string }[] = [
  { target: 'deals',   icon: '⚡', label: 'Refresh Tactical Deals' },
  { target: 'bundles', icon: '📦', label: 'Refresh Bundle'         },
  { target: 'all',     icon: '🔄', label: 'Refresh Tutto'          },
];

export function RevalidateSection({ adminSecret }: RevalidateSectionProps): React.ReactElement {
  const [states, setStates] = useState<Record<Target, BtnState>>({
    deals: 'idle', bundles: 'idle', all: 'idle',
  });

  const trigger = useCallback(async (target: Target) => {
    setStates(s => ({ ...s, [target]: 'loading' }));
    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (adminSecret) headers['x-admin-secret'] = adminSecret;
      const res = await fetch('/api/admin/revalidate', {
        method: 'POST', headers,
        body: JSON.stringify({ target }),
      });
      const newState: BtnState = res.ok ? 'ok' : 'error';
      setStates(s => ({ ...s, [target]: newState }));
      setTimeout(() => setStates(s => ({ ...s, [target]: 'idle' })), 3000);
    } catch {
      setStates(s => ({ ...s, [target]: 'error' }));
      setTimeout(() => setStates(s => ({ ...s, [target]: 'idle' })), 3000);
    }
  }, [adminSecret]);

  return (
    <section style={{ marginBottom: '24px' }}>
      <h2 style={{
        color: T.textMuted, fontSize: '11px', fontWeight: 700,
        letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 4px', fontFamily: T.font,
      }}>
        Cache Revalidation
      </h2>
      <p style={{ color: T.textDim, fontSize: '11px', margin: '0 0 12px', fontFamily: T.font }}>
        Forza aggiornamento ISR senza riavviare il server — nessun downtime
      </p>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {BUTTONS.map(({ target, icon, label }) => {
          const s = states[target];
          const isOk  = s === 'ok';
          const isErr = s === 'error';
          const bg    = isOk ? T.green : isErr ? T.red : T.bgCardHover;
          const color = isOk || isErr ? T.bgPrimary : T.text;

          return (
            <button
              key={target}
              onClick={() => trigger(target)}
              disabled={s === 'loading'}
              title={`Revalida: ${target}`}
              style={{
                padding: '8px 18px', minHeight: '44px',
                backgroundColor: s === 'loading' ? T.bgCard : bg,
                color: s === 'loading' ? T.textDim : color,
                border: `1px solid ${isOk ? T.green : isErr ? T.red : T.border}`,
                borderRadius: '4px',
                cursor: s === 'loading' ? 'wait' : 'pointer',
                fontFamily: T.font, fontSize: '13px', fontWeight: 700,
                opacity: s === 'loading' ? 0.6 : 1,
                transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              <span style={{ fontSize: '14px' }}>
                {s === 'loading' ? '⏳' : isOk ? '✓' : isErr ? '✗' : icon}
              </span>
              {s === 'ok' ? 'Aggiornato!' : s === 'error' ? 'Errore' : label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
