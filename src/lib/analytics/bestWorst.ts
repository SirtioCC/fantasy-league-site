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

let cache: SeasonPerformance[] | null = null;

/** Cached for the lifetime of the server process/instance — several
 * best/worst views each call this independently, and with a remote
 * database each call is a network round trip, so avoid repeating it.
 * Invalidated automatically by the sync layer after writing new data. */
export async function buildSeasonPerformances(): Promise<SeasonPerformance[]> {
  if (cache) return cache;

  const [standings, allTeams, allOwners] = await Promise.all([
    getAllStandings(),
    getAllTeams(),
    getOwners(),
  ]);
  const teams = new Map(allTeams.map((t) => [`${t.season}:${t.team_id}`, t]));
  const owners = new Map(allOwners.map((o) => [o.owner_id, o.display_name]));

  const result = standings
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

  cache = result;
  return result;
}

export function invalidateSeasonPerformancesCache() {
  cache = null;
}

export async function bestSeasonsByWins(limit = 10): Promise<SeasonPerformance[]> {
  return (await buildSeasonPerformances())
    .slice()
    .sort((a, b) => b.wins - a.wins || b.pointsFor - a.pointsFor)
    .slice(0, limit);
}

export async function worstSeasonsByWins(limit = 10): Promise<SeasonPerformance[]> {
  return (await buildSeasonPerformances())
    .slice()
    .sort((a, b) => a.wins - b.wins || a.pointsFor - b.pointsFor)
    .slice(0, limit);
}

export async function bestSeasonsByPoints(limit = 10): Promise<SeasonPerformance[]> {
  return (await buildSeasonPerformances())
    .slice()
    .sort((a, b) => b.pointsFor - a.pointsFor)
    .slice(0, limit);
}

export async function worstSeasonsByPoints(limit = 10): Promise<SeasonPerformance[]> {
  return (await buildSeasonPerformances())
    .slice()
    .sort((a, b) => a.pointsFor - b.pointsFor)
    .slice(0, limit);
}

export async function championshipSeasons(): Promise<SeasonPerformance[]> {
  return (await buildSeasonPerformances())
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

export async function computeConsistency(): Promise<ConsistencyRow[]> {
  const games = (await getRegularSeasonGameResults()).filter((g) => g.result !== 'BYE');
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
