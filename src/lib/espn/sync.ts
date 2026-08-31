import type { InStatement } from '@libsql/client';
import { getDb, setMeta, getMeta } from '@/lib/db';
import { getCurrentSeasonYear, getConfiguredStartYear, getEspnCredentials } from '@/lib/env';
import { invalidateGameResultsCache } from '@/lib/analytics/gameResults';
import { invalidateSeasonPerformancesCache } from '@/lib/analytics/bestWorst';
import { invalidateAwardsCache } from '@/lib/analytics/awards';
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

  let earliest = await getMeta('earliest_season');
  if (!earliest) {
    const found = await discoverAvailableSeasons(currentYear, minSeason);
    if (found.length === 0) {
      throw new Error(
        'Could not fetch any season from ESPN — check LEAGUE_ID and that ESPN_S2/ESPN_SWID are valid.',
      );
    }
    const earliestFound = found[found.length - 1];
    await setMeta('earliest_season', String(earliestFound));
    earliest = String(earliestFound);
  }

  const earliestYear = Number.parseInt(earliest, 10);
  const seasons: number[] = [];
  for (let y = earliestYear; y <= currentYear; y++) seasons.push(y);
  return seasons;
}

/** Always-overwrite upsert — used for members, whose displayName from ESPN
 * is always authoritative. */
function upsertOwnerStatement(displayName: string, ownerId: string): InStatement {
  return {
    sql: `INSERT INTO owners (owner_id, display_name) VALUES (?, ?)
          ON CONFLICT(owner_id) DO UPDATE SET display_name = excluded.display_name`,
    args: [ownerId, displayName],
  };
}

/** Insert-only fallback — used for a team owner ESPN didn't also list as a
 * league member, so we don't clobber a real name with a generic one. */
function insertOwnerIfMissingStatement(displayName: string, ownerId: string): InStatement {
  return {
    sql: `INSERT INTO owners (owner_id, display_name) VALUES (?, ?)
          ON CONFLICT(owner_id) DO NOTHING`,
    args: [ownerId, displayName],
  };
}

