import { getStandingsForSeason } from '@/lib/db/queries';
import { getRegularSeasonGameResults } from './gameResults';

export interface TeamSeasonLuck {
  season: number;
  teamId: number;
  ownerId: string;
  ownerName: string;
  teamName: string;
  gamesPlayed: number;
  actualWins: number;
  expectedWins: number;
  luck: number; // actualWins - expectedWins. Positive = luckier than their scoring deserved.
  avgOpponentPpg: number;
  leagueAvgPpg: number;
  scheduleDifficulty: number; // avgOpponentPpg - leagueAvgPpg. Positive = harder schedule.
  pointsForRank: number; // 1 = most points in league that season
  standingsRank: number; // final rank (or current win-based rank if season in progress)
  overUnderPerformance: number; // pointsForRank - standingsRank. Positive = overperformed their scoring.
}

export async function computeLuckRatings(season?: number): Promise<TeamSeasonLuck[]> {
  const games = (await getRegularSeasonGameResults()).filter((g) => g.result !== 'BYE');
  const seasons = season ? [season] : Array.from(new Set(games.map((g) => g.season))).sort();

  const out: TeamSeasonLuck[] = [];

  for (const s of seasons) {
    const seasonGames = games.filter((g) => g.season === s);
    if (seasonGames.length === 0) continue;

    // Group by week to compute "teams beaten" for expected wins.
    const byWeek = new Map<number, typeof seasonGames>();
    for (const g of seasonGames) {
      const list = byWeek.get(g.week) ?? [];
      list.push(g);
      byWeek.set(g.week, list);
    }

    const expectedWinsByTeam = new Map<number, number>();
    const actualWinsByTeam = new Map<number, number>();
    const gamesPlayedByTeam = new Map<number, number>();
    const pointsSumByTeam = new Map<number, number>();
    const opponentPointsSumByTeam = new Map<number, number>();
    const teamMeta = new Map<
      number,
      { ownerId: string; ownerName: string; teamName: string }
    >();

    for (const [, weekGames] of byWeek) {
      const scores = weekGames.map((g) => g.points);
      for (const g of weekGames) {
        const beaten = scores.filter((s2) => s2 < g.points).length;
        const tied = scores.filter((s2) => s2 === g.points).length - 1; // exclude self
        const denom = scores.length - 1;
        const expected = denom > 0 ? (beaten + tied * 0.5) / denom : 0;

        expectedWinsByTeam.set(g.teamId, (expectedWinsByTeam.get(g.teamId) ?? 0) + expected);
        actualWinsByTeam.set(
          g.teamId,
          (actualWinsByTeam.get(g.teamId) ?? 0) + (g.result === 'W' ? 1 : g.result === 'T' ? 0.5 : 0),
        );
        gamesPlayedByTeam.set(g.teamId, (gamesPlayedByTeam.get(g.teamId) ?? 0) + 1);
        pointsSumByTeam.set(g.teamId, (pointsSumByTeam.get(g.teamId) ?? 0) + g.points);
        if (g.opponentPoints !== null) {
          opponentPointsSumByTeam.set(
            g.teamId,
            (opponentPointsSumByTeam.get(g.teamId) ?? 0) + g.opponentPoints,
          );
        }
        teamMeta.set(g.teamId, { ownerId: g.ownerId, ownerName: g.ownerName, teamName: g.teamName });
      }
    }

    const leagueTotalPoints = Array.from(pointsSumByTeam.values()).reduce((a, b) => a + b, 0);
    const leagueTotalGames = Array.from(gamesPlayedByTeam.values()).reduce((a, b) => a + b, 0);
    const leagueAvgPpg = leagueTotalGames > 0 ? leagueTotalPoints / leagueTotalGames : 0;

    const standings = await getStandingsForSeason(s);
    const standingsByTeam = new Map(standings.map((st) => [st.team_id, st]));

    const pointsForRanked = Array.from(pointsSumByTeam.entries()).sort((a, b) => b[1] - a[1]);
    const pointsForRank = new Map(pointsForRanked.map(([teamId], idx) => [teamId, idx + 1]));

    const standingsRanked = [...standings].sort((a, b) => {
      const rankA = a.final_rank ?? 999;
      const rankB = b.final_rank ?? 999;
      if (rankA !== 999 || rankB !== 999) return rankA - rankB;
      // In-progress season: rank by win pct then points for.
      const wpA = a.wins + a.losses + a.ties > 0 ? (a.wins + a.ties * 0.5) / (a.wins + a.losses + a.ties) : 0;
      const wpB = b.wins + b.losses + b.ties > 0 ? (b.wins + b.ties * 0.5) / (b.wins + b.losses + b.ties) : 0;
      return wpB - wpA || b.points_for - a.points_for;
    });
    const standingsRank = new Map(standingsRanked.map((st, idx) => [st.team_id, idx + 1]));

    for (const [teamId, meta] of teamMeta) {
      const gamesPlayed = gamesPlayedByTeam.get(teamId) ?? 0;
      const avgOpponentPpg =
        gamesPlayed > 0 ? (opponentPointsSumByTeam.get(teamId) ?? 0) / gamesPlayed : 0;

      out.push({
        season: s,
        teamId,
        ownerId: meta.ownerId,
        ownerName: meta.ownerName,
        teamName: meta.teamName,
        gamesPlayed,
        actualWins: actualWinsByTeam.get(teamId) ?? 0,
        expectedWins: expectedWinsByTeam.get(teamId) ?? 0,
        luck: (actualWinsByTeam.get(teamId) ?? 0) - (expectedWinsByTeam.get(teamId) ?? 0),
        avgOpponentPpg,
        leagueAvgPpg,
        scheduleDifficulty: avgOpponentPpg - leagueAvgPpg,
        pointsForRank: pointsForRank.get(teamId) ?? 0,
        standingsRank: standingsByTeam.get(teamId) ? standingsRank.get(teamId) ?? 0 : 0,
        overUnderPerformance:
          (pointsForRank.get(teamId) ?? 0) - (standingsByTeam.get(teamId) ? standingsRank.get(teamId) ?? 0 : 0),
      });
    }
  }

  return out.sort((a, b) => b.luck - a.luck);
}
