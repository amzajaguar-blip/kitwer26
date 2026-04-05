'use client';

import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { SkeletonLineChart, SkeletonBarChart } from '@/components/TacticalSkeleton';

interface ChartDay {
  date:    string;
  visits:  number;
  revenue: number;
  orders:  number;
}

interface Props {
  data: ChartDay[] | null | undefined;
}

const GRID_COLOR = '#1a1a1a';
const AXIS_COLOR = '#3f3f46';
const CYAN       = '#22d3ee';
const ORANGE     = '#ff9a3e';
const BG         = '#050505';

function makeTooltip(type: 'visits' | 'revenue') {
  const color = type === 'visits' ? CYAN : ORANGE;
  return function TooltipContent({ active, payload, label }: {
    active?:  boolean;
    payload?: ReadonlyArray<{ value?: unknown }>;
    label?:   string;
  }) {
    if (!active || !payload?.length) return null;
    const raw = payload[0].value;
    const val = typeof raw === 'number' ? raw : 0;
    const fmt = type === 'visits' ? String(val) : `€${val.toFixed(2)}`;
    return (
      <div style={{ background: '#0a0a0a', border: `1px solid ${color}33`, padding: '8px 12px', fontFamily: 'monospace' }}>
        <p style={{ color: '#71717a', fontSize: 10 }}>{label}</p>
        <p style={{ color, fontSize: 13, fontWeight: 700 }}>{fmt}</p>
      </div>
    );
  };
}

const VisitsTooltip  = makeTooltip('visits');
const RevenueTooltip = makeTooltip('revenue');

// TacticalLoading è sostituito dai skeleton bars — rimane solo come fallback per dati vuoti post-load
function EmptyState({ label }: { label: string }) {
  return (
    <div style={{ background: BG, border: '1px solid #1c1c1c', borderRadius: 2, padding: '20px 16px', height: 200 }}
         className="flex flex-col items-center justify-center gap-2">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: AXIS_COLOR }} />
      <p className="text-[10px] tracking-widest uppercase font-mono" style={{ color: AXIS_COLOR }}>
        [ NESSUN DATO {label} ]
      </p>
    </div>
  );
}

export default function TacticalRadarChart({ data }: Props) {
  const hasData = Array.isArray(data) && data.length > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">

      {/* Traffic Radar — Line Chart Ciano */}
      <div style={{ background: BG, border: '1px solid #1c1c1c', borderRadius: 2, padding: '20px 16px 12px' }}>
        <div className="flex items-center gap-2 mb-4">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: CYAN }} />
          <span className="text-[10px] tracking-[0.2em] uppercase font-bold font-mono" style={{ color: CYAN }}>
            TRAFFIC RADAR — visite 7 giorni
          </span>
        </div>
        {hasData ? (
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: AXIS_COLOR, fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: AXIS_COLOR, fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<VisitsTooltip />} />
              <Line
                type="monotone"
                dataKey="visits"
                stroke={CYAN}
                strokeWidth={2}
                dot={{ fill: CYAN, r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: CYAN, strokeWidth: 0 }}
                style={{ filter: `drop-shadow(0 0 6px ${CYAN}88)` }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          // Skeleton inline — dati vuoti post-load (edge case: API OK ma 0 visite)
          <SkeletonLineChart label="TELEMETRY_LINK" accent={CYAN} />
        )}
      </div>

      {/* Capital Flow — Bar Chart Arancione */}
      <div style={{ background: BG, border: '1px solid #1c1c1c', borderRadius: 2, padding: '20px 16px 12px' }}>
        <div className="flex items-center gap-2 mb-4">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: ORANGE }} />
          <span className="text-[10px] tracking-[0.2em] uppercase font-bold font-mono" style={{ color: ORANGE }}>
            CAPITAL FLOW — revenue 7 giorni
          </span>
        </div>
        {hasData ? (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: AXIS_COLOR, fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: AXIS_COLOR, fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
              <Tooltip content={<RevenueTooltip />} />
              <Bar
                dataKey="revenue"
                fill={ORANGE}
                radius={[2, 2, 0, 0]}
                style={{ filter: `drop-shadow(0 0 4px ${ORANGE}66)` }}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <SkeletonBarChart label="CAPITAL_FLOW" accent={ORANGE} />
        )}
      </div>

    </div>
  );
}

// Unused export kept for potential future use
export { EmptyState };