async function syncSeasonCore(season: number, league: EspnLeagueResponse): Promise<void> {
  const db = await getDb();
  const currentYear = getCurrentSeasonYear();
  const isActive = season === currentYear && !!league.status?.isActive;
  const teamCount = league.teams?.length ?? 0;
  const playoffTeamCount = league.settings?.scheduleSettings?.playoffTeamCount ?? 0;
  const regularSeasonWeeks = league.settings?.scheduleSettings?.regularSeasonMatchupPeriodCount ?? 0;
  const seasonComplete = !isActive && (league.status?.finalScoringPeriod ?? 0) > 0;

  const statements: InStatement[] = [];

  statements.push({
    sql: `INSERT INTO seasons (season, league_name, current_matchup_period, final_scoring_period, regular_season_weeks, playoff_team_count, team_count, is_active, synced_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(season) DO UPDATE SET
            league_name = excluded.league_name,
            current_matchup_period = excluded.current_matchup_period,
            final_scoring_period = excluded.final_scoring_period,
            regular_season_weeks = excluded.regular_season_weeks,
            playoff_team_count = excluded.playoff_team_count,
            team_count = excluded.team_count,
            is_active = excluded.is_active,
            synced_at = excluded.synced_at`,
    args: [
      season,
      league.settings?.name ?? null,
      league.status?.currentMatchupPeriod ?? null,
      league.status?.finalScoringPeriod ?? null,
      regularSeasonWeeks,
      playoffTeamCount,
      teamCount,
      isActive ? 1 : 0,
      new Date().toISOString(),
    ],
  });

  for (const member of league.members ?? []) {
    const displayName =
      member.displayName?.trim() ||
      [member.firstName, member.lastName].filter(Boolean).join(' ').trim() ||
      `Owner ${member.id.slice(0, 6)}`;
    statements.push(upsertOwnerStatement(displayName, member.id));
  }

  // Only WINNERS_BRACKET counts as "made the playoffs" — teams that miss
  // the cut still play postseason games, but in LOSERS_CONSOLATION_LADDER,
  // which is not the playoffs.
  const teamIdToPlayoffTierSeen = new Map<number, boolean>();
  for (const item of league.schedule ?? []) {
    if (item.playoffTierType === 'WINNERS_BRACKET') {
      if (item.home) teamIdToPlayoffTierSeen.set(item.home.teamId, true);
      if (item.away) teamIdToPlayoffTierSeen.set(item.away.teamId, true);
    }
  }

  for (const team of league.teams ?? []) {
    const ownerId = ownerIdForTeam(team);
    statements.push(insertOwnerIfMissingStatement(`Owner ${ownerId.slice(0, 6)}`, ownerId));

    statements.push({
      sql: `INSERT INTO teams (season, team_id, owner_id, team_name, abbrev, logo_url)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(season, team_id) DO UPDATE SET
              owner_id = excluded.owner_id,
              team_name = excluded.team_name,
              abbrev = excluded.abbrev,
              logo_url = excluded.logo_url`,
      args: [season, team.id, ownerId, teamDisplayName(team), team.abbrev ?? null, team.logo ?? null],
    });

    const rec = team.record?.overall;
    const finalRank =
      seasonComplete && team.rankCalculatedFinal && team.rankCalculatedFinal > 0
        ? team.rankCalculatedFinal
        : null;
    const madePlayoffs = teamIdToPlayoffTierSeen.get(team.id) ? 1 : 0;

    statements.push({
      sql: `INSERT INTO standings (season, team_id, wins, losses, ties, points_for, points_against, final_rank, playoff_seed, made_playoffs, is_champion, is_runner_up, is_third_place, is_last_place, streak_type, streak_length)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(season, team_id) DO UPDATE SET
              wins = excluded.wins, losses = excluded.losses, ties = excluded.ties,
              points_for = excluded.points_for, points_against = excluded.points_against,
              final_rank = excluded.final_rank, playoff_seed = excluded.playoff_seed,
              made_playoffs = excluded.made_playoffs, is_champion = excluded.is_champion,
              is_runner_up = excluded.is_runner_up, is_third_place = excluded.is_third_place,
              is_last_place = excluded.is_last_place, streak_type = excluded.streak_type,
              streak_length = excluded.streak_length`,
      args: [
        season,
        team.id,
        rec?.wins ?? 0,
        rec?.losses ?? 0,
        rec?.ties ?? 0,
        rec?.pointsFor ?? 0,
        rec?.pointsAgainst ?? 0,
        finalRank,
        team.playoffSeed ?? null,
        madePlayoffs,
        finalRank === 1 ? 1 : 0,
        finalRank === 2 ? 1 : 0,
        finalRank === 3 ? 1 : 0,
        finalRank !== null && finalRank === teamCount ? 1 : 0,
        rec?.streakType ?? null,
        rec?.streakLength ?? null,
      ],
    });
  }

  const byWeek = new Map<number, EspnScheduleItem[]>();
  for (const item of league.schedule ?? []) {
    const list = byWeek.get(item.matchupPeriodId) ?? [];
    list.push(item);
    byWeek.set(item.matchupPeriodId, list);
  }

  statements.push({ sql: 'DELETE FROM matchups WHERE season = ?', args: [season] });

  for (const [week, items] of byWeek) {
    items.forEach((item, idx) => {
      const homeScore = item.home?.totalPoints ?? null;
      const awayScore = item.away?.totalPoints ?? null;
      // ESPN sometimes auto-generates a full matchup schedule for a
      // league year even when no games were ever actually played/scored
      // (e.g. a dormant season), leaving every matchup at an impossible
      // 0.0-0.0. A real fantasy score is never exactly zero, so treat
      // that combination as an unplayed phantom row and skip it.
      if ((homeScore ?? 0) === 0 && (awayScore ?? 0) === 0) return;

      // Some matchup periods (typically a championship round) combine
      // multiple real weeks into one cumulative-score "game" — detect
      // that from the per-scoring-period breakdown so single-week
      // records (most/fewest points, biggest blowout, closest game)
      // don't get skewed by a 2-week combined total.
      const homeWeeks = Object.keys(item.home?.pointsByScoringPeriod ?? {}).length;
      const awayWeeks = Object.keys(item.away?.pointsByScoringPeriod ?? {}).length;
      const durationWeeks = Math.max(homeWeeks, awayWeeks, 1);

      statements.push({
        sql: `INSERT INTO matchups (season, week, matchup_id, home_team_id, home_score, away_team_id, away_score, winner, playoff_tier_type, is_playoff, duration_weeks)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          season,
          week,
          idx,
          item.home?.teamId ?? null,
          homeScore,
          item.away?.teamId ?? null,
          awayScore,
          item.winner ?? null,
          item.playoffTierType ?? 'NONE',
          item.playoffTierType === 'WINNERS_BRACKET' ? 1 : 0,
          durationWeeks,
        ],
      });
    });
  }

  await db.batch(statements, 'write');
}

async function syncDraftAndTransactions(season: number): Promise<void> {
  const db = await getDb();
  const playerIds = new Set<number>();

  try {
    const draftLeague = await fetchLeagueSnapshot(season, ['mDraftDetail']);
    const picks = draftLeague.draftDetail?.picks ?? [];
    const statements: InStatement[] = [{ sql: 'DELETE FROM draft_picks WHERE season = ?', args: [season] }];
    for (const pick of picks) {
      if (pick.playerId) playerIds.add(pick.playerId);
      statements.push({
        sql: `INSERT INTO draft_picks (season, overall_pick, round_id, round_pick, team_id, player_id, bid_amount, keeper)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          season,
          pick.overallPickNumber,
          pick.roundId ?? null,
          pick.roundPickNumber ?? null,
          pick.teamId ?? null,
          pick.playerId ?? null,
          pick.bidAmount ?? null,
          pick.keeper ? 1 : 0,
        ],
      });
    }
    if (statements.length > 1) await db.batch(statements, 'write');
  } catch (err) {
    if (!(err instanceof EspnNotFoundError)) {
      console.warn(`[sync] draft detail unavailable for ${season}:`, (err as Error).message);
    }
  }

  try {
    const txnLeague = await fetchLeagueSnapshot(season, ['mTransactions2']);
    const transactions = txnLeague.transactions ?? [];
    const statements: InStatement[] = [
      { sql: 'DELETE FROM transactions WHERE season = ?', args: [season] },
    ];
    for (const txn of transactions) {
      const items = txn.items && txn.items.length > 0 ? txn.items : [{ playerId: undefined, type: txn.type }];
      for (const item of items) {
        if (item.playerId) playerIds.add(item.playerId);
        statements.push({
          sql: `INSERT OR IGNORE INTO transactions (season, transaction_id, type, status, team_id, player_id, bid_amount, processed_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            season,
            txn.id,
            item.type ?? txn.type ?? null,
            txn.status ?? null,
            item.toTeamId ?? item.fromTeamId ?? txn.teamId ?? null,
            item.playerId ?? null,
            txn.bidAmount ?? null,
            txn.processDate ? new Date(txn.processDate).toISOString() : null,
          ],
        });
      }
    }
    if (statements.length > 1) await db.batch(statements, 'write');
  } catch (err) {
    if (!(err instanceof EspnNotFoundError)) {
      console.warn(`[sync] transactions unavailable for ${season}:`, (err as Error).message);
    }
  }

  if (playerIds.size > 0) {
    try {
      const resolved = await fetchPlayersByIds(season, Array.from(playerIds));
      const statements: InStatement[] = Array.from(resolved, ([id, info]) => ({
        sql: `INSERT INTO players (season, player_id, full_name, position, pro_team, total_points) VALUES (?, ?, ?, ?, ?, ?)
              ON CONFLICT(season, player_id) DO UPDATE SET full_name = excluded.full_name, position = excluded.position, pro_team = excluded.pro_team, total_points = excluded.total_points`,
        args: [season, id, info.fullName, info.position, info.proTeam, info.totalPoints],
      }));
      if (statements.length > 0) await db.batch(statements, 'write');
    } catch (err) {
      console.warn(`[sync] player name resolution failed for ${season}:`, (err as Error).message);
    }
  }
}

export async function syncSeason(season: number): Promise<void> {
  const league = await fetchLeagueSnapshot(
    season,
    ['mTeam', 'mStandings', 'mSettings', 'mMatchupScore'],
    undefined,
    { requireTeamStats: true },
  );
  await syncSeasonCore(season, league);
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
  await setMeta('last_synced_at', syncedAt);
  invalidateGameResultsCache();
  invalidateSeasonPerformancesCache();
  invalidateAwardsCache();

  return { syncedAt, results };
}
