'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { colorForIndex } from './palette';

export interface BarDatum {
  label: string;
  value: number;
}

export function PointsForBarChart({ data, height = 360 }: { data: BarDatum[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 56, bottom: 8, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
        <XAxis
          type="number"
          stroke="var(--muted)"
          fontSize={12}
          domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.15)]}
        />
        <YAxis type="category" dataKey="label" width={140} stroke="var(--muted)" fontSize={12} />
        <Tooltip
          cursor={{ fill: 'var(--surface-muted)' }}
          contentStyle={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: 'var(--foreground)', fontWeight: 700, marginBottom: 4 }}
          itemStyle={{ color: 'var(--foreground)' }}
          formatter={(v) => (typeof v === 'number' ? v.toFixed(1) : String(v))}
        />
        <Bar dataKey="value" radius={[0, 6, 6, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={colorForIndex(i)} />
          ))}
          <LabelList
            dataKey="value"
            position="right"
            fontSize={12}
            fontWeight={600}
            fill="var(--foreground)"
            formatter={(v) => (typeof v === 'number' ? v.toFixed(1) : String(v ?? ''))}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
