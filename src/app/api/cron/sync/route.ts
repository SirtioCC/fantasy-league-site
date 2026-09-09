import { NextRequest, NextResponse } from 'next/server';
import { syncAll } from '@/lib/espn/sync';
import { isEspnConfigured, getCronSecret, getCurrentSeasonYear } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Automatic sync, invoked on two different cadences that both land here:
 *
 * - Weekly (Vercel Cron, see vercel.json): a plain hit with no query
 *   params does a full syncAll() across every season, catching any
 *   historical corrections.
 * - Frequent (a GitHub Actions schedule — see .github/workflows/sync.yml —
 *   because Vercel's own Cron is capped at once a day on the Hobby plan,
 *   which is far too slow to catch a game ending): `?current=1` scopes the
 *   sync to just the current season, so a poll every 20-30 minutes stays
 *   cheap instead of re-fetching the whole league history each time.
 *
 * ESPN has no push/webhook for "this game just ended" — ffl games post
 * final stats on their own schedule, sometimes minutes after the last
 * snap — so "refresh right after the game ends" in practice means polling
 * often enough that the gap is small, not a true instant trigger.
 *
 * Both cadences authenticate the same way: `Authorization: Bearer
 * $CRON_SECRET`, which Vercel Cron sets automatically and the GitHub
 * Actions workflow sets explicitly from a repo secret. If CRON_SECRET
 * isn't set, the route still works (useful for platforms other than
 * Vercel) but logs a warning.
 */
export async function GET(req: NextRequest) {
  if (!isEspnConfigured()) {
    return NextResponse.json({ error: 'ESPN credentials not configured' }, { status: 400 });
  }

  const secret = getCronSecret();
  if (secret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  } else {
    console.warn('[cron/sync] CRON_SECRET is not set — this endpoint is unauthenticated.');
  }

  const currentOnly = req.nextUrl.searchParams.get('current') === '1';

  try {
    const summary = await syncAll(currentOnly ? { forceSeason: getCurrentSeasonYear() } : undefined);
    return NextResponse.json(summary);
  } catch (err) {
    console.error('[cron/sync] failed:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
