import { hasAnyData } from '@/lib/db';
import { getSeasons } from '@/lib/db/queries';
import { computePowerRankings, computePowerRankingsHistory } from '@/lib/analytics/powerRankings';
import { getAllGameResults } from '@/lib/analytics/gameResults';
import { EmptyState } from '@/components/EmptyState';
import { SparklineGrid, type SparklineSeries } from '@/components/charts/SparklineGrid';
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

  const powerSeries: SparklineSeries[] = rankings.map((r) => ({
    key: String(r.teamId),
    label: r.teamName,
    sublabel: r.ownerName,
    points: weeks.map((week) => ({
      week,
      value: history.get(week)?.find((row) => row.teamId === r.teamId)?.powerScore ?? null,
    })),
  }));

  const seasonGames = getAllGameResults().filter((g) => g.season === season && g.result !== 'BYE');
  const scoringWeeks = Array.from(new Set(seasonGames.map((g) => g.week))).sort((a, b) => a - b);
  const gamesByTeamWeek = new Map(seasonGames.map((g) => [`${g.teamId}:${g.week}`, g.points]));

  const scoringSeries: SparklineSeries[] = rankings.map((r) => ({
    key: String(r.teamId),
    label: r.teamName,
    sublabel: r.ownerName,
    points: scoringWeeks.map((week) => ({
      week,
      value: gamesByTeamWeek.get(`${r.teamId}:${week}`) ?? null,
    })),
  }));

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
        <table className="table-clean table-responsive w-full">
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
                <td data-label="#" className="font-semibold text-muted">{r.rank}</td>
                <td data-label="Team" className="font-medium">{r.teamName}</td>
                <td data-label="Owner" className="text-muted">{r.ownerName}</td>
                <td data-label="Power Score" className="font-bold text-brand">{r.powerScore.toFixed(1)}</td>
                <td data-label="Record">{r.record}</td>
                <td data-label="Avg Pts">{r.avgPoints.toFixed(1)}</td>
                <td data-label="Last 3 Avg">{r.recentFormAvg.toFixed(1)}</td>
                <td data-label="Sched. Strength">{r.scheduleStrength.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {weeks.length > 1 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">Power Score Trend</h2>
          <p className="text-xs text-muted">
            Ordered by current power rank. Green = trending up since week 1, orange = trending down.
          </p>
          <SparklineGrid series={powerSeries} />
        </section>
      )}

      {scoringWeeks.length > 1 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">Weekly Scoring Trend</h2>
          <p className="text-xs text-muted">Points scored per week, one card per team.</p>
          <SparklineGrid series={scoringSeries} />
        </section>
      )}
    </div>
  );
}
