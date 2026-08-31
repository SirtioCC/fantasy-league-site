'use client';

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { colorForIndex } from './palette';

export interface BarDatum {
  label: string;
  value: number;
}

export function PointsForBarChart({ data, height = 360 }: { data: BarDatum[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
        <XAxis type="number" stroke="var(--muted)" fontSize={12} />
        <YAxis type="category" dataKey="label" width={140} stroke="var(--muted)" fontSize={12} />
        <Tooltip
          contentStyle={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(v) => (typeof v === 'number' ? v.toFixed(1) : String(v))}
        />
        <Bar dataKey="value" radius={[0, 6, 6, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={colorForIndex(i)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
