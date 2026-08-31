import { hasAnyData } from '@/lib/db';
import { getSeasonsWithGames } from '@/lib/db/queries';
import { computeLuckRatings } from '@/lib/analytics/luck';
import { EmptyState } from '@/components/EmptyState';
import { SeasonPicker } from '@/components/SeasonPicker';
import { LuckScatter, type LuckPoint } from '@/components/charts/LuckScatter';
import { OwnerLink } from '@/components/OwnerLink';

export const dynamic = 'force-dynamic';

export default async function LuckPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  if (!(await hasAnyData())) return <EmptyState />;

  const seasons = await getSeasonsWithGames();
  const { season: seasonParam } = await searchParams;
  const season = seasonParam ? Number.parseInt(seasonParam, 10) : seasons[0];

  const [seasonLuck, allTimeLuck] = await Promise.all([computeLuckRatings(season), computeLuckRatings()]);

  const ownerLuckTotals = new Map<string, { ownerId: string; ownerName: string; luck: number; seasons: number }>();
  for (const row of allTimeLuck) {
    const cur = ownerLuckTotals.get(row.ownerId) ?? { ownerId: row.ownerId, ownerName: row.ownerName, luck: 0, seasons: 0 };
    cur.luck += row.luck;
    cur.seasons += 1;
    ownerLuckTotals.set(row.ownerId, cur);
  }
  const allTimeLeaderboard = Array.from(ownerLuckTotals.values()).sort((a, b) => b.luck - a.luck);

  const scatterData: LuckPoint[] = seasonLuck.map((r) => ({
    label: `${r.teamName} (${r.ownerName})`,
    expectedWins: r.expectedWins,
    actualWins: r.actualWins,
  }));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Luck Analysis</h1>
          <p className="max-w-2xl text-sm text-muted">
            Expected wins = how many of the other teams in the league each team would have beaten
            with their score, week by week. Luck = actual wins minus expected wins. Schedule
            difficulty compares the average weekly output of a team&apos;s opponents to the league
            average.
          </p>
        </div>
        <SeasonPicker seasons={seasons} selected={season} basePath="/luck" />
      </div>

      <div className="card overflow-x-auto">
        <table className="table-clean table-responsive w-full">
          <thead>
            <tr>
              <th>Team</th>
              <th>Owner</th>
              <th>Actual W</th>
              <th>Expected W</th>
              <th>Luck</th>
              <th>Sched. Difficulty</th>
              <th>PF Rank</th>
              <th>Standings Rank</th>
              <th>Over/Under</th>
            </tr>
          </thead>
          <tbody>
            {seasonLuck.map((r) => (
              <tr key={r.teamId}>
                <td data-label="Team" className="font-medium">{r.teamName}</td>
                <td data-label="Owner" className="text-muted">
                  <OwnerLink ownerId={r.ownerId}>{r.ownerName}</OwnerLink>
                </td>
                <td data-label="Actual W">{r.actualWins.toFixed(1)}</td>
                <td data-label="Expected W">{r.expectedWins.toFixed(2)}</td>
                <td
                  data-label="Luck"
                  className={r.luck > 0 ? 'font-semibold text-accent' : r.luck < 0 ? 'font-semibold text-accent-warm' : ''}
                >
                  {r.luck > 0 ? '+' : ''}
                  {r.luck.toFixed(2)}
                </td>
                <td data-label="Sched. Difficulty">
                  {r.scheduleDifficulty > 0 ? '+' : ''}
                  {r.scheduleDifficulty.toFixed(1)}
                </td>
                <td data-label="PF Rank">{r.pointsForRank}</td>
                <td data-label="Standings Rank">{r.standingsRank || '—'}</td>
                <td data-label="Over/Under">
                  {r.overUnderPerformance > 0 ? '+' : ''}
                  {r.overUnderPerformance}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">Luck vs. Performance — {season}</h2>
        <p className="text-sm text-muted">
          Points above the dashed line = a team won more than their scoring predicted (lucky).
          Points below = they won fewer games than their scoring deserved (unlucky).
        </p>
        <div className="card p-4">
          <LuckScatter data={scatterData} />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">All-Time Luck Leaderboard</h2>
        <div className="card overflow-x-auto">
          <table className="table-clean table-responsive w-full">
            <thead>
              <tr>
                <th>Owner</th>
                <th>Seasons</th>
                <th>Cumulative Luck</th>
              </tr>
            </thead>
            <tbody>
              {allTimeLeaderboard.map((o) => (
                <tr key={o.ownerId}>
                  <td data-label="Owner" className="font-medium">
                    <OwnerLink ownerId={o.ownerId}>{o.ownerName}</OwnerLink>
                  </td>
                  <td data-label="Seasons">{o.seasons}</td>
                  <td
                    data-label="Cumulative Luck"
                    className={o.luck > 0 ? 'font-semibold text-accent' : o.luck < 0 ? 'font-semibold text-accent-warm' : ''}
                  >
                    {o.luck > 0 ? '+' : ''}
                    {o.luck.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
