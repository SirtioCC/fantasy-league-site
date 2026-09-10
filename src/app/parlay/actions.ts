'use server';

import { revalidatePath } from 'next/cache';
import { upsertWeeklyPick } from '@/lib/db/queries';

/** Saves an owner's typed-in parlay pick. There's no login on this site, so
 * `ownerId` is trusted from the client — it only ever comes from a fixed
 * table row already labeled with that owner's name, not a free-form field a
 * visitor could redirect at someone else. */
export async function savePick(season: number, week: number, ownerId: string, pickText: string): Promise<void> {
  await upsertWeeklyPick(season, week, ownerId, pickText.trim().slice(0, 280));
  revalidatePath('/parlay');
}
