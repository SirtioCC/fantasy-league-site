import { hasAnyData } from '@/lib/db';
import { computeLeagueAwards } from '@/lib/analytics/awards';
import { championshipSeasons } from '@/lib/analytics/bestWorst';
import { EmptyState } from '@/components/EmptyState';
import { OwnerLink } from '@/components/OwnerLink';

export const dynamic = 'force-dynamic';

export default async function AwardsPage() {
  if (!(await hasAnyData())) return <EmptyState />;

  const [awards, champions] = await Promise.all([computeLeagueAwards(), championshipSeasons()]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-extrabold">Hall of Fame</h1>
        <p className="text-sm text-muted">
          Career superlatives and every champion the league has crowned.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">League Awards</h2>
        <p className="text-xs text-muted">
          One all-time winner per category, computed across the league&apos;s full synced history.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {awards.map((a) => (
            <div key={a.label} className="card flex items-start gap-3 p-4">
              <span className="text-3xl leading-none" aria-hidden="true">
                {a.emoji}
              </span>
              <div className="min-w-0">
                <div className="text-sm font-bold">{a.label}</div>
                <div className="mt-0.5 truncate font-medium text-brand">
                  <OwnerLink ownerId={a.ownerId}>{a.ownerName}</OwnerLink>
                </div>
                <div className="mt-1 text-xs text-muted">{a.description}</div>
              </div>
            </div>
          ))}
          {awards.length === 0 && <p className="text-sm text-muted">No completed seasons synced yet.</p>}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">Championship History</h2>
        <div className="card overflow-x-auto">
          <table className="table-clean table-responsive w-full">
            <thead>
              <tr>
                <th>Season</th>
                <th>Champion</th>
                <th>Team</th>
                <th>Record</th>
                <th>PF</th>
              </tr>
            </thead>
            <tbody>
              {champions.map((c) => (
                <tr key={`${c.season}-${c.teamId}`}>
                  <td data-label="Season" className="font-semibold">
                    <span aria-hidden="true">🏆</span> {c.season}
                  </td>
                  <td data-label="Champion" className="font-medium">
                    <OwnerLink ownerId={c.ownerId}>{c.ownerName}</OwnerLink>
                  </td>
                  <td data-label="Team" className="text-muted">
                    <OwnerLink ownerId={c.ownerId}>{c.teamName}</OwnerLink>
                  </td>
                  <td data-label="Record">
                    {c.wins}-{c.losses}
                    {c.ties ? `-${c.ties}` : ''}
                  </td>
                  <td data-label="PF">{c.pointsFor.toFixed(1)}</td>
                </tr>
              ))}
              {champions.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-muted">
                    No completed seasons synced yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
