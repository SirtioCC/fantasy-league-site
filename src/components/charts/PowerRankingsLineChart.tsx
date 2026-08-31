'use client';

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { colorForIndex } from './palette';

export interface PowerHistoryPoint {
  week: number;
  [teamName: string]: number | null;
}

export function PowerRankingsLineChart({
  data,
  teamNames,
}: {
  data: PowerHistoryPoint[];
  teamNames: string[];
}) {
  return (
    <ResponsiveContainer width="100%" height={380}>
      <LineChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="week" tickFormatter={(w) => `Wk ${w}`} stroke="var(--muted)" fontSize={12} />
        <YAxis stroke="var(--muted)" fontSize={12} domain={[0, 100]} />
        <Tooltip
          contentStyle={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            fontSize: 12,
          }}
          labelFormatter={(w) => `Week ${w}`}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {teamNames.map((name, i) => (
          <Line
            key={name}
            type="monotone"
            dataKey={name}
            stroke={colorForIndex(i)}
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
