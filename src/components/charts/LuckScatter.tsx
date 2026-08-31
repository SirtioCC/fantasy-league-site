'use client';

import {
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';

export interface LuckPoint {
  label: string;
  expectedWins: number;
  actualWins: number;
}

export function LuckScatter({ data }: { data: LuckPoint[] }) {
  const maxVal = Math.max(1, ...data.map((d) => Math.max(d.expectedWins, d.actualWins))) + 1;

  return (
    <ResponsiveContainer width="100%" height={420}>
      <ScatterChart margin={{ top: 16, right: 24, bottom: 16, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          type="number"
          dataKey="expectedWins"
          name="Expected wins"
          domain={[0, maxVal]}
          stroke="var(--muted)"
          fontSize={12}
          label={{ value: 'Expected wins (by weekly score rank)', position: 'insideBottom', offset: -8, fontSize: 12, fill: 'var(--muted)' }}
        />
        <YAxis
          type="number"
          dataKey="actualWins"
          name="Actual wins"
          domain={[0, maxVal]}
          stroke="var(--muted)"
          fontSize={12}
          label={{ value: 'Actual wins', angle: -90, position: 'insideLeft', fontSize: 12, fill: 'var(--muted)' }}
        />
        <ZAxis range={[80, 80]} />
        <ReferenceLine
          segment={[
            { x: 0, y: 0 },
            { x: maxVal, y: maxVal },
          ]}
          stroke="var(--muted)"
          strokeDasharray="4 4"
        />
        <Tooltip
          cursor={{ strokeDasharray: '3 3' }}
          contentStyle={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            fontSize: 12,
          }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as LuckPoint;
            return (
              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: '6px 10px',
                  fontSize: 12,
                }}
              >
                <div style={{ fontWeight: 700 }}>{p.label}</div>
                <div>Expected wins: {p.expectedWins.toFixed(2)}</div>
                <div>Actual wins: {p.actualWins.toFixed(2)}</div>
                <div>Luck: {(p.actualWins - p.expectedWins).toFixed(2)}</div>
              </div>
            );
          }}
        />
        <Scatter data={data} fill="var(--color-brand, #5b3df0)" />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
