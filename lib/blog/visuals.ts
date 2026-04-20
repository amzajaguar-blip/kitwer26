type Motif = 'wallet' | 'drone' | 'racing' | 'smart-home' | 'security';

interface BlogVisualTheme {
  motif:       Motif;
  label:       string;
  panelClass:  string;
  borderClass: string;
  glowClass:   string;
  accentClass: string;
  textClass:   string;
}

const THEMES: Record<string, BlogVisualTheme> = {
  'Crypto Security': {
    motif:       'wallet',
    label:       'Crypto Security',
    panelClass:  'bg-[#05101a]',
    borderClass: 'border-cyan-900/40',
    glowClass:   '',
    accentClass: 'from-cyan-950/60 to-transparent',
    textClass:   'text-cyan-100',
  },
  'Crypto Wallets': {
    motif:       'wallet',
    label:       'Crypto Wallets',
    panelClass:  'bg-[#05101a]',
    borderClass: 'border-cyan-900/40',
    glowClass:   '',
    accentClass: 'from-cyan-950/60 to-transparent',
    textClass:   'text-cyan-100',
  },
  'FPV Drones': {
    motif:       'drone',
    label:       'FPV Drones',
    panelClass:  'bg-[#0d0d0d]',
    borderClass: 'border-sky-900/40',
    glowClass:   '',
    accentClass: 'from-sky-950/60 to-transparent',
    textClass:   'text-sky-100',
  },
  'Sim Racing': {
    motif:       'racing',
    label:       'Sim Racing',
    panelClass:  'bg-[#100a00]',
    borderClass: 'border-yellow-900/40',
    glowClass:   '',
    accentClass: 'from-yellow-950/60 to-transparent',
    textClass:   'text-yellow-100',
  },
  'Cyber Security': {
    motif:       'security',
    label:       'Cyber Security',
    panelClass:  'bg-[#0d0505]',
    borderClass: 'border-red-900/40',
    glowClass:   '',
    accentClass: 'from-red-950/60 to-transparent',
    textClass:   'text-red-100',
  },
  'Smart Security': {
    motif:       'smart-home',
    label:       'Smart Security',
    panelClass:  'bg-[#030e0a]',
    borderClass: 'border-emerald-900/40',
    glowClass:   '',
    accentClass: 'from-emerald-950/60 to-transparent',
    textClass:   'text-emerald-100',
  },
};

const DEFAULT_THEME: BlogVisualTheme = {
  motif:       'security',
  label:       'Tech',
  panelClass:  'bg-[#0a0a0a]',
  borderClass: 'border-zinc-800/60',
  glowClass:   '',
  accentClass: 'from-zinc-900/60 to-transparent',
  textClass:   'text-white',
};

export function getBlogVisualTheme(category: string): BlogVisualTheme {
  return THEMES[category] ?? DEFAULT_THEME;
}

const EYEBROWS: Record<string, string[]> = {
  'Crypto Security': ['Guida Hardware', 'Analisi Sicurezza', 'Confronto', 'Setup Ottimale'],
  'Crypto Wallets':  ['Guida Hardware', 'Confronto Wallet', 'Sicurezza Cripto', 'Setup'],
  'FPV Drones':      ['Guida FPV', 'Setup Drone', 'Analisi Tecnica', 'Top Pick'],
  'Sim Racing':      ['Guida Setup', 'Confronto Hardware', 'Analisi', 'Top Gear'],
  'Cyber Security':  ['Guida Sicurezza', 'Strumenti Privacy', 'Analisi', 'Best Practice'],
  'Smart Security':  ['Casa Sicura', 'Smart Home', 'Guida Setup', 'Analisi'],
};

export function getBlogVisualEyebrow(category: string, _title: string): string {
  const options = EYEBROWS[category] ?? ['Guida', 'Analisi', 'Confronto', 'Top Pick'];
  return options[0];
}
