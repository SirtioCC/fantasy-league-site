import { getEspnCredentials, type EspnCredentials } from '@/lib/env';
import type { EspnLeagueResponse, EspnPlayerEntry, EspnPlayersResponse } from './types';

const CURRENT_SEASON_BASE = 'https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons';
const HISTORY_BASE = 'https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/leagueHistory';
const PLAYERS_BASE = 'https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons';

export class EspnNotFoundError extends Error {}
export class EspnAuthError extends Error {}

function cookieHeader(creds: EspnCredentials): string {
  return `espn_s2=${creds.espnS2}; SWID=${creds.swid};`;
}

async function espnFetch(url: string, creds: EspnCredentials): Promise<unknown> {
  const maxAttempts = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          Cookie: cookieHeader(creds),
          Accept: 'application/json',
          'User-Agent': 'Mozilla/5.0 (fantasy-league-site data sync)',
        },
        cache: 'no-store',
      });

      if (res.status === 404) throw new EspnNotFoundError(`404 for ${url}`);
      if (res.status === 401 || res.status === 403) {
        throw new EspnAuthError(
          `ESPN rejected the request (${res.status}). Your ESPN_S2/ESPN_SWID cookies are likely missing, expired, or wrong. See README for how to re-grab them.`,
        );
      }
      if (!res.ok) {
        throw new Error(`ESPN API error ${res.status} for ${url}`);
      }

      return await res.json();
    } catch (err) {
      if (err instanceof EspnNotFoundError || err instanceof EspnAuthError) throw err;
      lastError = err;
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, attempt * 500));
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

function buildViewQuery(views: string[]): string {
  return views.map((v) => `view=${encodeURIComponent(v)}`).join('&');
}

/**
 * Fetch a league snapshot for a given season.
 * `isCurrentSeason` selects between the live "seasons/.../leagues/" endpoint
 * (works for the season currently in progress) and the "leagueHistory"
 * endpoint (works for any completed past season). ESPN's API is picky about
 * which one answers for which years, so the sync layer tries the other one
 * as a fallback automatically. It also sometimes returns team *shells*
 * (name/logo/owner, but a blank `record.overall`) from the "current season"
 * endpoint for an old season instead of erroring — pass `requireTeamStats`
 * to detect that and retry against the historical endpoint instead of
 * silently accepting zeroed-out stats.
 */
export async function fetchLeagueSnapshot(
  season: number,
  views: string[],
  creds: EspnCredentials = mustGetCreds(),
  options: { requireTeamStats?: boolean } = {},
): Promise<EspnLeagueResponse> {
  const query = buildViewQuery(views);

  const currentUrl = `${CURRENT_SEASON_BASE}/${season}/segments/0/leagues/${creds.leagueId}?${query}`;
  try {
    const data = (await espnFetch(currentUrl, creds)) as EspnLeagueResponse;
    if (data && typeof data === 'object' && 'id' in data) {
      if (!options.requireTeamStats || hasPopulatedTeamStats(data)) return data;
      // Fall through: this response has teams but blank stats — a known
      // ESPN quirk for some past seasons. Try the historical endpoint.
    }
  } catch (err) {
    if (err instanceof EspnAuthError) throw err;
    // fall through to history endpoint
  }

  const historyUrl = `${HISTORY_BASE}/${creds.leagueId}?seasonId=${season}&${query}`;
  const data = (await espnFetch(historyUrl, creds)) as EspnLeagueResponse[] | EspnLeagueResponse;
  const historySnapshot = Array.isArray(data)
    ? (() => {
        if (data.length === 0) throw new EspnNotFoundError(`No history for season ${season}`);
        return data[0];
      })()
    : data;
  return historySnapshot;
}

function hasPopulatedTeamStats(data: EspnLeagueResponse): boolean {
  const teams = data.teams;
  if (!teams || teams.length === 0) return false;
  return teams.some((t) => {
    const overall = t.record?.overall;
    return !!overall && (typeof overall.wins === 'number' || typeof overall.pointsFor === 'number');
  });
}

/**
 * Walk backwards year by year from `fromSeason` calling the history endpoint
 * with minimal views, stopping at the first season that 404s (or errors).
 * Returns the list of season years confirmed to have data, descending.
 */
export async function discoverAvailableSeasons(
  fromSeason: number,
  minSeason: number,
  creds: EspnCredentials = mustGetCreds(),
): Promise<number[]> {
  const found: number[] = [];
  let season = fromSeason;

  while (season >= minSeason) {
    try {
      await fetchLeagueSnapshot(season, ['mSettings'], creds);
      found.push(season);
      season -= 1;
    } catch (err) {
      if (err instanceof EspnAuthError) throw err;
      break;
    }
  }

  return found;
}

