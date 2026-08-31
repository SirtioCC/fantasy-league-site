import Link from 'next/link';
import { hasAnyData } from '@/lib/db';
import { getLatestSeason } from '@/lib/db/queries';
import { buildSeasonPerformances } from '@/lib/analytics/bestWorst';
import { computePowerRankings } from '@/lib/analytics/powerRankings';
import { getRecordBook } from '@/lib/analytics/records';
import { EmptyState } from '@/components/EmptyState';
import { StatCard } from '@/components/StatCard';
import { LEAGUE_NAME, LEAGUE_TAGLINE } from '@/lib/branding';
import { OwnerLink } from '@/components/OwnerLink';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  if (!(await hasAnyData())) {
    return (
      <div className="flex flex-col gap-6">
        <Hero />
        <EmptyState />
      </div>
    );
  }

  const latestSeason = (await getLatestSeason())!;
  const allStandings = await buildSeasonPerformances();
  const standings = allStandings
    .filter((s) => s.season === latestSeason.season)
    .sort((a, b) => {
      if (a.finalRank !== null || b.finalRank !== null) return (a.finalRank ?? 999) - (b.finalRank ?? 999);
      const wpA = a.wins + a.losses + a.ties > 0 ? (a.wins + a.ties * 0.5) / (a.wins + a.losses + a.ties) : 0;
      const wpB = b.wins + b.losses + b.ties > 0 ? (b.wins + b.ties * 0.5) / (b.wins + b.losses + b.ties) : 0;
      return wpB - wpA || b.pointsFor - a.pointsFor;
    });

  const [allPowerRankings, recordBook] = await Promise.all([
    computePowerRankings(latestSeason.season),
    getRecordBook(),
  ]);
  const powerRankings = allPowerRankings.slice(0, 5);

  return (
    <div className="flex flex-col gap-8">
      <Hero />

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{latestSeason.season} Standings</h2>
          <Link href="/standings" className="text-sm font-medium text-brand hover:underline">
            All-time standings →
          </Link>
        </div>
        <div className="card overflow-x-auto">
          <table className="table-clean table-responsive w-full">
            <thead>
              <tr>
                <th>#</th>
                <th>Team</th>
                <th>Owner</th>
                <th>Record</th>
                <th>PF</th>
                <th>PA</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((s, i) => (
                <tr key={s.teamId}>
                  <td data-label="#" className="font-semibold text-muted">{s.finalRank ?? i + 1}</td>
                  <td data-label="Team" className="font-medium">
                    <OwnerLink ownerId={s.ownerId}>{s.teamName}</OwnerLink>
                    {s.isChampion && <span className="ml-1.5">🏆</span>}
                  </td>
                  <td data-label="Owner" className="text-muted">
                    <OwnerLink ownerId={s.ownerId}>{s.ownerName}</OwnerLink>
                  </td>
                  <td data-label="Record">
                    {s.wins}-{s.losses}
                    {s.ties ? `-${s.ties}` : ''}
                  </td>
                  <td data-label="PF">{s.pointsFor.toFixed(1)}</td>
                  <td data-label="PA">{s.pointsAgainst.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Power Rankings Snapshot</h2>
          <Link href="/power-rankings" className="text-sm font-medium text-brand hover:underline">
            Full power rankings →
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {powerRankings.map((r) => (
            <div key={r.teamId} className="card flex flex-col gap-1 p-4">
              <span className="text-xs font-semibold text-muted">#{r.rank}</span>
              <span className="font-bold">
                <OwnerLink ownerId={r.ownerId}>{r.teamName}</OwnerLink>
              </span>
              <span className="text-xs text-muted">
                <OwnerLink ownerId={r.ownerId}>{r.ownerName}</OwnerLink>
              </span>
              <span className="text-xl font-extrabold text-brand">{r.powerScore.toFixed(1)}</span>
              <span className="text-xs text-muted">{r.record}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">League Record Book</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {recordBook.mostPointsInGame && (
            <StatCard
              label="Most Points in a Game"
              value={recordBook.mostPointsInGame.points.toFixed(1)}
              sub={
                <>
                  <OwnerLink ownerId={recordBook.mostPointsInGame.ownerId}>
                    {recordBook.mostPointsInGame.ownerName}
                  </OwnerLink>{' '}
                  · {recordBook.mostPointsInGame.season} Wk {recordBook.mostPointsInGame.week}
                </>
              }
              accent="accent"
            />
          )}
          {recordBook.biggestBlowout && (
            <StatCard
              label="Biggest Blowout"
              value={Math.abs(
                recordBook.biggestBlowout.points - (recordBook.biggestBlowout.opponentPoints ?? 0),
              ).toFixed(1)}
              sub={
                <>
                  <OwnerLink ownerId={recordBook.biggestBlowout.ownerId}>
                    {recordBook.biggestBlowout.ownerName}
                  </OwnerLink>{' '}
                  beat{' '}
                  <OwnerLink ownerId={recordBook.biggestBlowout.opponentOwnerId}>
                    {recordBook.biggestBlowout.opponentOwnerName}
                  </OwnerLink>{' '}
                  · {recordBook.biggestBlowout.season} Wk {recordBook.biggestBlowout.week}
                </>
              }
              accent="warm"
            />
          )}
          {recordBook.closestGame && (
            <StatCard
              label="Closest Game"
              value={Math.abs(
                recordBook.closestGame.points - (recordBook.closestGame.opponentPoints ?? 0),
              ).toFixed(2)}
              sub={
                <>
                  <OwnerLink ownerId={recordBook.closestGame.ownerId}>{recordBook.closestGame.ownerName}</OwnerLink> vs{' '}
                  <OwnerLink ownerId={recordBook.closestGame.opponentOwnerId}>
                    {recordBook.closestGame.opponentOwnerName}
                  </OwnerLink>{' '}
                  · {recordBook.closestGame.season} Wk {recordBook.closestGame.week}
                </>
              }
              accent="gold"
            />
          )}
          {recordBook.longestWinStreak && (
            <StatCard
              label="Longest Win Streak"
              value={`${recordBook.longestWinStreak.length} games`}
              sub={
                <>
                  <OwnerLink ownerId={recordBook.longestWinStreak.ownerId}>
                    {recordBook.longestWinStreak.ownerName}
                  </OwnerLink>{' '}
                  · {recordBook.longestWinStreak.startSeason}–{recordBook.longestWinStreak.endSeason}
                </>
              }
            />
          )}
          {recordBook.fewestPointsInGame && (
            <StatCard
              label="Fewest Points in a Game"
              value={recordBook.fewestPointsInGame.points.toFixed(1)}
              sub={
                <>
                  <OwnerLink ownerId={recordBook.fewestPointsInGame.ownerId}>
                    {recordBook.fewestPointsInGame.ownerName}
                  </OwnerLink>{' '}
                  · {recordBook.fewestPointsInGame.season} Wk {recordBook.fewestPointsInGame.week}
                </>
              }
            />
          )}
          {recordBook.longestLossStreak && (
            <StatCard
              label="Longest Losing Streak"
              value={`${recordBook.longestLossStreak.length} games`}
              sub={
                <>
                  <OwnerLink ownerId={recordBook.longestLossStreak.ownerId}>
                    {recordBook.longestLossStreak.ownerName}
                  </OwnerLink>{' '}
                  · {recordBook.longestLossStreak.startSeason}–{recordBook.longestLossStreak.endSeason}
                </>
              }
            />
          )}
        </div>
      </section>
    </div>
  );
}

function Hero() {
  return (
    <section className="card overflow-hidden bg-gradient-to-br from-brand to-brand-dark p-6 text-white sm:p-8">
      <h1 className="text-2xl font-extrabold sm:text-3xl">{LEAGUE_NAME}</h1>
      <p className="mt-1 text-sm text-white/80 sm:text-base">{LEAGUE_TAGLINE}</p>
    </section>
  );
}
