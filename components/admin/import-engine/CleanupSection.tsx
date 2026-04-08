'use client';
/**
 * @module import-engine/CleanupSection
 * Sezione "Pulizia Catalogo" nell'Import Engine panel.
 * Chiama POST /api/admin/cleanup-catalog e riversa i log nel terminale condiviso.
 */
import React, { useState, useCallback } from 'react';
import { T, type TerminalLine }         from './types';

interface CleanupSectionProps {
  adminSecret?: string;
  isRunning:    boolean;
  onStart:      () => void;
  onDone:       () => void;
  addLine:      (text: string, type: TerminalLine['type']) => void;
}

type CleanupLog = {
  action: string;
  count:  number;
  detail: string;
  level:  'info' | 'success' | 'error';
};

type CleanupStats = {
  categoriesMerged:      number;
  nullsFixed:            number;
  sparseMerged:          number;
  totalProductsAffected: number;
};

function levelToTerminalType(level: CleanupLog['level']): TerminalLine['type'] {
  if (level === 'success') return 'success';
  if (level === 'error')   return 'error';
  return 'info';
}

export function CleanupSection({
  adminSecret,
  isRunning,
  onStart,
  onDone,
  addLine,
}: CleanupSectionProps): React.ReactElement {
  const [isCleaning, setIsCleaning] = useState(false);

  const runCleanup = useCallback(async (dryRun: boolean): Promise<void> => {
    if (isRunning || isCleaning) return;

    if (!dryRun) {
      const ok = window.confirm(
        '⚠ PULIZIA CATALOGO\n\n' +
        'Questa operazione modificherà il database:\n' +
        '• Merge categorie duplicate\n' +
        '• Fix subcategorie vuote/NULL\n' +
        '• Merge sottocategorie con 1 solo prodotto → general\n\n' +
        'Vuoi procedere?',
      );
      if (!ok) return;
    }

    setIsCleaning(true);
    onStart();
    addLine(`❯ cleanup-catalog${dryRun ? ' --dry-run' : ''}`, 'command');

    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (adminSecret) headers['x-admin-secret'] = adminSecret;

      const res = await fetch('/api/admin/cleanup-catalog', {
        method:  'POST',
        headers,
        body:    JSON.stringify({ dryRun }),
      });

      const json = await res.json() as {
        success: boolean;
        error?:  string;
        logs?:   CleanupLog[];
        stats?:  CleanupStats;
      };

      if (!res.ok || !json.success) {
        addLine(`✗ ${json.error ?? `HTTP ${res.status}`}`, 'error');
        return;
      }

      // Riversa ogni log nel terminale
      for (const log of (json.logs ?? [])) {
        addLine(log.detail, levelToTerminalType(log.level));
      }

      // Riepilogo stats
      if (json.stats) {
        const s = json.stats;
        addLine(
          `■ Stats — categorie: ${s.categoriesMerged} | NULL fix: ${s.nullsFixed} | sparse: ${s.sparseMerged} | totale: ${s.totalProductsAffected}`,
          'done',
        );
      }

      // Auto-revalida cache ISR dopo pulizia reale
      if (!dryRun && json.success) {
        try {
          const rvHeaders: HeadersInit = { 'Content-Type': 'application/json' };
          if (adminSecret) rvHeaders['x-admin-secret'] = adminSecret;
          const rvRes = await fetch('/api/admin/revalidate', {
            method: 'POST', headers: rvHeaders,
            body: JSON.stringify({ target: 'all' }),
          });
          addLine(rvRes.ok ? '✓ Cache ISR revalidata automaticamente' : `⚠ Revalidazione fallita (HTTP ${rvRes.status})`, rvRes.ok ? 'success' : 'warn');
        } catch {
          addLine('⚠ Revalidazione cache non raggiungibile', 'warn');
        }
      }
    } catch (e) {
      addLine(`✗ ${e instanceof Error ? e.message : 'Connessione fallita'}`, 'error');
    } finally {
      setIsCleaning(false);
      onDone();
    }
  }, [isRunning, isCleaning, adminSecret, onStart, onDone, addLine]);

  const busy = isRunning || isCleaning;

  const btnBase: React.CSSProperties = {
    minHeight: '44px',
    padding:   '10px 18px',
    border:    `1px solid ${T.border}`,
    borderRadius: '4px',
    cursor:    busy ? 'not-allowed' : 'pointer',
    fontFamily: T.font,
    fontSize:  '13px',
    fontWeight: 700,
    opacity:   busy ? 0.5 : 1,
    width:     '100%',
    textAlign: 'left' as const,
    transition: 'opacity 0.15s, background-color 0.15s',
  };

  return (
    <section aria-label="Pulizia catalogo" style={{ marginBottom: '24px' }}>
      <h2 style={{ color: T.textMuted, fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 4px', fontFamily: T.font }}>
        Pulizia Catalogo
      </h2>
      <p style={{ color: T.textDim, fontSize: '11px', margin: '0 0 12px', fontFamily: T.font }}>
        Merge categorie duplicate · Fix NULL · Sottocategorie sparse → general
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
        <button
          type="button"
          disabled={busy}
          onClick={() => runCleanup(true)}
          style={{ ...btnBase, backgroundColor: busy ? T.bgCard : T.bgCardHover, color: busy ? T.textDim : T.text, borderColor: busy ? T.border : T.bgCardHover }}
        >
          🔍 Dry Run (Anteprima)
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => runCleanup(false)}
          style={{ ...btnBase, backgroundColor: busy ? T.bgCard : T.yellow, color: busy ? T.textDim : T.bgPrimary, borderColor: busy ? T.border : T.yellow }}
        >
          ⚡ Esegui Pulizia
        </button>
      </div>
    </section>
  );
}
