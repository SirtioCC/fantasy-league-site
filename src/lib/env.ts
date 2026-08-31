/**
 * Central place for reading & validating environment configuration.
 * Safe to import from server components, API routes, and the standalone
 * sync script (which loads dotenv before anything else touches this file).
 */

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

export interface EspnCredentials {
  espnS2: string;
  swid: string;
  leagueId: string;
}

/** Returns credentials if all three required env vars are present, else null. */
export function getEspnCredentials(): EspnCredentials | null {
  const espnS2 = readEnv('ESPN_S2');
  const swid = readEnv('ESPN_SWID');
  const leagueId = readEnv('LEAGUE_ID');

  if (!espnS2 || !swid || !leagueId) return null;

  return {
    espnS2,
    swid: swid.startsWith('{') ? swid : `{${swid.replace(/[{}]/g, '')}}`,
    leagueId,
  };
}

export function isEspnConfigured(): boolean {
  return getEspnCredentials() !== null;
}

/** Optional lower bound for how far back to probe for league history. */
export function getConfiguredStartYear(): number | null {
  const raw = readEnv('LEAGUE_START_YEAR');
  if (!raw) return null;
  const year = Number.parseInt(raw, 10);
  return Number.isFinite(year) ? year : null;
}

export function getDatabasePath(): string {
  return readEnv('DATABASE_PATH') ?? './data/league.db';
}

export function getCronSecret(): string | null {
  return readEnv('CRON_SECRET') ?? null;
}

/** The current NFL/fantasy season year, using the convention that a season
 * "belongs" to the year it starts in (e.g. the 2025 season runs Sep 2025 -
 * Jan 2026). Since ESPN's league year flips over around March, we treat
 * Jan/Feb as still belonging to the previous season year for sync purposes. */
export function getCurrentSeasonYear(date: Date = new Date()): number {
  const month = date.getUTCMonth(); // 0 = Jan
  const year = date.getUTCFullYear();
  return month <= 1 ? year - 1 : year;
}
