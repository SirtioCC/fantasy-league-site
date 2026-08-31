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
}

export function getOwners(): OwnerRow[] {
  return getDb().prepare('SELECT * FROM owners ORDER BY display_name').all() as OwnerRow[];
}

export function getOwner(ownerId: string): OwnerRow | null {
  return (
    (getDb().prepare('SELECT * FROM owners WHERE owner_id = ?').get(ownerId) as OwnerRow) ?? null
  );
}

export function getSeasons(): SeasonRow[] {
  return getDb().prepare('SELECT * FROM seasons ORDER BY season DESC').all() as SeasonRow[];
}

export function getSeason(season: number): SeasonRow | null {
  return (
    (getDb().prepare('SELECT * FROM seasons WHERE season = ?').get(season) as SeasonRow) ?? null
  );
}

export function getLatestSeason(): SeasonRow | null {
  const seasons = getSeasons();
  return seasons[0] ?? null;
}

export function getAllTeams(): TeamRow[] {
  return getDb().prepare('SELECT * FROM teams').all() as TeamRow[];
}

export function getTeamsForSeason(season: number): TeamRow[] {
  return getDb().prepare('SELECT * FROM teams WHERE season = ?').all(season) as TeamRow[];
}

export function getTeamsForOwner(ownerId: string): TeamRow[] {
  return getDb()
    .prepare('SELECT * FROM teams WHERE owner_id = ? ORDER BY season')
    .all(ownerId) as TeamRow[];
}

export function getAllStandings(): StandingRow[] {
  return getDb().prepare('SELECT * FROM standings').all() as StandingRow[];
}

export function getStandingsForSeason(season: number): StandingRow[] {
  return getDb()
    .prepare('SELECT * FROM standings WHERE season = ? ORDER BY final_rank IS NULL, final_rank')
    .all(season) as StandingRow[];
}

export function getAllMatchups(): MatchupRow[] {
  return getDb().prepare('SELECT * FROM matchups').all() as MatchupRow[];
}

export function getMatchupsForSeason(season: number): MatchupRow[] {
  return getDb()
    .prepare('SELECT * FROM matchups WHERE season = ? ORDER BY week, matchup_id')
    .all(season) as MatchupRow[];
}

export function getPlayedMatchups(): MatchupRow[] {
  return getDb()
    .prepare(
      `SELECT * FROM matchups WHERE home_score IS NOT NULL AND away_score IS NOT NULL AND away_team_id IS NOT NULL AND (home_score > 0 OR away_score > 0)`,
    )
    .all() as MatchupRow[];
}

export function getDraftPicksForSeason(season: number): DraftPickRow[] {
  return getDb()
    .prepare('SELECT * FROM draft_picks WHERE season = ? ORDER BY overall_pick')
    .all(season) as DraftPickRow[];
}

export function getTransactionsForSeason(season: number): TransactionRow[] {
  return getDb()
    .prepare('SELECT * FROM transactions WHERE season = ? ORDER BY processed_date DESC')
    .all(season) as TransactionRow[];
}

export function getTransactionsForTeam(season: number, teamId: number): TransactionRow[] {
  return getDb()
    .prepare(
      'SELECT * FROM transactions WHERE season = ? AND team_id = ? ORDER BY processed_date DESC',
    )
    .all(season, teamId) as TransactionRow[];
}

export function getPlayer(season: number, playerId: number): PlayerRow | null {
  return (
    (getDb()
      .prepare('SELECT * FROM players WHERE season = ? AND player_id = ?')
      .get(season, playerId) as PlayerRow) ?? null
  );
}

export function getPlayersMap(season: number): Map<number, PlayerRow> {
  const rows = getDb().prepare('SELECT * FROM players WHERE season = ?').all(season) as PlayerRow[];
  return new Map(rows.map((r) => [r.player_id, r]));
}
