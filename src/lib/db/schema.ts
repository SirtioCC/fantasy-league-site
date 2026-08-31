export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS sync_meta (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- One row per ESPN account that has managed a team in the league.
CREATE TABLE IF NOT EXISTS owners (
  owner_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL
);

-- One row per season, storing league-wide settings needed for analytics.
CREATE TABLE IF NOT EXISTS seasons (
  season INTEGER PRIMARY KEY,
  league_name TEXT,
  current_matchup_period INTEGER,
  final_scoring_period INTEGER,
  regular_season_weeks INTEGER,
  playoff_team_count INTEGER,
  team_count INTEGER,
  is_active INTEGER NOT NULL DEFAULT 0,
  synced_at TEXT
);

-- One row per team-in-a-season (team ids can be reused/retired across years).
CREATE TABLE IF NOT EXISTS teams (
  season INTEGER NOT NULL,
  team_id INTEGER NOT NULL,
  owner_id TEXT NOT NULL,
  team_name TEXT NOT NULL,
  abbrev TEXT,
  logo_url TEXT,
  PRIMARY KEY (season, team_id)
);

CREATE TABLE IF NOT EXISTS standings (
  season INTEGER NOT NULL,
  team_id INTEGER NOT NULL,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  ties INTEGER NOT NULL DEFAULT 0,
  points_for REAL NOT NULL DEFAULT 0,
  points_against REAL NOT NULL DEFAULT 0,
  final_rank INTEGER,
  playoff_seed INTEGER,
  made_playoffs INTEGER NOT NULL DEFAULT 0,
  is_champion INTEGER NOT NULL DEFAULT 0,
  is_runner_up INTEGER NOT NULL DEFAULT 0,
  is_third_place INTEGER NOT NULL DEFAULT 0,
  is_last_place INTEGER NOT NULL DEFAULT 0,
  streak_type TEXT,
  streak_length INTEGER,
  PRIMARY KEY (season, team_id)
);

CREATE TABLE IF NOT EXISTS matchups (
  season INTEGER NOT NULL,
  week INTEGER NOT NULL,
  matchup_id INTEGER NOT NULL,
  home_team_id INTEGER,
  home_score REAL,
  away_team_id INTEGER,
  away_score REAL,
  winner TEXT, -- HOME | AWAY | TIE | UNDECIDED
  playoff_tier_type TEXT, -- NONE | WINNERS_BRACKET | LOSERS_CONSOLATION_LADDER
  is_playoff INTEGER NOT NULL DEFAULT 0,
  duration_weeks INTEGER NOT NULL DEFAULT 1, -- >1 for a combined multi-week matchup (e.g. a 2-week championship round)
  PRIMARY KEY (season, week, matchup_id)
);

CREATE TABLE IF NOT EXISTS players (
  season INTEGER NOT NULL,
  player_id INTEGER NOT NULL,
  full_name TEXT,
  position TEXT,
  pro_team TEXT,
  total_points REAL,
  PRIMARY KEY (season, player_id)
);

CREATE TABLE IF NOT EXISTS draft_picks (
  season INTEGER NOT NULL,
  overall_pick INTEGER NOT NULL,
  round_id INTEGER,
  round_pick INTEGER,
  team_id INTEGER,
  player_id INTEGER,
  bid_amount INTEGER,
  keeper INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (season, overall_pick)
);

CREATE TABLE IF NOT EXISTS transactions (
  season INTEGER NOT NULL,
  transaction_id TEXT NOT NULL,
  type TEXT,
  status TEXT,
  team_id INTEGER,
  player_id INTEGER,
  bid_amount INTEGER,
  processed_date TEXT,
  PRIMARY KEY (season, transaction_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_teams_owner ON teams (owner_id);
CREATE INDEX IF NOT EXISTS idx_matchups_season_week ON matchups (season, week);
CREATE INDEX IF NOT EXISTS idx_standings_season ON standings (season);
CREATE INDEX IF NOT EXISTS idx_draft_season ON draft_picks (season);
CREATE INDEX IF NOT EXISTS idx_txn_season ON transactions (season);
`;
