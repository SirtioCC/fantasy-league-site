import {
  getAllMatchups,
  getAllTeams,
  getOwners,
  getSeasons,
  type MatchupRow,
} from '@/lib/db/queries';

export interface GameResult {
  season: number;
  week: number;
  isPlayoff: boolean;
  teamId: number;
  ownerId: string;
  ownerName: string;
  teamName: string;
  points: number;
  opponentTeamId: number | null;
  opponentOwnerId: string | null;
  opponentOwnerName: string | null;
  opponentTeamName: string | null;
  opponentPoints: number | null;
  result: 'W' | 'L' | 'T' | 'BYE';
  /** >1 when this "game" is actually a combined multi-week matchup (e.g. a
   * 2-week championship round) — points/opponentPoints are a cumulative
   * sum across that many weeks, not a single week's score. */
  durationWeeks: number;
}

let cache: GameResult[] | null = null;

/**
 * Flattens the matchups table into one row per team per game (so both sides
 * of a matchup get a symmetric view), joined with team/owner names. This is
 * the shared backbone most analytics modules build on top of. Cached for
 * the lifetime of the server process/instance — call
 * invalidateGameResultsCache() after writing new data (the sync layer does
 * this automatically).
 */
export async function getAllGameResults(): Promise<GameResult[]> {
  if (cache) return cache;

  const [allTeams, allOwners, matchups] = await Promise.all([
    getAllTeams(),
    getOwners(),
    getAllMatchups(),
  ]);
  const teams = new Map(allTeams.map((t) => [`${t.season}:${t.team_id}`, t]));
  const owners = new Map(allOwners.map((o) => [o.owner_id, o.display_name]));

  const results: GameResult[] = [];

  function pushSide(
    m: MatchupRow,
    side: { teamId: number | null; points: number | null },
    other: { teamId: number | null; points: number | null },
  ) {
    if (side.teamId === null || side.points === null) return;
    const team = teams.get(`${m.season}:${side.teamId}`);
    if (!team) return;

    const opponentTeam = other.teamId !== null ? teams.get(`${m.season}:${other.teamId}`) : undefined;

    let result: GameResult['result'] = 'BYE';
    if (other.teamId === null || other.points === null) {
      result = 'BYE';
    } else if (side.points > other.points) {
      result = 'W';
    } else if (side.points < other.points) {
      result = 'L';
    } else {
      result = 'T';
    }

    results.push({
      season: m.season,
      week: m.week,
      isPlayoff: !!m.is_playoff,
      teamId: side.teamId,
      ownerId: team.owner_id,
      ownerName: owners.get(team.owner_id) ?? 'Unknown Owner',
      teamName: team.team_name,
      points: side.points,
      opponentTeamId: other.teamId,
      opponentOwnerId: opponentTeam?.owner_id ?? null,
      opponentOwnerName: opponentTeam ? owners.get(opponentTeam.owner_id) ?? null : null,
      opponentTeamName: opponentTeam?.team_name ?? null,
      opponentPoints: other.points,
      result,
      durationWeeks: m.duration_weeks ?? 1,
    });
  }

  for (const m of matchups) {
    if (m.home_score === null && m.away_score === null) continue;
    pushSide(
      m,
      { teamId: m.home_team_id, points: m.home_score },
      { teamId: m.away_team_id, points: m.away_score },
    );
    pushSide(
      m,
      { teamId: m.away_team_id, points: m.away_score },
      { teamId: m.home_team_id, points: m.home_score },
    );
  }

  cache = results;
  return results;
}

export function invalidateGameResultsCache() {
  cache = null;
}

/** Regular-season-only games (used for luck / power ranking math, where we
 * want every team compared against the same full-league pool each week). */
export async function getRegularSeasonGameResults(): Promise<GameResult[]> {
  const [seasonRows, games] = await Promise.all([getSeasons(), getAllGameResults()]);
  const seasons = new Map(seasonRows.map((s) => [s.season, s]));
  return games.filter((g) => {
    const season = seasons.get(g.season);
    if (!season?.regular_season_weeks) return !g.isPlayoff;
    return g.week <= season.regular_season_weeks;
  });
}
