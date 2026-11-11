import { NextRequest, NextResponse } from 'next/server';
import { getLatestSeason, getTeamsForSeason, getWeeklyPicks } from '@/lib/db/queries';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Read-only list of the parlay picks for one week, by team name. Used by the
 * weekly job that grades picks and updates src/lib/parlayBaseline.ts. Picks
 * are already shown publicly on /parlay, so this exposes nothing new.
 *
 * GET /api/parlay-picks?week=10 (optional &season=2026)
 */
export async function GET(req: NextRequest) {
  const week = Number.parseInt(req.nextUrl.searchParams.get('week') ?? '', 10);
  if (!Number.isFinite(week) || week < 1) {
    return NextResponse.json({ error: 'Pass ?week=N' }, { status: 400 });
  }

  const seasonParam = req.nextUrl.searchParams.get('season');
  const season = seasonParam ? Number.parseInt(seasonParam, 10) : (await getLatestSeason())?.season;
  if (!season) return NextResponse.json({ error: 'No season synced yet' }, { status: 404 });

  const [teams, picks] = await Promise.all([getTeamsForSeason(season), getWeeklyPicks(season, week)]);
  const pickByOwner = new Map(picks.map((p) => [p.owner_id, p.pick_text]));

  return NextResponse.json({
    season,
    week,
    picks: teams.map((t) => ({ teamName: t.team_name, pick: pickByOwner.get(t.owner_id) ?? '' })),
  });
}
