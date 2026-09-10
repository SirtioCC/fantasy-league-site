import { hasAnyData } from '@/lib/db';
import { getLatestSeason, getMatchupsForSeason, getTeamsForSeason, getWeeklyPicks } from '@/lib/db/queries';
import { EmptyState } from '@/components/EmptyState';
import { ParlayWeekView, type LowScorer, type ParlayTeam } from '@/components/ParlayWeekView';

export const dynamic = 'force-dynamic';

export default async function ParlayPage() {
  if (!(await hasAnyData())) {
    return <EmptyState />;
  }

  const latestSeason = await getLatestSeason();
  if (!latestSeason) return <EmptyState />;

  const [teams, matchups] = await Promise.all([
    getTeamsForSeason(latestSeason.season),
    getMatchupsForSeason(latestSeason.season),
  ]);

  if (teams.length === 0) {
    return (
      <div className="flex flex-col gap-8">
        <Header season={latestSeason.season} />
        <EmptyState title="No teams synced yet" />
      </div>
    );
  }

  const teamById = new Map(teams.map((t) => [t.team_id, t]));
  const maxWeek = Math.max(latestSeason.current_matchup_period ?? 1, 1);
  const weeks = Array.from({ length: maxWeek }, (_, i) => i + 1);

  const lowestByWeek: Record<number, LowScorer[]> = {};
  const scoredWeeks: number[] = [];

  for (const week of weeks) {
    const scores: { teamId: number; score: number }[] = [];
    for (const m of matchups) {
      if (m.week !== week) continue;
      if (m.home_team_id !== null && m.home_score !== null) scores.push({ teamId: m.home_team_id, score: m.home_score });
      if (m.away_team_id !== null && m.away_score !== null) scores.push({ teamId: m.away_team_id, score: m.away_score });
    }
    if (scores.length === 0) {
      lowestByWeek[week] = [];
      continue;
    }
    scoredWeeks.push(week);
    const min = Math.min(...scores.map((s) => s.score));
    lowestByWeek[week] = scores
      .filter((s) => s.score === min)
      .map((s): LowScorer => {
        const t = teamById.get(s.teamId);
        return {
          ownerId: t?.owner_id ?? '',
          teamName: t?.team_name ?? `Team ${s.teamId}`,
          logoUrl: t?.logo_url ?? null,
          score: min,
        };
      });
  }

  const defaultWeek = scoredWeeks.length > 0 ? scoredWeeks[scoredWeeks.length - 1] : weeks[weeks.length - 1];

  const picksByWeek: Record<number, Record<string, string>> = {};
  await Promise.all(
    weeks.map(async (week) => {
      const rows = await getWeeklyPicks(latestSeason.season, week);
      picksByWeek[week] = Object.fromEntries(rows.map((r) => [r.owner_id, r.pick_text]));
    }),
  );

  const parlayTeams: ParlayTeam[] = teams.map((t) => ({
    ownerId: t.owner_id,
    teamName: t.team_name,
    logoUrl: t.logo_url,
  }));

  return (
    <div className="flex flex-col gap-8">
      <Header season={latestSeason.season} />
      <ParlayWeekView
        season={latestSeason.season}
        weeks={weeks}
        defaultWeek={defaultWeek}
        teams={parlayTeams}
        lowestByWeek={lowestByWeek}
        picksByWeek={picksByWeek}
      />
    </div>
  );
}

function Header({ season }: { season: number }) {
  return (
    <div>
      <h1 className="text-2xl font-extrabold">{season} Parlay Picks</h1>
      <p className="max-w-2xl text-sm text-muted">
        Whoever scores lowest in a week owes the group $5 parlay. Everyone drops their own leg below —
        no login here, so just type your pick into your own row.
      </p>
    </div>
  );
}
