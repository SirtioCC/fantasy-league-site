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
  const configured = readEnv('DATABASE_PATH');
  if (configured) return configured;
  // Vercel's deployed filesystem is read-only outside /tmp — everywhere
  // else (local dev, most other hosts) the project directory is writable.
  return process.env.VERCEL ? '/tmp/league.db' : './data/league.db';
}

export interface TursoConfig {
  url: string;
  authToken: string;
}

/**
 * Turso (hosted libSQL) connection, when configured. Without it, the app
 * falls back to a local SQLite file — fine for local dev, but on a
 * serverless host like Vercel a local file doesn't persist reliably
 * between requests, so production deployments should always set these.
 */
export function getTursoConfig(): TursoConfig | null {
  const url = readEnv('TURSO_DATABASE_URL');
  const authToken = readEnv('TURSO_AUTH_TOKEN');
  if (!url || !authToken) return null;
  return { url, authToken };
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
