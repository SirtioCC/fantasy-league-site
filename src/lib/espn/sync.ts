import { getDb, setMeta, getMeta } from '@/lib/db';
import { getCurrentSeasonYear, getConfiguredStartYear, getEspnCredentials } from '@/lib/env';
import {
  discoverAvailableSeasons,
  fetchLeagueSnapshot,
  fetchPlayersByIds,
  EspnNotFoundError,
} from './client';
import type { EspnLeagueResponse, EspnScheduleItem, EspnTeam } from './types';

export interface SeasonSyncResult {
  season: number;
  ok: boolean;
  error?: string;
}

export interface SyncSummary {
  syncedAt: string;
  results: SeasonSyncResult[];
}

const DEFAULT_MIN_SEASON = 2001; // ESPN Fantasy Football's API does not reach earlier than this

function teamDisplayName(team: EspnTeam): string {
  const combined = [team.location, team.nickname].filter(Boolean).join(' ').trim();
  return combined || team.name || `Team ${team.id}`;
}

function ownerIdForTeam(team: EspnTeam): string {
  return team.owners?.[0] ?? team.primaryOwner ?? `unknown-${team.id}`;
}

async function resolveSeasonsToSync(forceSeason?: number): Promise<number[]> {
  if (forceSeason) return [forceSeason];

  const currentYear = getCurrentSeasonYear();
  const minSeason = getConfiguredStartYear() ?? DEFAULT_MIN_SEASON;

  let earliest = getMeta('earliest_season');
  if (!earliest) {
    const found = await discoverAvailableSeasons(currentYear, minSeason);
    if (found.length === 0) {
      throw new Error(
        'Could not fetch any season from ESPN — check LEAGUE_ID and that ESPN_S2/ESPN_SWID are valid.',
      );
    }
    const earliestFound = found[found.length - 1];
    setMeta('earliest_season', String(earliestFound));
    earliest = String(earliestFound);
  }

  const earliestYear = Number.parseInt(earliest, 10);
  const seasons: number[] = [];
  for (let y = earliestYear; y <= currentYear; y++) seasons.push(y);
  return seasons;
}

function upsertOwner(displayName: string, ownerId: string) {
  getDb()
    .prepare(
      `INSERT INTO owners (owner_id, display_name) VALUES (?, ?)
       ON CONFLICT(owner_id) DO UPDATE SET display_name = excluded.display_name`,
    )
    .run(ownerId, displayName);
}

