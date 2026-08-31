import { getAllMatchups, getAllTeams, getOwners, type MatchupRow } from '@/lib/db/queries';

export interface GameResult {
  season: number;
  week: number;
  isPlayoff: boolean;
  /** Raw ESPN playoffTierType for this matchup: 'NONE' for an ordinary
   * regular-season game, 'WINNERS_BRACKET' for a championship-bracket game,
   * or a consolation-ladder value for a placement game played during the
   * playoff weeks. `isPlayoff` above only tracks the WINNERS_BRACKET case —
   * this field is what actually distinguishes "regular season" from
   * everything else, since a consolation game is still not a real
   * regular-season game even though it isn't WINNERS_BRACKET either. */
  playoffTierType: string | null;
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
      playoffTierType: m.playoff_tier_type,
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
 * want every team compared against the same full-league pool each week).
 *
 * A game only counts as "regular season" when ESPN's playoffTierType is
 * 'NONE' (or missing, for older synced data). `isPlayoff`/`is_playoff` is
 * NOT enough on its own — it's only set for WINNERS_BRACKET games, so a
 * team eliminated into the consolation ladder keeps racking up "regular
 * season" games in the playoff weeks while the team that actually made
 * the championship has its bracket games excluded, giving playoff teams
 * an artificially short, skewed record. Week-number cutoffs have the same
 * problem in reverse if `regular_season_weeks` is ever missing/zero for a
 * season. playoffTierType sidesteps both. */
export async function getRegularSeasonGameResults(): Promise<GameResult[]> {
  const games = await getAllGameResults();
  return games.filter((g) => !g.playoffTierType || g.playoffTierType === 'NONE');
}
