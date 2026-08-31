import { hasAnyData } from '@/lib/db';
import {
  bestSeasonsByPoints,
  bestSeasonsByWins,
  championshipSeasons,
  computeConsistency,
  worstSeasonsByPoints,
  worstSeasonsByWins,
} from '@/lib/analytics/bestWorst';
import { EmptyState } from '@/components/EmptyState';
import { OwnerLink } from '@/components/OwnerLink';

export const dynamic = 'force-dynamic';

export default async function BestWorstPage() {
  if (!(await hasAnyData())) return <EmptyState />;

  const [bestByWins, worstByWinsList, bestByPoints, worstByPointsList, champions, consistency] =
    await Promise.all([
      bestSeasonsByWins(10),
      worstSeasonsByWins(10),
      bestSeasonsByPoints(10),
      worstSeasonsByPoints(10),
      championshipSeasons(),
      computeConsistency(),
    ]);

  const mostConsistent = [...consistency].sort((a, b) => a.stdDev - b.stdDev).slice(0, 8);
  const mostVolatile = [...consistency].slice(0, 8);
  const biggestBoomBust = [...consistency]
    .sort((a, b) => b.boomWeeks + b.bustWeeks - (a.boomWeeks + a.bustWeeks))
    .slice(0, 8);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-extrabold">Best &amp; Worst Teams</h1>
        <p className="text-sm text-muted">Single-season superlatives across the league&apos;s history.</p>
      </div>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SeasonTable title="Best Seasons by Wins" rows={bestByWins} metric="wins" />
        <SeasonTable title="Worst Seasons by Wins" rows={worstByWinsList} metric="wins" />
        <SeasonTable title="Best Seasons by Points" rows={bestByPoints} metric="points" />
        <SeasonTable title="Worst Seasons by Points" rows={worstByPointsList} metric="points" />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">Championship Seasons</h2>
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
                  <td data-label="Season" className="font-semibold">{c.season}</td>
                  <td data-label="Champion" className="font-medium">
                    <OwnerLink ownerId={c.ownerId}>{c.ownerName}</OwnerLink>
                  </td>
                  <td data-label="Team" className="text-muted">{c.teamName}</td>
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

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">Most Consistent Teams</h2>
          <p className="text-xs text-muted">Lowest week-to-week scoring standard deviation (single season).</p>
          <ConsistencyTable rows={mostConsistent} />
        </div>
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">Most Volatile Teams</h2>
          <p className="text-xs text-muted">Highest week-to-week scoring standard deviation (single season).</p>
          <ConsistencyTable rows={mostVolatile} />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">Boom / Bust Teams</h2>
        <p className="text-xs text-muted">
          Boom weeks = scored 15%+ above their own season average. Bust weeks = scored 15%+ below.
        </p>
        <div className="card overflow-x-auto">
          <table className="table-clean table-responsive w-full">
            <thead>
              <tr>
                <th>Season</th>
                <th>Team</th>
                <th>Owner</th>
                <th>Avg Pts</th>
                <th>Boom Weeks</th>
                <th>Bust Weeks</th>
              </tr>
            </thead>
            <tbody>
              {biggestBoomBust.map((r) => (
                <tr key={`${r.season}-${r.teamId}`}>
                  <td data-label="Season" className="font-semibold">{r.season}</td>
                  <td data-label="Team" className="font-medium">{r.teamName}</td>
                  <td data-label="Owner" className="text-muted">
                    <OwnerLink ownerId={r.ownerId}>{r.ownerName}</OwnerLink>
                  </td>
                  <td data-label="Avg Pts">{r.avgPoints.toFixed(1)}</td>
                  <td data-label="Boom Weeks" className="text-accent">{r.boomWeeks}</td>
                  <td data-label="Bust Weeks" className="text-accent-warm">{r.bustWeeks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SeasonTable({
  title,
  rows,
  metric,
}: {
  title: string;
  rows: Awaited<ReturnType<typeof bestSeasonsByWins>>;
  metric: 'wins' | 'points';
}) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-base font-bold">{title}</h2>
      <div className="card overflow-x-auto">
        <table className="table-clean table-responsive w-full">
          <thead>
            <tr>
              <th>Season</th>
              <th>Owner</th>
              <th>Team</th>
              <th>Record</th>
              <th>PF</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.season}-${r.teamId}`}>
                <td data-label="Season" className="font-semibold">{r.season}</td>
                <td data-label="Owner" className="font-medium">
                  <OwnerLink ownerId={r.ownerId}>{r.ownerName}</OwnerLink>
                </td>
                <td data-label="Team" className="text-muted">{r.teamName}</td>
                <td data-label="Record" className={metric === 'wins' ? 'font-bold text-brand' : ''}>
                  {r.wins}-{r.losses}
                  {r.ties ? `-${r.ties}` : ''}
                </td>
                <td data-label="PF" className={metric === 'points' ? 'font-bold text-brand' : ''}>
                  {r.pointsFor.toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ConsistencyTable({ rows }: { rows: Awaited<ReturnType<typeof computeConsistency>> }) {
  return (
    <div className="card overflow-x-auto">
      <table className="table-clean table-responsive w-full">
        <thead>
          <tr>
            <th>Season</th>
            <th>Team</th>
            <th>Owner</th>
            <th>Avg Pts</th>
            <th>Std Dev</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.season}-${r.teamId}`}>
              <td data-label="Season" className="font-semibold">{r.season}</td>
              <td data-label="Team" className="font-medium">{r.teamName}</td>
              <td data-label="Owner" className="text-muted">
                <OwnerLink ownerId={r.ownerId}>{r.ownerName}</OwnerLink>
              </td>
              <td data-label="Avg Pts">{r.avgPoints.toFixed(1)}</td>
              <td data-label="Std Dev">{r.stdDev.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
