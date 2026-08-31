import { NextRequest, NextResponse } from 'next/server';
import { syncAll } from '@/lib/espn/sync';
import { isEspnConfigured } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Manual "refresh now" endpoint — hit from the UI's Sync button, or by hand.
 * Deliberately open to anyone who can load the site: there's no login
 * system here, so there's no clean way to prove a request came from the
 * league rather than a stranger, and triggering an extra sync isn't
 * sensitive (it only reads from ESPN using credentials that stay
 * server-side). CRON_SECRET instead protects the automated weekly job at
 * /api/cron/sync, which Vercel calls machine-to-machine.
 */
export async function POST(req: NextRequest) {
  if (!isEspnConfigured()) {
    return NextResponse.json(
      { error: 'ESPN credentials are not configured. Set ESPN_S2, ESPN_SWID, and LEAGUE_ID in .env.' },
      { status: 400 },
    );
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
