/**
 * Loosely-typed shapes for the subset of ESPN's private Fantasy Football API
 * we consume. ESPN does not publish an official schema and the shape has
 * drifted across seasons, so almost everything here is optional / defensive
 * on purpose — the sync layer must never crash on a missing field, it should
 * just skip what it can't find.
 */

export interface EspnMember {
  id: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
}

export interface EspnTeamRecordStats {
  wins?: number;
  losses?: number;
  ties?: number;
  pointsFor?: number;
  pointsAgainst?: number;
  streakType?: string;
  streakLength?: number;
}

export interface EspnTeam {
  id: number;
  abbrev?: string;
  location?: string;
  nickname?: string;
  name?: string;
  logo?: string;
  owners?: string[];
  primaryOwner?: string;
  playoffSeed?: number;
  rankCalculatedFinal?: number;
  currentProjectedRank?: number;
  record?: {
    overall?: EspnTeamRecordStats;
  };
}

export interface EspnScoreboardTeamEntry {
  teamId: number;
  totalPoints?: number;
  totalPointsLive?: number;
  /** Present when a "matchup period" combines multiple real weeks (e.g. a
   * 2-week championship round) — keyed by scoring period id. If this has
   * more than one key, totalPoints is a combined multi-week sum, not a
   * single week's score. */
  pointsByScoringPeriod?: Record<string, number>;
}

export interface EspnScheduleItem {
  matchupPeriodId: number;
  id?: number;
  home?: EspnScoreboardTeamEntry;
  away?: EspnScoreboardTeamEntry;
  winner?: 'HOME' | 'AWAY' | 'TIE' | 'UNDECIDED';
  playoffTierType?: 'NONE' | 'WINNERS_BRACKET' | 'LOSERS_CONSOLATION_LADDER' | string;
}

export interface EspnSettings {
  name?: string;
  scheduleSettings?: {
    matchupPeriodCount?: number;
    playoffTeamCount?: number;
    regularSeasonMatchupPeriodCount?: number;
  };
}

export interface EspnStatus {
  currentMatchupPeriod?: number;
  finalScoringPeriod?: number;
  isActive?: boolean;
  latestScoringPeriod?: number;
}

export interface EspnDraftPick {
  overallPickNumber: number;
  roundId?: number;
  roundPickNumber?: number;
  teamId?: number;
  playerId?: number;
  bidAmount?: number;
  keeper?: boolean;
}

export interface EspnDraftDetail {
  drafted?: boolean;
  picks?: EspnDraftPick[];
}

export interface EspnTransactionItem {
  playerId?: number;
  type?: string; // ADD | DROP | ...
  fromTeamId?: number;
  toTeamId?: number;
}

export interface EspnTransaction {
  id: string;
  type?: string; // WAIVER | FREEAGENT | TRADE | ...
  status?: string;
  teamId?: number;
  bidAmount?: number;
  proposedDate?: number;
  processDate?: number;
  items?: EspnTransactionItem[];
}

export interface EspnLeagueResponse {
  id?: number;
  seasonId?: number;
  scoringPeriodId?: number;
  settings?: EspnSettings;
  status?: EspnStatus;
  members?: EspnMember[];
  teams?: EspnTeam[];
  schedule?: EspnScheduleItem[];
  draftDetail?: EspnDraftDetail;
  transactions?: EspnTransaction[];
}

export interface EspnPlayerStat {
  seasonId?: number;
  scoringPeriodId?: number;
  statSourceId?: number; // 0 = actual, 1 = projected
  statSplitTypeId?: number; // 0 = season total, 1 = weekly, others = rolling windows
  appliedTotal?: number; // fantasy points under the requesting league's scoring settings
}

export interface EspnPlayerEntry {
  id: number;
  fullName?: string;
  defaultPositionId?: number;
  proTeamId?: number;
  stats?: EspnPlayerStat[];
}

export interface EspnPlayersResponse {
  players?: { id: number; player?: EspnPlayerEntry }[];
}
