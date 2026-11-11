'use server';

import { revalidatePath } from 'next/cache';
import { upsertParlayResult, upsertWeeklyPick } from '@/lib/db/queries';

/** Saves an owner's typed-in parlay pick. There's no login on this site, so
 * `ownerId` is trusted from the client — it only ever comes from a fixed
 * table row already labeled with that owner's name, not a free-form field a
 * visitor could redirect at someone else. */
export async function savePick(season: number, week: number, ownerId: string, pickText: string): Promise<void> {
  await upsertWeeklyPick(season, week, ownerId, pickText.trim().slice(0, 280));
  revalidatePath('/parlay');
}

function clampLegs(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(10, Math.floor(n)));
}

/** Saves how many of an owner's legs hit / missed for a week. */
export async function saveResult(season: number, week: number, ownerId: string, wins: number, losses: number): Promise<void> {
  await upsertParlayResult(season, week, ownerId, clampLegs(wins), clampLegs(losses));
  revalidatePath('/parlay');
}
