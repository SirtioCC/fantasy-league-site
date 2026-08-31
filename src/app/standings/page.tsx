import Link from 'next/link';
import { hasAnyData } from '@/lib/db';
import { getAllTimeStandings } from '@/lib/analytics/records';
import { getRecordBook } from '@/lib/analytics/records';
import { EmptyState } from '@/components/EmptyState';
import { PointsForBarChart } from '@/components/charts/PointsForBarChart';

export const dynamic = 'force-dynamic';

export default async function StandingsPage() {
  if (!(await hasAnyData())) return <EmptyState />;

  const [standings, recordBook] = await Promise.all([getAllTimeStandings(), getRecordBook()]);

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

      <div className="card overflow-x-auto">
        <table className="table-clean table-responsive w-full">
          <thead>
            <tr>
              <th>#</th>
              <th>Owner</th>
              <th>Record</th>
              <th>Win%</th>
              <th>PF</th>
              <th>PA</th>
              <th className="!text-center">Championships</th>
              <th className="!text-center">Runner Up</th>
              <th className="!text-center">Playoff Appearances</th>
              <th className="!text-center">Last Place Finishes</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s, i) => (
              <tr key={s.ownerId}>
                <td data-label="#" className="font-semibold text-muted">{i + 1}</td>
                <td data-label="Owner" className="font-medium">
                  <Link href={`/teams/${s.ownerId}`} className="hover:text-brand hover:underline">
                    {s.displayName}
                  </Link>
                </td>
                <td data-label="Record">
                  {s.wins}-{s.losses}
                  {s.ties ? `-${s.ties}` : ''}
                </td>
                <td data-label="Win%">{(s.winPct * 100).toFixed(1)}%</td>
                <td data-label="PF">{s.pointsFor.toFixed(1)}</td>
                <td data-label="PA">{s.pointsAgainst.toFixed(1)}</td>
                <td data-label="Championships" className="text-center">{s.championships || ''}</td>
                <td data-label="Runner Up" className="text-center">{s.runnerUps || ''}</td>
                <td data-label="Playoff Appearances" className="text-center">{s.playoffAppearances}</td>
                <td data-label="Last Place Finishes" className="text-center">{s.lastPlaceFinishes || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
              detail={`${recordBook.mostPointsInGame.ownerName} (${recordBook.mostPointsInGame.teamName}) · ${recordBook.mostPointsInGame.season} Week ${recordBook.mostPointsInGame.week}`}
            />
          )}
          {recordBook.fewestPointsInGame && (
            <RecordRow
              label="Fewest points in a game"
              value={recordBook.fewestPointsInGame.points.toFixed(2)}
              detail={`${recordBook.fewestPointsInGame.ownerName} (${recordBook.fewestPointsInGame.teamName}) · ${recordBook.fewestPointsInGame.season} Week ${recordBook.fewestPointsInGame.week}`}
            />
          )}
          {recordBook.biggestBlowout && (
            <RecordRow
              label="Biggest blowout"
              value={`${Math.abs(recordBook.biggestBlowout.points - (recordBook.biggestBlowout.opponentPoints ?? 0)).toFixed(2)} pts`}
              detail={`${recordBook.biggestBlowout.ownerName} ${recordBook.biggestBlowout.points.toFixed(1)} — ${recordBook.biggestBlowout.opponentPoints?.toFixed(1)} ${recordBook.biggestBlowout.opponentOwnerName} · ${recordBook.biggestBlowout.season} Week ${recordBook.biggestBlowout.week}`}
            />
          )}
          {recordBook.closestGame && (
            <RecordRow
              label="Closest game"
              value={`${Math.abs(recordBook.closestGame.points - (recordBook.closestGame.opponentPoints ?? 0)).toFixed(2)} pts`}
              detail={`${recordBook.closestGame.ownerName} ${recordBook.closestGame.points.toFixed(1)} — ${recordBook.closestGame.opponentPoints?.toFixed(1)} ${recordBook.closestGame.opponentOwnerName} · ${recordBook.closestGame.season} Week ${recordBook.closestGame.week}`}
            />
          )}
          {recordBook.longestWinStreak && (
            <RecordRow
              label="Longest win streak"
              value={`${recordBook.longestWinStreak.length} games`}
              detail={`${recordBook.longestWinStreak.ownerName} · ${recordBook.longestWinStreak.startSeason}–${recordBook.longestWinStreak.endSeason}`}
            />
          )}
          {recordBook.longestLossStreak && (
            <RecordRow
              label="Longest losing streak"
              value={`${recordBook.longestLossStreak.length} games`}
              detail={`${recordBook.longestLossStreak.ownerName} · ${recordBook.longestLossStreak.startSeason}–${recordBook.longestLossStreak.endSeason}`}
            />
          )}
        </div>
      </section>
    </div>
  );
}

function RecordRow({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="flex flex-col justify-between gap-1 p-4 sm:flex-row sm:items-center">
      <span className="font-medium">{label}</span>
      <span className="text-muted">
        <span className="font-bold text-brand">{value}</span> — {detail}
      </span>
    </div>
  );
}
