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

export const dynamic = 'force-dynamic';

export default async function BestWorstPage() {
  if (!hasAnyData()) return <EmptyState />;

  const bestByWins = bestSeasonsByWins(10);
  const worstByWinsList = worstSeasonsByWins(10);
  const bestByPoints = bestSeasonsByPoints(10);
  const worstByPointsList = worstSeasonsByPoints(10);
  const champions = championshipSeasons();
  const consistency = computeConsistency();

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
          <table className="table-clean w-full">
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
                  <td className="font-semibold">{c.season}</td>
                  <td className="font-medium">{c.ownerName}</td>
                  <td className="text-muted">{c.teamName}</td>
                  <td>
                    {c.wins}-{c.losses}
                    {c.ties ? `-${c.ties}` : ''}
                  </td>
                  <td>{c.pointsFor.toFixed(1)}</td>
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
          <table className="table-clean w-full">
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
                  <td className="font-semibold">{r.season}</td>
                  <td className="font-medium">{r.teamName}</td>
                  <td className="text-muted">{r.ownerName}</td>
                  <td>{r.avgPoints.toFixed(1)}</td>
                  <td className="text-accent">{r.boomWeeks}</td>
                  <td className="text-accent-warm">{r.bustWeeks}</td>
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
  rows: ReturnType<typeof bestSeasonsByWins>;
  metric: 'wins' | 'points';
}) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-base font-bold">{title}</h2>
      <div className="card overflow-x-auto">
        <table className="table-clean w-full">
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
                <td className="font-semibold">{r.season}</td>
                <td className="font-medium">{r.ownerName}</td>
                <td className="text-muted">{r.teamName}</td>
                <td className={metric === 'wins' ? 'font-bold text-brand' : ''}>
                  {r.wins}-{r.losses}
                  {r.ties ? `-${r.ties}` : ''}
                </td>
                <td className={metric === 'points' ? 'font-bold text-brand' : ''}>{r.pointsFor.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ConsistencyTable({ rows }: { rows: ReturnType<typeof computeConsistency> }) {
  return (
    <div className="card overflow-x-auto">
      <table className="table-clean w-full">
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
              <td className="font-semibold">{r.season}</td>
              <td className="font-medium">{r.teamName}</td>
              <td className="text-muted">{r.ownerName}</td>
              <td>{r.avgPoints.toFixed(1)}</td>
              <td>{r.stdDev.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
