import { getAllTeams } from '@/lib/db/queries';
import { SCHEDULE_SEASON, SCHEDULE_TEAMS } from '@/lib/schedule';
import { ScheduleView, type ScheduleIdentity } from '@/components/ScheduleView';
import { StatCard } from '@/components/StatCard';

export const dynamic = 'force-dynamic';

export default async function SchedulePage() {
  // The schedule stands on its own data, so this page renders before a sync
  // has ever run — the lookup only decorates teams with a logo and profile
  // link, matched on team name against the most recent season that has one.
  const teams = await getAllTeams().catch(() => []);

  const identity: ScheduleIdentity = {};
  for (const team of [...teams].sort((a, b) => a.season - b.season)) {
    identity[team.team_name.trim()] = { ownerId: team.owner_id, logoUrl: team.logo_url };
  }
  // Keep only the names this schedule actually uses, matched case-insensitively.
  const lower = new Map(Object.entries(identity).map(([name, v]) => [name.toLowerCase(), v]));
  const resolved: ScheduleIdentity = {};
  for (const t of SCHEDULE_TEAMS) {
    const hit = lower.get(t.teamName.trim().toLowerCase());
    if (hit) resolved[t.teamName] = hit;
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-extrabold">{SCHEDULE_SEASON} Schedule</h1>
        <p className="max-w-2xl text-sm text-muted">
          Every manager plays every other manager at least once, and nobody plays the same opponent
          more than twice — so no one draws an easier or harder slate by accident. Pick your team to
          see just your matchups.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Weeks" value="13" sub="6 games each" />
        <StatCard label="Play Once" value="54" sub="pairings" accent="accent" />
        <StatCard label="Play Twice" value="12" sub="pairings" accent="gold" />
        <StatCard label="Play 3×" value="0" sub="never" accent="warm" />
      </div>

      <p className="text-sm text-muted">
        Weeks 1–11 are a complete round robin, so every pairing happens exactly once. Weeks 12–13 are
        the only rematches, which is why each manager ends up facing nine opponents once and exactly
        two twice.
      </p>

      <ScheduleView identity={resolved} />
    </div>
  );
}
