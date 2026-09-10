import { hasAnyData } from '@/lib/db';
import { getLatestSeason, getTeamsForSeason, getTopWeeklyScorers, getWeeksWithPlayerScores } from '@/lib/db/queries';
import { EmptyState } from '@/components/EmptyState';
import { WeeklyTopScorersTable, type ScorerTeamIdentity } from '@/components/WeeklyTopScorersTable';
import type { WeeklyPlayerScoreRow } from '@/lib/db/queries';

export const dynamic = 'force-dynamic';

export default async function TopScorersPage() {
  if (!(await hasAnyData())) {
    return <EmptyState />;
  }

  const latestSeason = await getLatestSeason();
  if (!latestSeason) return <EmptyState />;

  const [teams, weeksWithData] = await Promise.all([
    getTeamsForSeason(latestSeason.season),
    getWeeksWithPlayerScores(latestSeason.season),
  ]);

  if (weeksWithData.length === 0) {
    return (
      <div className="flex flex-col gap-8">
        <Header season={latestSeason.season} />
        <EmptyState title="No games played yet this season" />
      </div>
    );
  }

  const teamsById: Record<number, ScorerTeamIdentity> = {};
  for (const t of teams) {
    teamsById[t.team_id] = { ownerId: t.owner_id, teamName: t.team_name, logoUrl: t.logo_url };
  }

  const scoresByWeek: Record<number, WeeklyPlayerScoreRow[]> = {};
  await Promise.all(
    weeksWithData.map(async (week) => {
      scoresByWeek[week] = await getTopWeeklyScorers(latestSeason.season, week, 20);
    }),
  );

  const defaultWeek = weeksWithData[weeksWithData.length - 1];

  return (
    <div className="flex flex-col gap-8">
      <Header season={latestSeason.season} />
      <WeeklyTopScorersTable
        weeks={weeksWithData}
        defaultWeek={defaultWeek}
        scoresByWeek={scoresByWeek}
        teamsById={teamsById}
      />
    </div>
  );
}

function Header({ season }: { season: number }) {
  return (
    <div>
      <h1 className="text-2xl font-extrabold">{season} Top Scorers</h1>
      <p className="max-w-2xl text-sm text-muted">
        The top 20 NFL players by fantasy points each week, league-wide — whoever&apos;s hot, not just
        who&apos;s on an Oakwood roster. The Owner column shows who&apos;s rostering them here, if anyone.
      </p>
    </div>
  );
}
