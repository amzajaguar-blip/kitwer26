'use client';
/**
 * @module import-engine/TerminalOutput
 * SSE terminal display with auto-scroll and clear button.
 */
import React, { useRef, useEffect, useCallback } from 'react';
import { T, getLineStyle, type TerminalLine } from './types';

interface TerminalOutputProps {
  lines:     TerminalLine[];
  isRunning: boolean;
  onClear:   () => void;
}

export function TerminalOutput({ lines, isRunning, onClear }: TerminalOutputProps): React.ReactElement {
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [lines]);

  const handleClear = useCallback(() => { onClear(); }, [onClear]);

  return (
    <section aria-label="Terminal output">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <h2 style={{ color: T.textMuted, fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0, fontFamily: T.font }}>
          Terminal
        </h2>
        <button
          type="button"
          onClick={handleClear}
          disabled={lines.length === 0}
          aria-label="Clear terminal output"
          style={{
            minHeight: '44px', minWidth: '44px', padding: '4px 12px',
            background: T.bgCardHover, color: lines.length === 0 ? T.textDim : T.textMuted,
            border: `1px solid ${T.border}`, borderRadius: '4px',
            cursor: lines.length === 0 ? 'not-allowed' : 'pointer',
            fontFamily: T.font, fontSize: '11px', opacity: lines.length === 0 ? 0.5 : 1,
          }}
        >
          Clear
        </button>
      </div>

      <div
        ref={terminalRef}
        role="log" aria-live="polite" aria-label="Import terminal output"
        style={{
          background: T.bgPanel, border: `1px solid ${T.border}`,
          padding: '16px', minHeight: '240px', maxHeight: '480px',
          overflowY: 'auto', overflowX: 'auto',
        }}
      >
        {lines.length === 0 ? (
          <div style={{ color: T.textDim, fontFamily: T.font, fontSize: '12px', userSelect: 'none' }}>
            Awaiting command...
          </div>
        ) : (
          lines.map((line) => {
            const { color, icon, label } = getLineStyle(line.type);
            return (
              <div key={line.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', color, fontFamily: T.font, fontSize: '12px', lineHeight: '1.6', marginBottom: '2px', wordBreak: 'break-all' }}>
                <span aria-label={label} style={{ flexShrink: 0, userSelect: 'none' }}>{icon}</span>
                <span>{line.text}</span>
              </div>
            );
          })
        )}
      </div>

      {/* Status bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', padding: '6px 10px', background: T.bgPanel, border: `1px solid ${T.border}` }}>
        <span aria-live="polite" aria-label={isRunning ? 'Import running' : 'Import idle'} style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: isRunning ? T.green : T.textDim, flexShrink: 0 }} />
        <span style={{ color: isRunning ? T.green : T.textDim, fontFamily: T.font, fontSize: '11px' }}>
          {isRunning ? 'Running...' : 'Idle'}
        </span>
        <span style={{ marginLeft: 'auto', color: T.textDim, fontFamily: T.font, fontSize: '11px' }}>
          {lines.length} line{lines.length !== 1 ? 's' : ''}
        </span>
      </div>
    </section>
  );
}
