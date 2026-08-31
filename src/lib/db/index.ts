import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { getDatabasePath } from '@/lib/env';
import { SCHEMA_SQL } from './schema';

let instance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (instance) return instance;

  const dbPath = getDatabasePath();
  const dir = path.dirname(dbPath);
  if (dir && dir !== '.' && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA_SQL);

  instance = db;
  return db;
}

export function getMeta(key: string): string | null {
  const row = getDb()
    .prepare('SELECT value FROM sync_meta WHERE key = ?')
    .get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setMeta(key: string, value: string): void {
  getDb()
    .prepare(
      'INSERT INTO sync_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    )
    .run(key, value);
}

/** True if we have ever successfully synced at least one season. */
export function hasAnyData(): boolean {
  const row = getDb()
    .prepare('SELECT COUNT(*) as c FROM seasons')
    .get() as { c: number };
  return row.c > 0;
}
