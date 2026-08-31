import { hasAnyData } from '@/lib/db';
import { getSeasons } from '@/lib/db/queries';
import { computePowerRankings, computePowerRankingsHistory } from '@/lib/analytics/powerRankings';
import { getAllGameResults } from '@/lib/analytics/gameResults';
import { EmptyState } from '@/components/EmptyState';
import { PowerRankingsLineChart, type PowerHistoryPoint } from '@/components/charts/PowerRankingsLineChart';
import { WeeklyScoringChart, type WeeklySeriesPoint } from '@/components/charts/WeeklyScoringChart';
import { SeasonPicker } from '@/components/SeasonPicker';

export const dynamic = 'force-dynamic';

export default async function PowerRankingsPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  if (!hasAnyData()) return <EmptyState />;

  const seasons = getSeasons().map((s) => s.season);
  const { season: seasonParam } = await searchParams;
  const season = seasonParam ? Number.parseInt(seasonParam, 10) : seasons[0];

  const rankings = computePowerRankings(season);
  const history = computePowerRankingsHistory(season);

  const weeks = Array.from(history.keys()).sort((a, b) => a - b);
  const teamNames = rankings.map((r) => r.teamName);
  const chartData: PowerHistoryPoint[] = weeks.map((week) => {
    const point: PowerHistoryPoint = { week };
    for (const row of history.get(week) ?? []) {
      point[row.teamName] = row.powerScore;
    }
    return point;
  });

  const seasonGames = getAllGameResults().filter((g) => g.season === season && g.result !== 'BYE');
  const scoringWeeks = Array.from(new Set(seasonGames.map((g) => g.week))).sort((a, b) => a - b);
  const scoringData: WeeklySeriesPoint[] = scoringWeeks.map((week) => {
    const point: WeeklySeriesPoint = { week };
    for (const g of seasonGames.filter((gg) => gg.week === week)) {
      point[g.teamName] = g.points;
    }
    return point;
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Power Rankings</h1>
          <p className="text-sm text-muted">
            A composite score blending win %, scoring average, recent form (last 3 games), and
            strength of schedule faced — not just wins and losses.
          </p>
        </div>
        <SeasonPicker seasons={seasons} selected={season} basePath="/power-rankings" />
      </div>

      <div className="card overflow-x-auto">
        <table className="table-clean w-full">
          <thead>
            <tr>
              <th>#</th>
              <th>Team</th>
              <th>Owner</th>
              <th>Power Score</th>
              <th>Record</th>
              <th>Avg Pts</th>
              <th>Last 3 Avg</th>
              <th>Sched. Strength</th>
            </tr>
          </thead>
          <tbody>
            {rankings.map((r) => (
              <tr key={r.teamId}>
                <td className="font-semibold text-muted">{r.rank}</td>
                <td className="font-medium">{r.teamName}</td>
                <td className="text-muted">{r.ownerName}</td>
                <td className="font-bold text-brand">{r.powerScore.toFixed(1)}</td>
                <td>{r.record}</td>
                <td>{r.avgPoints.toFixed(1)}</td>
                <td>{r.recentFormAvg.toFixed(1)}</td>
                <td>{r.scheduleStrength.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {weeks.length > 1 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">Power Score Over the Season</h2>
          <div className="card p-4">
            <PowerRankingsLineChart data={chartData} teamNames={teamNames} />
          </div>
        </section>
      )}

      {scoringWeeks.length > 1 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">Weekly Scoring Trends</h2>
          <div className="card p-4">
            <WeeklyScoringChart data={scoringData} teamNames={teamNames} />
          </div>
        </section>
      )}
    </div>
  );
}