function syncSeasonCore(season: number, league: EspnLeagueResponse): void {
  const db = getDb();
  const currentYear = getCurrentSeasonYear();
  const isActive = season === currentYear && !!league.status?.isActive;
  const teamCount = league.teams?.length ?? 0;
  const playoffTeamCount = league.settings?.scheduleSettings?.playoffTeamCount ?? 0;
  const regularSeasonWeeks = league.settings?.scheduleSettings?.regularSeasonMatchupPeriodCount ?? 0;
  const seasonComplete = !isActive && (league.status?.finalScoringPeriod ?? 0) > 0;

  const run = db.transaction(() => {
    db.prepare(
      `INSERT INTO seasons (season, league_name, current_matchup_period, final_scoring_period, regular_season_weeks, playoff_team_count, team_count, is_active, synced_at)
       VALUES (@season, @league_name, @current_matchup_period, @final_scoring_period, @regular_season_weeks, @playoff_team_count, @team_count, @is_active, @synced_at)
       ON CONFLICT(season) DO UPDATE SET
         league_name = excluded.league_name,
         current_matchup_period = excluded.current_matchup_period,
         final_scoring_period = excluded.final_scoring_period,
         regular_season_weeks = excluded.regular_season_weeks,
         playoff_team_count = excluded.playoff_team_count,
         team_count = excluded.team_count,
         is_active = excluded.is_active,
         synced_at = excluded.synced_at`,
    ).run({
      season,
      league_name: league.settings?.name ?? null,
      current_matchup_period: league.status?.currentMatchupPeriod ?? null,
      final_scoring_period: league.status?.finalScoringPeriod ?? null,
      regular_season_weeks: regularSeasonWeeks,
      playoff_team_count: playoffTeamCount,
      team_count: teamCount,
      is_active: isActive ? 1 : 0,
      synced_at: new Date().toISOString(),
    });

    for (const member of league.members ?? []) {
      const displayName =
        member.displayName?.trim() ||
        [member.firstName, member.lastName].filter(Boolean).join(' ').trim() ||
        `Owner ${member.id.slice(0, 6)}`;
      upsertOwner(displayName, member.id);
    }

    const teamIdToPlayoffTierSeen = new Map<number, boolean>();
    for (const item of league.schedule ?? []) {
      if (item.playoffTierType && item.playoffTierType !== 'NONE') {
        if (item.home) teamIdToPlayoffTierSeen.set(item.home.teamId, true);
        if (item.away) teamIdToPlayoffTierSeen.set(item.away.teamId, true);
      }
    }

    for (const team of league.teams ?? []) {
      const ownerId = ownerIdForTeam(team);
      if (!db.prepare('SELECT 1 FROM owners WHERE owner_id = ?').get(ownerId)) {
        upsertOwner(`Owner ${ownerId.slice(0, 6)}`, ownerId);
      }

      db.prepare(
        `INSERT INTO teams (season, team_id, owner_id, team_name, abbrev, logo_url)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(season, team_id) DO UPDATE SET
           owner_id = excluded.owner_id,
           team_name = excluded.team_name,
           abbrev = excluded.abbrev,
           logo_url = excluded.logo_url`,
      ).run(season, team.id, ownerId, teamDisplayName(team), team.abbrev ?? null, team.logo ?? null);

      const rec = team.record?.overall;
      const finalRank =
        seasonComplete && team.rankCalculatedFinal && team.rankCalculatedFinal > 0
          ? team.rankCalculatedFinal
          : null;
      const madePlayoffs = teamIdToPlayoffTierSeen.get(team.id) ? 1 : 0;

      db.prepare(
        `INSERT INTO standings (season, team_id, wins, losses, ties, points_for, points_against, final_rank, playoff_seed, made_playoffs, is_champion, is_runner_up, is_third_place, is_last_place, streak_type, streak_length)
         VALUES (@season, @team_id, @wins, @losses, @ties, @points_for, @points_against, @final_rank, @playoff_seed, @made_playoffs, @is_champion, @is_runner_up, @is_third_place, @is_last_place, @streak_type, @streak_length)
         ON CONFLICT(season, team_id) DO UPDATE SET
           wins = excluded.wins, losses = excluded.losses, ties = excluded.ties,
           points_for = excluded.points_for, points_against = excluded.points_against,
           final_rank = excluded.final_rank, playoff_seed = excluded.playoff_seed,
           made_playoffs = excluded.made_playoffs, is_champion = excluded.is_champion,
           is_runner_up = excluded.is_runner_up, is_third_place = excluded.is_third_place,
           is_last_place = excluded.is_last_place, streak_type = excluded.streak_type,
           streak_length = excluded.streak_length`,
      ).run({
        season,
        team_id: team.id,
        wins: rec?.wins ?? 0,
        losses: rec?.losses ?? 0,
        ties: rec?.ties ?? 0,
        points_for: rec?.pointsFor ?? 0,
        points_against: rec?.pointsAgainst ?? 0,
        final_rank: finalRank,
        playoff_seed: team.playoffSeed ?? null,
        made_playoffs: madePlayoffs,
        is_champion: finalRank === 1 ? 1 : 0,
        is_runner_up: finalRank === 2 ? 1 : 0,
        is_third_place: finalRank === 3 ? 1 : 0,
        is_last_place: finalRank !== null && finalRank === teamCount ? 1 : 0,
        streak_type: rec?.streakType ?? null,
        streak_length: rec?.streakLength ?? null,
      });
    }

    const byWeek = new Map<number, EspnScheduleItem[]>();
    for (const item of league.schedule ?? []) {
      const list = byWeek.get(item.matchupPeriodId) ?? [];
      list.push(item);
      byWeek.set(item.matchupPeriodId, list);
    }

    db.prepare('DELETE FROM matchups WHERE season = ?').run(season);
    const insertMatchup = db.prepare(
      `INSERT INTO matchups (season, week, matchup_id, home_team_id, home_score, away_team_id, away_score, winner, playoff_tier_type, is_playoff)
       VALUES (@season, @week, @matchup_id, @home_team_id, @home_score, @away_team_id, @away_score, @winner, @playoff_tier_type, @is_playoff)`,
    );
    for (const [week, items] of byWeek) {
      items.forEach((item, idx) => {
        insertMatchup.run({
          season,
          week,
          matchup_id: idx,
          home_team_id: item.home?.teamId ?? null,
          home_score: item.home?.totalPoints ?? null,
          away_team_id: item.away?.teamId ?? null,
          away_score: item.away?.totalPoints ?? null,
          winner: item.winner ?? null,
          playoff_tier_type: item.playoffTierType ?? 'NONE',
          is_playoff: item.playoffTierType && item.playoffTierType !== 'NONE' ? 1 : 0,
        });
      });
    }
  });

  run();
}