export interface EspnPlayerSummary {
  fullName: string;
  position: string | null;
  proTeam: string | null;
  totalPoints: number | null;
}

export async function fetchPlayersByIds(
  season: number,
  playerIds: number[],
  creds: EspnCredentials = mustGetCreds(),
): Promise<Map<number, EspnPlayerSummary>> {
  const result = new Map<number, EspnPlayerSummary>();
  if (playerIds.length === 0) return result;

  const chunkSize = 300;
  for (let i = 0; i < playerIds.length; i += chunkSize) {
    const chunk = playerIds.slice(i, i + chunkSize);
    // ESPN only computes appliedTotal (fantasy points under this league's
    // scoring settings) when the request is scoped to the league AND asks
    // for both views together — kona_playercard alone comes back with empty
    // `stats` objects, confirmed via scripts/_debug_player.ts against the
    // live API. players_wl is what already reliably resolved name/position.
    const url = `${PLAYERS_BASE}/${season}/segments/0/leagues/${creds.leagueId}/players?scoringPeriodId=0&view=players_wl&view=kona_playercard`;
    const filter = { players: { filterIds: { value: chunk } } };

    const res = await fetch(url, {
      headers: {
        Cookie: cookieHeader(creds),
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (fantasy-league-site data sync)',
        'x-fantasy-filter': JSON.stringify(filter),
      },
      cache: 'no-store',
    });

    if (!res.ok) continue; // player resolution is best-effort, never fatal

    const data = (await res.json()) as EspnPlayersResponse | { id: number; fullName?: string }[];
    const entries = Array.isArray(data) ? data : data.players ?? [];

    for (const entry of entries) {
      const player = 'player' in entry ? entry.player : (entry as { id: number; fullName?: string });
      if (!player) continue;
      const id = 'id' in entry ? entry.id : player.id;
      result.set(id, {
        fullName: player.fullName ?? `Player #${id}`,
        position: POSITION_MAP[(player as { defaultPositionId?: number }).defaultPositionId ?? -1] ?? null,
        proTeam: PRO_TEAM_MAP[(player as { proTeamId?: number }).proTeamId ?? -1] ?? null,
        totalPoints: extractSeasonPoints(player as EspnPlayerEntry, season),
      });
    }
  }

  return result;
}

function extractSeasonPoints(player: EspnPlayerEntry, season: number): number | null {
  const stats = player.stats ?? [];

  // Prefer the single "actual, season total" entry ESPN provides directly.
  const seasonTotal = stats.find(
    (s) => s.seasonId === season && s.statSourceId === 0 && s.statSplitTypeId === 0,
  );
  if (seasonTotal && typeof seasonTotal.appliedTotal === 'number') return seasonTotal.appliedTotal;

  // Fallback for seasons where ESPN only returns per-week actuals: sum them.
  const weekly = stats.filter(
    (s) => s.seasonId === season && s.statSourceId === 0 && (s.scoringPeriodId ?? 0) > 0,
  );
  if (weekly.length === 0) return null;
  return weekly.reduce((sum, s) => sum + (s.appliedTotal ?? 0), 0);
}

function mustGetCreds(): EspnCredentials {
  const creds = getEspnCredentials();
  if (!creds) {
    throw new Error(
      'Missing ESPN credentials. Set ESPN_S2, ESPN_SWID, and LEAGUE_ID in your .env file.',
    );
  }
  return creds;
}

// A player's actual position, keyed by ESPN's `defaultPositionId`. Not to be
// confused with `eligibleSlots`/lineup slot IDs (which include roster slots
// like FLEX, BE, IR that aren't real positions) — mixing those tables up is
// what previously produced nonsense values like "TQB" or "RB/WR" for
// single-position players.
const POSITION_MAP: Record<number, string> = {
  1: 'QB',
  2: 'RB',
  3: 'WR',
  4: 'TE',
  5: 'K',
  16: 'D/ST',
};

const PRO_TEAM_MAP: Record<number, string> = {
  1: 'ATL',
  2: 'BUF',
  3: 'CHI',
  4: 'CIN',
  5: 'CLE',
  6: 'DAL',
  7: 'DEN',
  8: 'DET',
  9: 'GB',
  10: 'TEN',
  11: 'IND',
  12: 'KC',
  13: 'LV',
  14: 'LAR',
  15: 'MIA',
  16: 'MIN',
  17: 'NE',
  18: 'NO',
  19: 'NYG',
  20: 'NYJ',
  21: 'PHI',
  22: 'ARI',
  23: 'PIT',
  24: 'LAC',
  25: 'SF',
  26: 'SEA',
  27: 'TB',
  28: 'WSH',
  29: 'CAR',
  30: 'JAX',
  33: 'BAL',
  34: 'HOU',
};
