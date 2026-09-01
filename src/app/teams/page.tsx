import Link from 'next/link';
import { hasAnyData } from '@/lib/db';
import { getLatestTeamByOwner } from '@/lib/db/queries';
import { getAllTimeStandings } from '@/lib/analytics/records';
import { EmptyState } from '@/components/EmptyState';
import { TeamLogo } from '@/components/TeamLogo';
import { ownerIdToSlug } from '@/lib/ownerSlug';
import { ownerColor } from '@/lib/ownerColor';

export const dynamic = 'force-dynamic';

export default async function TeamsIndexPage() {
  if (!(await hasAnyData())) return <EmptyState />;

  const [owners, latestTeams] = await Promise.all([getAllTimeStandings(), getLatestTeamByOwner()]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold">Owners</h1>
        <p className="text-sm text-muted">Every manager who has fielded a team in the league.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {owners.map((o) => {
          const team = latestTeams.get(o.ownerId);
          return (
            <Link
              key={o.ownerId}
              href={`/teams/${ownerIdToSlug(o.ownerId)}`}
              style={{ borderLeftColor: ownerColor(o.ownerId) }}
              className="card flex gap-3 border-l-4 p-5 transition-shadow hover:shadow-md"
            >
              <TeamLogo
                logoUrl={team?.logo_url}
                name={team?.team_name ?? o.displayName}
                ownerId={o.ownerId}
                size="md"
              />
              <div className="flex min-w-0 flex-col gap-2">
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
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
