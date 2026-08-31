import { NextRequest, NextResponse } from 'next/server';
import { syncAll } from '@/lib/espn/sync';
import { isEspnConfigured, getCronSecret } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Manual "refresh now" endpoint — hit from the UI's Sync button, or by hand.
 * In production this is guarded by CRON_SECRET (same secret the weekly cron
 * job uses) if one is set, so random visitors can't trigger a full ESPN
 * re-sync. In local dev, with no CRON_SECRET configured, it's wide open.
 */
export async function POST(req: NextRequest) {
  if (!isEspnConfigured()) {
    return NextResponse.json(
      { error: 'ESPN credentials are not configured. Set ESPN_S2, ESPN_SWID, and LEAGUE_ID in .env.' },
      { status: 400 },
    );
  }

  const secret = getCronSecret();
  if (secret) {
    const provided = req.headers.get('x-sync-secret') ?? req.nextUrl.searchParams.get('secret');
    if (provided !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const seasonParam = req.nextUrl.searchParams.get('season');
  const forceSeason = seasonParam ? Number.parseInt(seasonParam, 10) : undefined;

  try {
    const summary = await syncAll({ forceSeason });
    return NextResponse.json(summary);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'POST to this endpoint to trigger a data sync. Optionally pass ?season=YYYY to sync a single season.',
    espnConfigured: isEspnConfigured(),
  });
}
