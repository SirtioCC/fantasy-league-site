'use client';

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export interface CareerTrendPoint {
  season: number;
  avgPointsFor: number;
  luck: number | null;
}

function tooltipStyle() {
  return {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    fontSize: 12,
    padding: '6px 10px',
  };
}

/** Two small per-season trend lines: scoring average and luck, side by
 * side, sharing the season axis — a quick read on whether this owner is
 * trending up, down, or has just been unlucky lately. */
export function CareerTrendChart({ points }: { points: CareerTrendPoint[] }) {
  if (points.length < 2) return null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="card p-4">
        <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">Scoring Avg / Season</h3>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={points} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="season" stroke="var(--muted)" fontSize={11} />
            <YAxis
              stroke="var(--muted)"
              fontSize={11}
              width={40}
              domain={['dataMin - 2', 'dataMax + 2']}
              tickFormatter={(v) => (typeof v === 'number' ? v.toFixed(0) : String(v))}
            />
            <Tooltip
              contentStyle={tooltipStyle()}
              labelStyle={{ color: 'var(--foreground)', fontWeight: 700, marginBottom: 2 }}
              itemStyle={{ color: 'var(--foreground)' }}
              formatter={(v) => (typeof v === 'number' ? v.toFixed(1) : String(v))}
            />
            <Line
              type="monotone"
              dataKey="avgPointsFor"
              name="Pts/game"
              stroke="var(--brand)"
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="card p-4">
        <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">Luck / Season</h3>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={points} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="season" stroke="var(--muted)" fontSize={11} />
            <YAxis
              stroke="var(--muted)"
              fontSize={11}
              width={40}
              domain={['dataMin - 0.5', 'dataMax + 0.5']}
              tickFormatter={(v) => (typeof v === 'number' ? v.toFixed(1) : String(v))}
            />
            <Tooltip
              contentStyle={tooltipStyle()}
              labelStyle={{ color: 'var(--foreground)', fontWeight: 700, marginBottom: 2 }}
              itemStyle={{ color: 'var(--foreground)' }}
              formatter={(v) => (typeof v === 'number' ? (v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2)) : String(v))}
            />
            <Line
              type="monotone"
              dataKey="luck"
              name="Luck"
              stroke="var(--accent-warm)"
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