async function syncDraftAndTransactions(season: number): Promise<void> {
  const db = getDb();
  const playerIds = new Set<number>();

  try {
    const draftLeague = await fetchLeagueSnapshot(season, ['mDraftDetail']);
    const picks = draftLeague.draftDetail?.picks ?? [];
    db.prepare('DELETE FROM draft_picks WHERE season = ?').run(season);
    const insertPick = db.prepare(
      `INSERT INTO draft_picks (season, overall_pick, round_id, round_pick, team_id, player_id, bid_amount, keeper)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const pick of picks) {
      if (pick.playerId) playerIds.add(pick.playerId);
      insertPick.run(
        season,
        pick.overallPickNumber,
        pick.roundId ?? null,
        pick.roundPickNumber ?? null,
        pick.teamId ?? null,
        pick.playerId ?? null,
        pick.bidAmount ?? null,
        pick.keeper ? 1 : 0,
      );
    }
  } catch (err) {
    if (!(err instanceof EspnNotFoundError)) {
      console.warn(`[sync] draft detail unavailable for ${season}:`, (err as Error).message);
    }
  }

  try {
    const txnLeague = await fetchLeagueSnapshot(season, ['mTransactions2']);
    const transactions = txnLeague.transactions ?? [];
    db.prepare('DELETE FROM transactions WHERE season = ?').run(season);
    const insertTxn = db.prepare(
      `INSERT OR IGNORE INTO transactions (season, transaction_id, type, status, team_id, player_id, bid_amount, processed_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const txn of transactions) {
      const items = txn.items && txn.items.length > 0 ? txn.items : [{ playerId: undefined, type: txn.type }];
      for (const item of items) {
        if (item.playerId) playerIds.add(item.playerId);
        insertTxn.run(
          season,
          txn.id,
          item.type ?? txn.type ?? null,
          txn.status ?? null,
          item.toTeamId ?? item.fromTeamId ?? txn.teamId ?? null,
          item.playerId ?? null,
          txn.bidAmount ?? null,
          txn.processDate ? new Date(txn.processDate).toISOString() : null,
        );
      }
    }
  } catch (err) {
    if (!(err instanceof EspnNotFoundError)) {
      console.warn(`[sync] transactions unavailable for ${season}:`, (err as Error).message);
    }
  }

  if (playerIds.size > 0) {
    try {
      const resolved = await fetchPlayersByIds(season, Array.from(playerIds));
      const insertPlayer = db.prepare(
        `INSERT INTO players (season, player_id, full_name, position, pro_team) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(season, player_id) DO UPDATE SET full_name = excluded.full_name, position = excluded.position, pro_team = excluded.pro_team`,
      );
      for (const [id, info] of resolved) {
        insertPlayer.run(season, id, info.fullName, info.position, info.proTeam);
      }
    } catch (err) {
      console.warn(`[sync] player name resolution failed for ${season}:`, (err as Error).message);
    }
  }
}

export async function syncSeason(season: number): Promise<void> {
  const league = await fetchLeagueSnapshot(season, ['mTeam', 'mStandings', 'mSettings', 'mMatchupScore']);
  syncSeasonCore(season, league);
  await syncDraftAndTransactions(season);
}

export async function syncAll(options: { forceSeason?: number } = {}): Promise<SyncSummary> {
  if (!getEspnCredentials()) {
    throw new Error('Missing ESPN credentials. Set ESPN_S2, ESPN_SWID, and LEAGUE_ID in your .env file.');
  }

  const seasons = await resolveSeasonsToSync(options.forceSeason);
  const results: SeasonSyncResult[] = [];

  for (const season of seasons) {
    try {
      await syncSeason(season);
      results.push({ season, ok: true });
    } catch (err) {
      results.push({ season, ok: false, error: (err as Error).message });
    }
  }

  const syncedAt = new Date().toISOString();
  setMeta('last_synced_at', syncedAt);

  return { syncedAt, results };
}
