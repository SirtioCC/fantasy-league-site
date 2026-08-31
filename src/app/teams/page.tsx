import Link from 'next/link';
import { hasAnyData } from '@/lib/db';
import { getAllTimeStandings } from '@/lib/analytics/records';
import { EmptyState } from '@/components/EmptyState';

export const dynamic = 'force-dynamic';

export default async function TeamsIndexPage() {
  if (!(await hasAnyData())) return <EmptyState />;

  const owners = await getAllTimeStandings();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold">Owners</h1>
        <p className="text-sm text-muted">Every manager who has fielded a team in the league.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {owners.map((o) => (
          <Link
            key={o.ownerId}
            href={`/teams/${o.ownerId}`}
            className="card flex flex-col gap-2 p-5 transition-shadow hover:shadow-md"
          >
            <span className="text-lg font-bold">{o.displayName}</span>
            <span className="text-xs text-muted">{o.teamNames.join(' · ')}</span>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <span>
                <strong>
                  {o.wins}-{o.losses}
                  {o.ties ? `-${o.ties}` : ''}
                </strong>{' '}
                <span className="text-muted">({(o.winPct * 100).toFixed(0)}%)</span>
              </span>
              {o.championships > 0 && <span>🏆 ×{o.championships}</span>}
              <span className="text-muted">{o.seasonsPlayed} seasons</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
