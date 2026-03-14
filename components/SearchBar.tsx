'use client';

interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export default function SearchBar({ value, onChange, placeholder = "Cerca prodotti..." }: SearchBarProps) {
  return (
    <div className="relative px-4 py-2">
      <svg
        className="absolute left-7 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
        style={{ color: 'var(--th-faint)' }}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>

      <input
        type="search"
        inputMode="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-11 pl-9 pr-9 rounded-2xl border text-sm transition-all duration-200 focus:outline-none focus:border-[#00D4FF] focus:ring-2 focus:ring-[#00D4FF]/30 focus:shadow-[0_0_0_4px_rgba(0,212,255,0.08)]"
        style={{
          background: 'var(--th-input)',
          color: 'var(--th-text)',
          borderColor: 'var(--th-border)',
        }}
      />

      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-7 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center transition-colors"
          style={{ color: 'var(--th-faint)' }}
          aria-label="Cancella ricerca"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <path d="M7.41 6l3.3-3.29A1 1 0 109.3 1.3L6 4.59 2.7 1.3A1 1 0 001.3 2.71L4.59 6 1.3 9.3a1 1 0 001.41 1.41L6 7.41l3.29 3.3A1 1 0 0010.7 9.3z" />
          </svg>
        </button>
      )}
    </div>
  );
}
