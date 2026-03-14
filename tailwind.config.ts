import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Cyber palette — named tokens
        'cb-electric': 'var(--cb-electric)',  // cyan-500
        'cb-purple':   'var(--cb-purple)',    // purple-500
        'cb-orange':   'var(--cb-orange)',    // orange-500
        'cb-red':      'var(--cb-red)',       // red-500
        'cb-amber':    'var(--cb-amber)',     // amber-500
        'cb-green':    'var(--cb-green)',     // green-500
        // Theme aliases (legacy compat)
        accent:           'var(--cb-electric)',
        'accent-green':   'var(--cb-green)',
        surface:          'var(--th-card)',
        'surface-2':      'var(--th-input)',
        'th-bg':    'var(--th-bg)',
        'th-card':  'var(--th-card)',
        'th-input': 'var(--th-input)',
        'th-text':  'var(--th-text)',
        'th-muted': 'var(--th-muted)',
        'th-faint': 'var(--th-faint)',
      },
      borderColor: {
        theme: 'var(--th-border)',
      },
      fontFamily: {
        mono: ['var(--font-mono)', 'JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-glow':        'pulse-glow 3s ease-in-out infinite',
        'pulse-glow-orange': 'pulse-glow-orange 2.5s ease-in-out infinite',
        'ticker':            'ticker-scroll 28s linear infinite',
        'radar':             'radar-spin 3s linear infinite',
        'shimmer':           'shimmer 1.6s linear infinite',
      },
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 8px 0 rgba(168,85,247,0.25)' },
          '50%':       { boxShadow: '0 0 24px 4px rgba(168,85,247,0.55)' },
        },
        'pulse-glow-orange': {
          '0%, 100%': { boxShadow: '0 0 8px 0 rgba(249,115,22,0.3)' },
          '50%':       { boxShadow: '0 0 24px 4px rgba(249,115,22,0.6)' },
        },
        'ticker-scroll': {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'radar-spin': {
          from: { transform: 'rotate(0deg)' },
          to:   { transform: 'rotate(360deg)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
