'use client';

import Link from 'next/link';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { ownerIdToSlug } from '@/lib/ownerSlug';

export interface SparklineSeries {
  key: string;
  label: string;
  sublabel?: string;
  ownerId?: string;
  points: { week: number; value: number | null }[];
}

/**
 * A grid of small "stat tile + sparkline" cards, one per entity, instead of
 * a single line chart with many series. With a dozen-plus teams, one shared
 * line chart turns into unreadable spaghetti — small multiples let each
 * team's trend read on its own while staying easy to scan side by side.
 */
export function SparklineGrid({
  series,
  valueFormatter = (v: number) => v.toFixed(1),
}: {
  series: SparklineSeries[];
  valueFormatter?: (v: number) => string;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {series.map((s) => {
        const values = s.points.map((p) => p.value).filter((v): v is number => v !== null);
        const latest = values.length > 0 ? values[values.length - 1] : null;
        const first = values.length > 0 ? values[0] : null;
        const trendUp = latest !== null && first !== null ? latest >= first : null;
        const lineColor =
          trendUp === null ? 'var(--muted)' : trendUp ? 'var(--accent)' : 'var(--accent-warm)';

        return (
          <div key={s.key} className="card flex flex-col gap-2 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-bold">{s.label}</div>
                {s.sublabel && (
                  <div className="truncate text-xs text-muted">
                    {s.ownerId ? (
                      <Link href={`/teams/${ownerIdToSlug(s.ownerId)}`} className="hover:text-brand hover:underline">
                        {s.sublabel}
                      </Link>
                    ) : (
                      s.sublabel
                    )}
                  </div>
                )}
              </div>
              {trendUp !== null && (
                <span
                  className={`shrink-0 text-xs font-semibold ${trendUp ? 'text-accent' : 'text-accent-warm'}`}
                  aria-label={trendUp ? 'Trending up' : 'Trending down'}
                >
                  {trendUp ? '▲' : '▼'}
                </span>
              )}
            </div>
            <div className="text-2xl font-extrabold" style={{ color: lineColor }}>
              {latest !== null ? valueFormatter(latest) : '—'}
            </div>
            <div className="-mx-1 h-12">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={s.points} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                  <XAxis dataKey="week" hide />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      fontSize: 11,
                      padding: '4px 8px',
                    }}
                    labelStyle={{ color: 'var(--foreground)', fontWeight: 700, marginBottom: 2 }}
                    itemStyle={{ color: 'var(--foreground)' }}
                    labelFormatter={(w) => `Week ${w}`}
                    formatter={(v) => (typeof v === 'number' ? valueFormatter(v) : String(v))}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={lineColor}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      })}
    </div>
  );
}
