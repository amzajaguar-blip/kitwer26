import type { ProductSpecs } from '@/types/supabase'

const SPEC_LABELS: Record<string, string> = {
  dpi: 'DPI',
  polling_rate: 'Polling Rate',
  switch_type: 'Switch',
  panel_type: 'Pannello',
  refresh_rate: 'Refresh Rate',
  response_time: 'Tempo Risposta',
  resolution: 'Risoluzione',
  connectivity: 'Connessione',
  weight_g: 'Peso',
  battery_life: 'Batteria',
  size: 'Dimensione',
  frequency_response: 'Risposta in Freq.',
  polar_pattern: 'Pattern Polare',
  vram: 'VRAM',
  tdp: 'TDP',
  cuda_cores: 'CUDA Cores',
  boost_clock: 'Boost Clock',
  layout: 'Layout',
  keycaps: 'Keycaps',
  hot_swappable: 'Hot-Swap',
  backlight: 'Retroilluminazione',
}

function formatSpecValue(key: string, value: string | number | boolean): string {
  if (typeof value === 'boolean') return value ? 'Si' : 'No'
  if (key === 'weight_g' && typeof value === 'number') return `${value}g`
  return String(value)
}

export default function TechSpecsTable({ specs }: { specs: ProductSpecs }) {
  const entries = Object.entries(specs).filter(([, v]) => v !== null && v !== undefined && v !== '')

  if (entries.length === 0) return null

  return (
    <div className="rounded-xl border border-border bg-bg-card overflow-hidden">
      <h3 className="px-4 py-3 text-sm font-semibold text-text-primary border-b border-border">
        Specifiche Tecniche
      </h3>
      <div className="divide-y divide-border">
        {entries.map(([key, value]) => (
          <div key={key} className="flex justify-between px-4 py-2.5 text-sm">
            <span className="text-text-secondary">
              {SPEC_LABELS[key] ?? key.replace(/_/g, ' ')}
            </span>
            <span className="font-medium text-text-primary">
              {formatSpecValue(key, value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
