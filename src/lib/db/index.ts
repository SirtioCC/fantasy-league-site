import { createClient, type Client } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';
import { getDatabasePath, getTursoConfig } from '@/lib/env';
import { SCHEMA_SQL } from './schema';

let clientPromise: Promise<Client> | null = null;

/**
 * The database client — a hosted Turso (libSQL) database when
 * TURSO_DATABASE_URL/TURSO_AUTH_TOKEN are set, otherwise a local SQLite
 * file. Same client library either way, so query code never needs to know
 * which one it's talking to. A local file is fine for local dev, but on a
 * serverless host (Vercel) it doesn't reliably persist between requests —
 * production deployments should always configure Turso.
 */
export function getDb(): Promise<Client> {
  if (!clientPromise) clientPromise = initDb();
  return clientPromise;
}

async function initDb(): Promise<Client> {
  const turso = getTursoConfig();

  const client = turso
    ? createClient({ url: turso.url, authToken: turso.authToken })
    : createClient({ url: `file:${resolveLocalDbPath()}` });

  await client.executeMultiple(SCHEMA_SQL);
  await runMigrations(client);
  return client;
}

function resolveLocalDbPath(): string {
  const dbPath = getDatabasePath();
  const dir = path.dirname(dbPath);
  if (dir && dir !== '.' && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dbPath;
}

/** Lightweight migrations for databases created before a schema addition —
 * CREATE TABLE IF NOT EXISTS won't retroactively add new columns. */
async function runMigrations(client: Client): Promise<void> {
  const result = await client.execute('PRAGMA table_info(matchups)');
  const hasDurationWeeks = result.rows.some((row) => row.name === 'duration_weeks');
  if (!hasDurationWeeks) {
    await client.execute('ALTER TABLE matchups ADD COLUMN duration_weeks INTEGER NOT NULL DEFAULT 1');
  }
}

export async function getMeta(key: string): Promise<string | null> {
  const db = await getDb();
  const result = await db.execute({ sql: 'SELECT value FROM sync_meta WHERE key = ?', args: [key] });
  const row = result.rows[0] as unknown as { value: string } | undefined;
  return row?.value ?? null;
}

export async function setMeta(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: 'INSERT INTO sync_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    args: [key, value],
  });
}

/** True if we have ever successfully synced at least one season. */
export async function hasAnyData(): Promise<boolean> {
  const db = await getDb();
  const result = await db.execute('SELECT COUNT(*) as c FROM seasons');
  const row = result.rows[0] as unknown as { c: number | bigint };
  return Number(row.c) > 0;
}
