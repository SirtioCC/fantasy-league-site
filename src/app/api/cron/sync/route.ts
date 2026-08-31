import { NextRequest, NextResponse } from 'next/server';
import { syncAll } from '@/lib/espn/sync';
import { isEspnConfigured, getCronSecret } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Weekly automatic sync, invoked by Vercel Cron (see vercel.json — Tuesdays
 * at 10:00 UTC, after Monday Night Football has finished). Vercel signs
 * cron requests with `Authorization: Bearer $CRON_SECRET`; we verify that
 * here so nobody else can trigger it. If CRON_SECRET isn't set, the route
 * still works (useful for platforms other than Vercel) but logs a warning.
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

  try {
    const summary = await syncAll();
    return NextResponse.json(summary);
  } catch (err) {
    console.error('[cron/sync] failed:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
