'use client';
/**
 * @module import-engine/FilteredImportSection
 * Collapsible section for selecting MAGAZZINO CSV files and running filtered import.
 */
import React, { useState, useEffect, useCallback, useId } from 'react';
import { T, type FileEntry, type ImportFilesResponse } from './types';

interface FilteredImportSectionProps {
  adminSecret?: string;
  onRunImport:  (command: string) => void;
  isRunning:    boolean;
}

export function FilteredImportSection({ adminSecret, onRunImport, isRunning }: FilteredImportSectionProps): React.ReactElement {
  const bodyId = useId();
  const [isOpen,       setIsOpen]       = useState(false);
  const [files,        setFiles]        = useState<FileEntry[]>([]);
  const [selected,     setSelected]     = useState<Set<string>>(new Set());
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [fetchError,   setFetchError]   = useState<string | null>(null);
  const [fetchTick,    setFetchTick]    = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const run = async (): Promise<void> => {
      setLoadingFiles(true);
      setFetchError(null);
      try {
        const headers: HeadersInit = adminSecret ? { 'x-admin-secret': adminSecret } : {};
        const res  = await fetch('/api/admin/import/files', { headers });
        if (cancelled) return;
        if (!res.ok) {
          const err = (await res.json()) as { error?: string };
          if (!cancelled) setFetchError(err.error ?? `HTTP ${res.status}`);
          return;
        }
        const data = (await res.json()) as ImportFilesResponse;
        if (!cancelled) setFiles(data.files ?? []);
      } catch (e) {
        if (!cancelled) setFetchError(e instanceof Error ? e.message : 'Failed to fetch files');
      } finally {
        if (!cancelled) setLoadingFiles(false);
      }
    };
    void run();
    return () => { cancelled = true; };
  }, [isOpen, adminSecret, fetchTick]);

  const toggleFile = useCallback((name: string, checked: boolean) => {
    setSelected(prev => { const n = new Set(prev); checked ? n.add(name) : n.delete(name); return n; });
  }, []);

  const handleRunFiltered = useCallback(() => {
    if (selected.size === 0) return;
    const args = Array.from(selected).map(n => `MAGAZZINO/${n}`).join(' ');
    onRunImport(`import --hard-reset --force ${args}`);
  }, [selected, onRunImport]);

  return (
    <section aria-label="Filtered Import" style={{ background: T.bgPanel, border: `1px solid ${T.border}`, marginBottom: '16px' }}>
      {/* Header */}
      <button type="button" aria-expanded={isOpen} aria-controls={bodyId} onClick={() => setIsOpen(p => !p)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', minHeight: '44px', padding: '0 16px', background: 'transparent', border: 'none', borderBottom: isOpen ? `1px solid ${T.border}` : 'none', cursor: 'pointer', color: T.cyan, fontFamily: T.font, fontSize: '14px', fontWeight: 700 }}>
        <span>⚡ Filtered Import</span>
        <span aria-hidden="true" style={{ fontSize: '10px' }}>{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div id={bodyId} style={{ padding: '16px', background: T.bgCard }}>
          {/* Toolbar */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
            {[
              { label: '⟳ Refresh',    action: () => setFetchTick(n => n + 1), disabled: loadingFiles },
              { label: 'Select All',   action: () => setSelected(new Set(files.map(f => f.name))), disabled: isRunning || files.length === 0 },
              { label: 'Deselect All', action: () => setSelected(new Set()), disabled: isRunning || selected.size === 0 },
            ].map(({ label, action, disabled }) => (
              <button key={label} type="button" onClick={action} disabled={disabled}
                style={{ minHeight: '44px', minWidth: '44px', padding: '8px 14px', background: T.bgCardHover, color: disabled ? T.textDim : T.textMuted, border: `1px solid ${T.border}`, borderRadius: '4px', cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: T.font, fontSize: '13px', opacity: disabled ? 0.5 : 1 }}>
                {label}
              </button>
            ))}
          </div>

          {/* States */}
          {fetchError   && <div role="alert" style={{ color: T.red, background: T.redDark, border: `1px solid ${T.red}`, borderRadius: '4px', padding: '10px', marginBottom: '12px', fontFamily: T.font, fontSize: '13px' }}>✗ {fetchError}</div>}
          {loadingFiles && <div role="status" style={{ color: T.cyan, fontFamily: T.font, fontSize: '13px', padding: '20px 0', textAlign: 'center' }}>⟳ Loading files...</div>}
          {!loadingFiles && !fetchError && files.length === 0 && <div style={{ color: T.textMuted, fontFamily: T.font, fontSize: '13px', padding: '20px 0', textAlign: 'center' }}>No CSV files found in MAGAZZINO/</div>}

          {/* File list */}
          {!loadingFiles && files.length > 0 && (
            <div role="group" aria-label="Available CSV files" style={{ marginBottom: '12px' }}>
              {files.map((file, i) => {
                const checked = selected.has(file.name);
                return (
                  <label key={file.name} htmlFor={`fi-${i}`}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', minHeight: '44px', padding: '4px 8px', cursor: isRunning ? 'not-allowed' : 'pointer', backgroundColor: checked ? T.accentDark : 'transparent', border: `1px solid ${checked ? T.accent : T.border}`, borderRadius: '4px', marginBottom: '4px', color: T.text, fontFamily: T.font, fontSize: '13px', opacity: isRunning ? 0.6 : 1 }}>
                    <input type="checkbox" id={`fi-${i}`} checked={checked} disabled={isRunning}
                      onChange={e => toggleFile(file.name, e.target.checked)}
                      style={{ width: '18px', height: '18px', flexShrink: 0, accentColor: T.accent }} />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                    <span style={{ color: T.purple, fontSize: '11px', flexShrink: 0 }}>{(file.size / 1024).toFixed(1)} KB</span>
                  </label>
                );
              })}
            </div>
          )}

          {/* Run button */}
          <button type="button" onClick={handleRunFiltered} disabled={selected.size === 0 || isRunning}
            aria-label={`Run filtered import for ${selected.size} file(s)`}
            style={{ minHeight: '44px', width: '100%', padding: '12px 18px', background: selected.size > 0 && !isRunning ? T.cyan : T.bgCardHover, color: selected.size > 0 && !isRunning ? T.bgPrimary : T.textDim, border: 'none', borderRadius: '4px', cursor: selected.size === 0 || isRunning ? 'not-allowed' : 'pointer', fontFamily: T.font, fontSize: '14px', fontWeight: 700, opacity: selected.size === 0 || isRunning ? 0.5 : 1 }}>
            {isRunning ? '⟳ Running...' : `▶ Run Filtered Import (${selected.size} file${selected.size !== 1 ? 's' : ''})`}
          </button>
        </div>
      )}
    </section>
  );
}
