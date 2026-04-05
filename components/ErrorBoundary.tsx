'use client';

import React from 'react';

// ── Tipi ──────────────────────────────────────────────────────────────────────

interface Props {
  children:    React.ReactNode;
  /** Label per identificare il modulo nel messaggio di errore (es. "CARRELLO") */
  module?:     string;
  /** Fallback custom. Se non fornito usa il terminale tattico di default. */
  fallback?:   React.ReactNode;
}

interface State {
  hasError:    boolean;
  errorCode:   string;
}

// ── ErrorBoundary (class component — richiesto da React) ──────────────────────

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorCode: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    // Genera codice errore pseudo-casuale per look terminale
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    console.error('[ErrorBoundary] Runtime error:', error);
    return { hasError: true, errorCode: code };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] componentDidCatch:', error, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, errorCode: '' });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const module = this.props.module ?? 'SISTEMA';

      return (
        <div className="flex flex-col items-center justify-center min-h-[240px] p-6 font-mono">
          <div className="w-full max-w-md border border-red-500/40 bg-[#0a0a0a] rounded-sm p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] tracking-[0.3em] text-red-500 uppercase">
                KITWER OVERWATCH — DECODIFICA FALLITA
              </span>
            </div>

            {/* Error code block */}
            <div className="bg-black/60 border border-red-500/20 rounded-sm p-4 space-y-1">
              <p className="text-red-400 text-xs">&gt; MODULO: <span className="text-white">{module}</span></p>
              <p className="text-red-400 text-xs">&gt; ERR_CODE: <span className="text-orange-400">{this.state.errorCode}</span></p>
              <p className="text-red-400 text-xs">&gt; STATUS: <span className="text-red-300">RUNTIME_EXCEPTION</span></p>
              <p className="text-th-subtle text-xs mt-2 animate-pulse">
                █ Inizializzazione protocollo di recovery...
              </p>
            </div>

            {/* Action */}
            <button
              onClick={this.handleRetry}
              className="w-full py-3 text-[11px] tracking-widest font-bold uppercase border border-cyan-500/50 text-cyan-400 bg-cyan-500/5 hover:bg-cyan-500/15 hover:border-cyan-400 transition-all rounded-sm"
            >
              [ TENTA RICONNESSIONE ]
            </button>

            <p className="text-center text-[10px] text-th-subtle">
              Se il problema persiste contatta il supporto Kitwer26.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ── HOC wrapper ───────────────────────────────────────────────────────────────

export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  module?: string,
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary module={module}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
