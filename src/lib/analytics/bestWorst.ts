import { getAllStandings, getAllTeams, getOwners } from '@/lib/db/queries';
import { getRegularSeasonGameResults } from './gameResults';

export interface SeasonPerformance {
  season: number;
  teamId: number;
  ownerId: string;
  ownerName: string;
  teamName: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  finalRank: number | null;
  isChampion: boolean;
}

export function buildSeasonPerformances(): SeasonPerformance[] {
  const standings = getAllStandings();
  const teams = new Map(getAllTeams().map((t) => [`${t.season}:${t.team_id}`, t]));
  const owners = new Map(getOwners().map((o) => [o.owner_id, o.display_name]));

  return standings
    .map((s): SeasonPerformance | null => {
      const team = teams.get(`${s.season}:${s.team_id}`);
      if (!team) return null;
      return {
        season: s.season,
        teamId: s.team_id,
        ownerId: team.owner_id,
        ownerName: owners.get(team.owner_id) ?? 'Unknown Owner',
        teamName: team.team_name,
        wins: s.wins,
        losses: s.losses,
        ties: s.ties,
        pointsFor: s.points_for,
        pointsAgainst: s.points_against,
        finalRank: s.final_rank,
        isChampion: !!s.is_champion,
      };
    })
    .filter((s): s is SeasonPerformance => s !== null && s.wins + s.losses + s.ties > 0);
}

export function bestSeasonsByWins(limit = 10): SeasonPerformance[] {
  return buildSeasonPerformances()
    .sort((a, b) => b.wins - a.wins || b.pointsFor - a.pointsFor)
    .slice(0, limit);
}

export function worstSeasonsByWins(limit = 10): SeasonPerformance[] {
  return buildSeasonPerformances()
    .sort((a, b) => a.wins - b.wins || a.pointsFor - b.pointsFor)
    .slice(0, limit);
}

export function bestSeasonsByPoints(limit = 10): SeasonPerformance[] {
  return buildSeasonPerformances()
    .sort((a, b) => b.pointsFor - a.pointsFor)
    .slice(0, limit);
}

export function worstSeasonsByPoints(limit = 10): SeasonPerformance[] {
  return buildSeasonPerformances()
    .sort((a, b) => a.pointsFor - b.pointsFor)
    .slice(0, limit);
}

export function championshipSeasons(): SeasonPerformance[] {
  return buildSeasonPerformances()
    .filter((s) => s.isChampion)
    .sort((a, b) => b.season - a.season);
}

export interface ConsistencyRow {
  season: number;
  teamId: number;
  ownerName: string;
  teamName: string;
  gamesPlayed: number;
  avgPoints: number;
  stdDev: number;
  boomWeeks: number; // scored > 15% above their own season average
  bustWeeks: number; // scored > 15% below their own season average
}

export function computeConsistency(): ConsistencyRow[] {
  const games = getRegularSeasonGameResults().filter((g) => g.result !== 'BYE');
  const byTeamSeason = new Map<string, typeof games>();

  for (const g of games) {
    const key = `${g.season}:${g.teamId}`;
    const list = byTeamSeason.get(key) ?? [];
    list.push(g);
    byTeamSeason.set(key, list);
  }

  const rows: ConsistencyRow[] = [];

  for (const [, teamGames] of byTeamSeason) {
    if (teamGames.length < 3) continue;
    const scores = teamGames.map((g) => g.points);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((a, s) => a + (s - avg) ** 2, 0) / scores.length;
    const stdDev = Math.sqrt(variance);

    const boomWeeks = scores.filter((s) => s > avg * 1.15).length;
    const bustWeeks = scores.filter((s) => s < avg * 0.85).length;

    const meta = teamGames[0];
    rows.push({
      season: meta.season,
      teamId: meta.teamId,
      ownerName: meta.ownerName,
      teamName: meta.teamName,
      gamesPlayed: teamGames.length,
      avgPoints: avg,
      stdDev,
      boomWeeks,
      bustWeeks,
    });
  }

  return rows.sort((a, b) => b.stdDev - a.stdDev);
}
