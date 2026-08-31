import type { ReactNode } from 'react';

export function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  accent?: 'brand' | 'accent' | 'gold' | 'warm';
}) {
  const accentColor =
    accent === 'accent'
      ? 'text-accent'
      : accent === 'gold'
        ? 'text-gold'
        : accent === 'warm'
          ? 'text-accent-warm'
          : 'text-brand';

  return (
    <div className="card flex flex-col gap-1 p-4">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
      <span className={`text-2xl font-extrabold ${accentColor}`}>{value}</span>
      {sub && <span className="text-xs text-muted">{sub}</span>}
    </div>
  );
}
