import { getDb } from './index';

export interface OwnerRow {
  owner_id: string;
  display_name: string;
}

export interface SeasonRow {
  season: number;
  league_name: string | null;
  current_matchup_period: number | null;
  final_scoring_period: number | null;
  regular_season_weeks: number | null;
  playoff_team_count: number | null;
  team_count: number | null;
  is_active: number;
  synced_at: string | null;
}

export interface TeamRow {
  season: number;
  team_id: number;
  owner_id: string;
  team_name: string;
  abbrev: string | null;
  logo_url: string | null;
}

export interface StandingRow {
  season: number;
  team_id: number;
  wins: number;
  losses: number;
  ties: number;
  points_for: number;
  points_against: number;
  final_rank: number | null;
  playoff_seed: number | null;
  made_playoffs: number;
  is_champion: number;
  is_runner_up: number;
  is_third_place: number;
  is_last_place: number;
  streak_type: string | null;
  streak_length: number | null;
}

export interface MatchupRow {
  season: number;
  week: number;
  matchup_id: number;
  home_team_id: number | null;
  home_score: number | null;
  away_team_id: number | null;
  away_score: number | null;
  winner: string | null;
  playoff_tier_type: string | null;
  is_playoff: number;
  duration_weeks: number;
}

export interface DraftPickRow {
  season: number;
  overall_pick: number;
  round_id: number | null;
  round_pick: number | null;
  team_id: number | null;
  player_id: number | null;
  bid_amount: number | null;
  keeper: number;
}

export interface TransactionRow {
  season: number;
  transaction_id: string;
  type: string | null;
  status: string | null;
  team_id: number | null;
  player_id: number | null;
  bid_amount: number | null;
  processed_date: string | null;
}

export interface PlayerRow {
  season: number;
  player_id: number;
  full_name: string | null;
  position: string | null;
  pro_team: string | null;
  total_points: number | null;
}

type SqlArg = string | number | null;

async function all<T>(sql: string, args: SqlArg[] = []): Promise<T[]> {
  const db = await getDb();
  const result = await db.execute({ sql, args });
  // libsql's Row objects carry hidden non-enumerable numeric-index
  // properties (they can be used array-style) alongside the named columns.
  // React's Server->Client serialization requires every own property to be
  // enumerable, so passing a Row straight to a Client Component fails
  // ("Only plain objects can be passed..."). Spreading copies only the
  // enumerable (named-column) properties, producing a genuinely plain row.
  return result.rows.map((row) => ({ ...row })) as unknown as T[];
}

async function get<T>(sql: string, args: SqlArg[] = []): Promise<T | null> {
  const rows = await all<T>(sql, args);
  return rows[0] ?? null;
}

export function getOwners(): Promise<OwnerRow[]> {
  return all<OwnerRow>('SELECT * FROM owners ORDER BY display_name');
}

export function getOwner(ownerId: string): Promise<OwnerRow | null> {
  return get<OwnerRow>('SELECT * FROM owners WHERE owner_id = ?', [ownerId]);
}

export function getSeasons(): Promise<SeasonRow[]> {
  return all<SeasonRow>('SELECT * FROM seasons ORDER BY season DESC');
}

export function getSeason(season: number): Promise<SeasonRow | null> {
  return get<SeasonRow>('SELECT * FROM seasons WHERE season = ?', [season]);
}

export async function getLatestSeason(): Promise<SeasonRow | null> {
  const seasons = await getSeasons();
  return seasons[0] ?? null;
}

/** Seasons that actually have at least one real (non-phantom) matchup —
 * excludes a league year that exists on ESPN as an empty shell (created,
 * but no games ever played/scored, e.g. a dormant season). */
export async function getSeasonsWithGames(): Promise<number[]> {
  const rows = await all<{ season: number }>('SELECT DISTINCT season FROM matchups ORDER BY season DESC');
  return rows.map((r) => r.season);
}

export function getAllTeams(): Promise<TeamRow[]> {
  return all<TeamRow>('SELECT * FROM teams');
}

export function getTeamsForSeason(season: number): Promise<TeamRow[]> {
  return all<TeamRow>('SELECT * FROM teams WHERE season = ?', [season]);
}

export function getTeamsForOwner(ownerId: string): Promise<TeamRow[]> {
  return all<TeamRow>('SELECT * FROM teams WHERE owner_id = ? ORDER BY season', [ownerId]);
}

/** Each owner's most recent team, keyed by owner id — the source of their
 * current visual identity (logo, team name) on pages that only carry an
 * owner id rather than a specific season's team. */
export async function getLatestTeamByOwner(): Promise<Map<string, TeamRow>> {
  const teams = await all<TeamRow>('SELECT * FROM teams ORDER BY season');
  const latest = new Map<string, TeamRow>();
  for (const team of teams) latest.set(team.owner_id, team);
  return latest;
}

export function getAllStandings(): Promise<StandingRow[]> {
  return all<StandingRow>('SELECT * FROM standings');
}

export function getStandingsForSeason(season: number): Promise<StandingRow[]> {
  return all<StandingRow>(
    'SELECT * FROM standings WHERE season = ? ORDER BY final_rank IS NULL, final_rank',
    [season],
  );
}

export function getAllMatchups(): Promise<MatchupRow[]> {
  return all<MatchupRow>('SELECT * FROM matchups');
}

export function getMatchupsForSeason(season: number): Promise<MatchupRow[]> {
  return all<MatchupRow>('SELECT * FROM matchups WHERE season = ? ORDER BY week, matchup_id', [season]);
}

export function getPlayedMatchups(): Promise<MatchupRow[]> {
  return all<MatchupRow>(
    `SELECT * FROM matchups WHERE home_score IS NOT NULL AND away_score IS NOT NULL AND away_team_id IS NOT NULL AND (home_score > 0 OR away_score > 0)`,
  );
}

export function getDraftPicksForSeason(season: number): Promise<DraftPickRow[]> {
  return all<DraftPickRow>('SELECT * FROM draft_picks WHERE season = ? ORDER BY overall_pick', [season]);
}

export function getTransactionsForSeason(season: number): Promise<TransactionRow[]> {
  return all<TransactionRow>('SELECT * FROM transactions WHERE season = ? ORDER BY processed_date DESC', [
    season,
  ]);
}

export function getTransactionsForTeam(season: number, teamId: number): Promise<TransactionRow[]> {
  return all<TransactionRow>(
    'SELECT * FROM transactions WHERE season = ? AND team_id = ? ORDER BY processed_date DESC',
    [season, teamId],
  );
}

export function getPlayer(season: number, playerId: number): Promise<PlayerRow | null> {
  return get<PlayerRow>('SELECT * FROM players WHERE season = ? AND player_id = ?', [season, playerId]);
}

export async function getPlayersMap(season: number): Promise<Map<number, PlayerRow>> {
  const rows = await all<PlayerRow>('SELECT * FROM players WHERE season = ?', [season]);
  return new Map(rows.map((r) => [r.player_id, r]));
}
