/**
 * @module import-engine/types
 * Shared types and design tokens for the Import Engine panel.
 */

export interface TerminalLine {
  id: string;
  text: string;
  type: 'info' | 'success' | 'error' | 'warn' | 'command' | 'start' | 'done';
}

export interface FileEntry {
  name: string;
  size: number;
  mtime: string;
}

export interface ImportFilesResponse {
  files: FileEntry[];
  error?: string;
}

export interface CommandEntry {
  label: string;
  command: string;
  variant: 'primary' | 'danger' | 'secondary';
}

export const COMMANDS: CommandEntry[] = [
  { label: '▶ Import (Solo Nuovi)',  command: 'import --find-links',           variant: 'primary'   },
  { label: '▶ Import + Aggiorna',   command: 'import --upsert',               variant: 'primary'   },
  { label: '↺ Re-import Scartati',  command: 'import --from-revisione',       variant: 'secondary' },
  { label: '▶ Import Permissivo',   command: 'import --upsert --permissive',  variant: 'secondary' },
  { label: '⚠ Hard Reset + Import', command: 'import --hard-reset --force',   variant: 'danger'    },
];

/** Comandi Unified Importer — più veloce, nessun scraping Amazon */
export const UNIFIED_COMMANDS: CommandEntry[] = [
  { label: '🔍 Preview (Dry Run)',       command: 'unified --dry-run',                       variant: 'secondary' },
  { label: '⚡ Import Veloce (No-ASIN)', command: 'unified --no-asin',                       variant: 'primary'   },
  { label: '⚡ Import + Aggiorna',       command: 'unified --no-asin --upsert',              variant: 'primary'   },
  { label: '▶ Import Completo',          command: 'unified --upsert',                        variant: 'primary'   },
  { label: '▶ Import Permissivo',        command: 'unified --no-asin --upsert --permissive', variant: 'secondary' },
  { label: '▶ Permissivo (Con Scraping)',command: 'unified --permissive',                    variant: 'secondary' },
  { label: '🖼 Arricchisci Immagini',    command: 'unified --enrich-images',                  variant: 'secondary' },
  { label: '🗑 Rimuovi Senza Immagine',  command: 'unified --remove-no-image',                variant: 'danger'    },
  { label: '🪞 Dedup Immagini',          command: 'unified --remove-duplicates',              variant: 'danger'    },
  { label: '⚠ Hard Reset + Unified',    command: 'unified --hard-reset --force',             variant: 'danger'    },
];

export const T = {
  bgPrimary:   '#0a0a0f',
  bgPanel:     '#0f0f1a',
  bgCard:      '#12121f',
  bgCardHover: '#1a1a2e',
  border:      '#1a1a2e',
  text:        '#e0e0f0',
  textMuted:   '#9a9ab0',
  textDim:     '#555577',
  cyan:        '#00d4ff',
  green:       '#00ff88',
  red:         '#ff3366',
  redDark:     '#2a0a14',
  yellow:      '#ffd700',
  purple:      '#9d4edd',
  accent:      '#00d4ff',
  accentDark:  '#0a2a3a',
  font:        "'JetBrains Mono', 'Fira Code', monospace",
} as const;

export function getLineStyle(type: TerminalLine['type']): { color: string; icon: string; label: string } {
  switch (type) {
    case 'success': return { color: T.green,     icon: '✓', label: 'success' };
    case 'error':   return { color: T.red,       icon: '✗', label: 'error'   };
    case 'command': return { color: T.cyan,      icon: '❯', label: 'command' };
    case 'start':   return { color: T.yellow,    icon: '▶', label: 'start'   };
    case 'warn':    return { color: T.yellow,    icon: '⚠', label: 'warn'    };
    case 'done':    return { color: T.purple,    icon: '■', label: 'done'    };
    default:        return { color: T.textMuted, icon: '·', label: 'info'    };
  }
}
