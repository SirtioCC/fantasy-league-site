import { hasAnyData } from '@/lib/db';
import { getLatestSeason, getMatchupsForSeason, getTeamsForSeason, getWeeklyPicks } from '@/lib/db/queries';
import { EmptyState } from '@/components/EmptyState';
import { ParlayWeekView, type LowScorer, type ParlayTeam } from '@/components/ParlayWeekView';

export const dynamic = 'force-dynamic';

// Week 1 has no prior week in a new season to fall back on, so it's pinned
// to last season's last-place finisher by name rather than computed. Every
// week after that is automatic: whoever scored lowest the week before.
const WEEK1_HARDCODE_TEAM_NAME = "'22, '24 League Champion";
const WEEK1_HARDCODE_DETAIL = 'Last place, 2025 season';

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
          detail: `${min.toFixed(1)} pts`,
        };
      });
  }

  // The bet for week N is on whoever scored lowest in week N-1 — except week
  // 1, which has no prior week this season to look back on.
  const week1Team = teams.find((t) => t.team_name.trim().toLowerCase() === WEEK1_HARDCODE_TEAM_NAME.toLowerCase());
  const onTheHookByWeek: Record<number, LowScorer[]> = {};
  for (const week of weeks) {
    if (week === 1) {
      onTheHookByWeek[1] = week1Team
        ? [
            {
              ownerId: week1Team.owner_id,
              teamName: week1Team.team_name,
              logoUrl: week1Team.logo_url,
              detail: WEEK1_HARDCODE_DETAIL,
            },
          ]
        : [];
    } else {
      onTheHookByWeek[week] = lowestByWeek[week - 1] ?? [];
    }
  }

  const defaultWeek = scoredWeeks.length > 0 ? Math.min(scoredWeeks[scoredWeeks.length - 1] + 1, maxWeek) : 1;

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
        onTheHookByWeek={onTheHookByWeek}
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
        Each week&apos;s $5 parlay is on whoever scored lowest the week before (Week 1 falls to last
        season&apos;s last-place finisher, since there&apos;s no prior week yet). Everyone drops their own leg
        below — no login here, so just type your pick into your own row.
      </p>
    </div>
  );
}
