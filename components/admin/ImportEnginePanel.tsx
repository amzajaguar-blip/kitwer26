'use client';
/**
 * @module ImportEnginePanel
 * Admin import engine — thin orchestrator.
 * Logic split into: CommandButton · TerminalOutput · FilteredImportSection
 */
import React, { useState, useCallback, useRef } from 'react';
import { T, COMMANDS, UNIFIED_COMMANDS, type TerminalLine } from './import-engine/types';
import { CommandButton }          from './import-engine/CommandButton';
import { TerminalOutput }         from './import-engine/TerminalOutput';
import { FilteredImportSection }  from './import-engine/FilteredImportSection';
import { RevalidateSection }      from './import-engine/RevalidateSection';

interface ImportEnginePanelProps {
  adminSecret?: string;
}

export default function ImportEnginePanel({ adminSecret }: ImportEnginePanelProps): React.ReactElement {
  const [isRunning, setIsRunning] = useState(false);
  const [lines,     setLines]     = useState<TerminalLine[]>([]);
  const lineCounter               = useRef(0);

  const addLine = useCallback((text: string, type: TerminalLine['type']): void => {
    lineCounter.current += 1;
    const id = `l-${lineCounter.current}`;
    setLines(prev => [...prev.slice(-500), { id, text, type }]);
  }, []);

  const clearLines = useCallback(() => { setLines([]); }, []);

  const runCommand = useCallback(async (command: string): Promise<void> => {
    if (isRunning) return;
    setIsRunning(true);
    addLine(`❯ ${command}`, 'command');

    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (adminSecret) headers['x-admin-secret'] = adminSecret;

      const res = await fetch('/api/admin/import/stream', {
        method: 'POST', headers,
        body: JSON.stringify({ command }),
      });

      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        addLine(`✗ ${err.error ?? `HTTP ${res.status}`}`, 'error');
        setIsRunning(false);
        return;
      }

      if (!res.body) { addLine('✗ No response body', 'error'); setIsRunning(false); return; }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let   buffer  = '';

      const processChunk = (chunk: string): void => {
        buffer += chunk;
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';
        for (const block of events) {
          if (!block.trim()) continue;
          const eventType = block.match(/^event: (.+)$/m)?.[1]?.trim() ?? 'info';
          const rawData   = block.match(/^data: (.+)$/m)?.[1]?.trim()  ?? '';
          let   message   = rawData;
          try {
            const p = JSON.parse(rawData) as { message?: string; data?: string };
            message = p.message ?? p.data ?? rawData;
          } catch { /* raw string */ }
          if (message) addLine(message, eventType === 'success' ? 'success' : eventType === 'error' ? 'error' : eventType === 'warn' ? 'warn' : eventType === 'done' ? 'done' : 'info');
          if (eventType === 'done') setIsRunning(false);
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) { setIsRunning(false); break; }
        processChunk(decoder.decode(value, { stream: true }));
      }
    } catch (e) {
      addLine(`✗ ${e instanceof Error ? e.message : 'Connection failed'}`, 'error');
      setIsRunning(false);
    }
  }, [isRunning, adminSecret, addLine]);

  return (
    <div style={{ background: T.bgPrimary, minHeight: '100vh', padding: '24px', fontFamily: T.font, color: T.text }}>
      <header style={{ marginBottom: '24px', borderBottom: `1px solid ${T.border}`, paddingBottom: '16px' }}>
        <h1 style={{ color: T.cyan, fontSize: '20px', fontWeight: 700, margin: 0, fontFamily: T.font }}>⚙ Import Engine</h1>
        <p  style={{ color: T.textMuted, fontSize: '13px', margin: '6px 0 0', fontFamily: T.font }}>Admin-only · Authenticated via ADMIN_API_SECRET</p>
      </header>

      {/* Kitwer Tools (con scraping Amazon) */}
      <section aria-label="Import commands" style={{ marginBottom: '24px' }}>
        <h2 style={{ color: T.textMuted, fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 12px', fontFamily: T.font }}>Kitwer Tools (ASIN + Scraping)</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
          {COMMANDS.map(({ label, command, variant }) => (
            <CommandButton key={command} label={label} command={command} variant={variant} disabled={isRunning} onClick={runCommand} />
          ))}
        </div>
      </section>

      {/* Unified Importer (veloce, no scraping) */}
      <section aria-label="Unified importer commands" style={{ marginBottom: '24px' }}>
        <h2 style={{ color: T.textMuted, fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 4px', fontFamily: T.font }}>Unified Importer (Veloce · No-ASIN)</h2>
        <p style={{ color: T.textDim, fontSize: '11px', margin: '0 0 12px', fontFamily: T.font }}>Import diretto da CSV/XLSX — nessun scraping Amazon, 100% affidabile</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
          {UNIFIED_COMMANDS.map(({ label, command, variant }) => (
            <CommandButton key={command} label={label} command={command} variant={variant} disabled={isRunning} onClick={runCommand} />
          ))}
        </div>
      </section>

      {/* Cache Revalidation */}
      <RevalidateSection adminSecret={adminSecret} />

      {/* Filtered import */}
      <FilteredImportSection adminSecret={adminSecret} onRunImport={runCommand} isRunning={isRunning} />

      {/* Terminal */}
      <TerminalOutput lines={lines} isRunning={isRunning} onClear={clearLines} />
    </div>
  );
}
