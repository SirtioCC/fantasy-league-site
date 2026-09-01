import type { ReactNode } from 'react';
import { hasAnyData } from '@/lib/db';
import { getLatestTeamByOwner } from '@/lib/db/queries';
import { getAllTimeStandings } from '@/lib/analytics/records';
import { getRecordBook } from '@/lib/analytics/records';
import { EmptyState } from '@/components/EmptyState';
import { PointsForBarChart } from '@/components/charts/PointsForBarChart';
import { OwnerLink } from '@/components/OwnerLink';
import { StandingsTable } from '@/components/StandingsTable';

export const dynamic = 'force-dynamic';

export default async function StandingsPage() {
  if (!(await hasAnyData())) return <EmptyState />;

  const [standings, recordBook, latestTeams] = await Promise.all([
    getAllTimeStandings(),
    getRecordBook(),
    getLatestTeamByOwner(),
  ]);

  const logos = Object.fromEntries(
    standings.map((s) => [s.ownerId, latestTeams.get(s.ownerId)?.logo_url ?? null]),
  );

  const pointsForData = [...standings]
    .sort((a, b) => b.pointsFor - a.pointsFor)
    .map((s) => ({ label: s.displayName, value: s.pointsFor }));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-extrabold">All-Time Standings &amp; Records</h1>
        <p className="text-sm text-muted">
          Every owner&apos;s combined record across all synced seasons, grouped by ESPN account so
          team name changes don&apos;t split history.
        </p>
      </div>

      <StandingsTable standings={standings} logos={logos} />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">All-Time Points For</h2>
        <div className="card p-4">
          <PointsForBarChart data={pointsForData} height={Math.max(280, pointsForData.length * 34)} />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">Full Record Book</h2>
        <div className="card divide-y divide-border text-sm">
          {recordBook.mostPointsInGame && (
            <RecordRow
              label="Most points in a game"
              value={recordBook.mostPointsInGame.points.toFixed(2)}
              detail={
                <>
                  <OwnerLink ownerId={recordBook.mostPointsInGame.ownerId}>
                    {recordBook.mostPointsInGame.ownerName}
                  </OwnerLink>{' '}
                  (<OwnerLink ownerId={recordBook.mostPointsInGame.ownerId}>{recordBook.mostPointsInGame.teamName}</OwnerLink>)
                  · {recordBook.mostPointsInGame.season} Week{' '}
                  {recordBook.mostPointsInGame.week}
                </>
              }
            />
          )}
          {recordBook.fewestPointsInGame && (
            <RecordRow
              label="Fewest points in a game"
              value={recordBook.fewestPointsInGame.points.toFixed(2)}
              detail={
                <>
                  <OwnerLink ownerId={recordBook.fewestPointsInGame.ownerId}>
                    {recordBook.fewestPointsInGame.ownerName}
                  </OwnerLink>{' '}
                  (<OwnerLink ownerId={recordBook.fewestPointsInGame.ownerId}>{recordBook.fewestPointsInGame.teamName}</OwnerLink>)
                  · {recordBook.fewestPointsInGame.season} Week{' '}
                  {recordBook.fewestPointsInGame.week}
                </>
              }
            />
          )}
          {recordBook.biggestBlowout && (
            <RecordRow
              label="Biggest blowout"
              value={`${Math.abs(recordBook.biggestBlowout.points - (recordBook.biggestBlowout.opponentPoints ?? 0)).toFixed(2)} pts`}
              detail={
                <>
                  <OwnerLink ownerId={recordBook.biggestBlowout.ownerId}>
                    {recordBook.biggestBlowout.ownerName}
                  </OwnerLink>{' '}
                  {recordBook.biggestBlowout.points.toFixed(1)} — {recordBook.biggestBlowout.opponentPoints?.toFixed(1)}{' '}
                  <OwnerLink ownerId={recordBook.biggestBlowout.opponentOwnerId}>
                    {recordBook.biggestBlowout.opponentOwnerName}
                  </OwnerLink>{' '}
                  · {recordBook.biggestBlowout.season} Week {recordBook.biggestBlowout.week}
                </>
              }
            />
          )}
          {recordBook.closestGame && (
            <RecordRow
              label="Closest game"
              value={`${Math.abs(recordBook.closestGame.points - (recordBook.closestGame.opponentPoints ?? 0)).toFixed(2)} pts`}
              detail={
                <>
                  <OwnerLink ownerId={recordBook.closestGame.ownerId}>{recordBook.closestGame.ownerName}</OwnerLink>{' '}
                  {recordBook.closestGame.points.toFixed(1)} — {recordBook.closestGame.opponentPoints?.toFixed(1)}{' '}
                  <OwnerLink ownerId={recordBook.closestGame.opponentOwnerId}>
                    {recordBook.closestGame.opponentOwnerName}
                  </OwnerLink>{' '}
                  · {recordBook.closestGame.season} Week {recordBook.closestGame.week}
                </>
              }
            />
          )}
          {recordBook.longestWinStreak && (
            <RecordRow
              label="Longest win streak"
              value={`${recordBook.longestWinStreak.length} games`}
              detail={
                <>
                  <OwnerLink ownerId={recordBook.longestWinStreak.ownerId}>
                    {recordBook.longestWinStreak.ownerName}
                  </OwnerLink>{' '}
                  · {recordBook.longestWinStreak.startSeason}–{recordBook.longestWinStreak.endSeason}
                </>
              }
            />
          )}
          {recordBook.longestLossStreak && (
            <RecordRow
              label="Longest losing streak"
              value={`${recordBook.longestLossStreak.length} games`}
              detail={
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

function RecordRow({ label, value, detail }: { label: string; value: string; detail: ReactNode }) {
  return (
    <div className="flex flex-col justify-between gap-1 p-4 sm:flex-row sm:items-center">
      <span className="font-medium">{label}</span>
      <span className="text-muted">
        <span className="font-bold text-brand">{value}</span> — {detail}
      </span>
    </div>
  );
}
