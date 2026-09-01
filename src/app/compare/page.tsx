import Link from 'next/link';
import { hasAnyData } from '@/lib/db';
import { getLatestTeamByOwner, getOwners } from '@/lib/db/queries';
import { compareOwners } from '@/lib/analytics/compare';
import type { SeasonPerformance } from '@/lib/analytics/bestWorst';
import type { LeagueAward } from '@/lib/analytics/awards';
import { EmptyState } from '@/components/EmptyState';
import { OwnerPairPicker } from '@/components/OwnerPairPicker';
import { OwnerLink } from '@/components/OwnerLink';
import { TeamLogo } from '@/components/TeamLogo';

export const dynamic = 'force-dynamic';

type Winner = 'a' | 'b' | 'tie' | null;

interface StatRow {
  label: string;
  a: string;
  b: string;
  winner: Winner;
}

function winnerOf(a: number, b: number, lowerIsBetter = false): Winner {
  if (a === b) return 'tie';
  if (lowerIsBetter) return a < b ? 'a' : 'b';
  return a > b ? 'a' : 'b';
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  if (!(await hasAnyData())) return <EmptyState />;

  const [owners, latestTeams, { a, b }] = await Promise.all([
    getOwners(),
    getLatestTeamByOwner(),
    searchParams,
  ]);
  const comparison = a && b && a !== b ? await compareOwners(a, b) : null;

  const { ownerA, ownerB, bestSeasonA, bestSeasonB, awardsA, awardsB, headToHead } = comparison ?? {};

  const rows: StatRow[] =
    ownerA && ownerB
      ? [
          {
            label: 'Seasons Played',
            a: String(ownerA.seasonsPlayed),
            b: String(ownerB.seasonsPlayed),
            winner: null,
          },
          {
            label: 'Record',
            a: `${ownerA.wins}-${ownerA.losses}${ownerA.ties ? `-${ownerA.ties}` : ''}`,
            b: `${ownerB.wins}-${ownerB.losses}${ownerB.ties ? `-${ownerB.ties}` : ''}`,
            winner: winnerOf(ownerA.winPct, ownerB.winPct),
          },
          {
            label: 'Win%',
            a: `${(ownerA.winPct * 100).toFixed(1)}%`,
            b: `${(ownerB.winPct * 100).toFixed(1)}%`,
            winner: winnerOf(ownerA.winPct, ownerB.winPct),
          },
          {
            label: 'Championships',
            a: String(ownerA.championships),
            b: String(ownerB.championships),
            winner: winnerOf(ownerA.championships, ownerB.championships),
          },
          {
            label: 'Runner-Ups',
            a: String(ownerA.runnerUps),
            b: String(ownerB.runnerUps),
            winner: winnerOf(ownerA.runnerUps, ownerB.runnerUps),
          },
          {
            label: 'Playoffs',
            a: String(ownerA.playoffAppearances),
            b: String(ownerB.playoffAppearances),
            winner: winnerOf(ownerA.playoffAppearances, ownerB.playoffAppearances),
          },
          {
            label: 'Last Place',
            a: String(ownerA.lastPlaceFinishes),
            b: String(ownerB.lastPlaceFinishes),
            winner: winnerOf(ownerA.lastPlaceFinishes, ownerB.lastPlaceFinishes, true),
          },
          {
            label: 'Points For',
            a: ownerA.pointsFor.toFixed(1),
            b: ownerB.pointsFor.toFixed(1),
            winner: null,
          },
          {
            label: 'PPG',
            a: ownerA.avgPointsFor.toFixed(1),
            b: ownerB.avgPointsFor.toFixed(1),
            winner: winnerOf(ownerA.avgPointsFor, ownerB.avgPointsFor),
          },
        ]
      : [];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-extrabold">Manager Comparison</h1>
        <p className="text-sm text-muted">
          Two owners&apos; entire careers, side by side — not just how they&apos;ve done against each
          other.
        </p>
      </div>

      <OwnerPairPicker owners={owners} initialA={a} initialB={b} basePath="/compare" buttonLabel="Compare" />

      {ownerA && ownerB && (
        <div className="card flex flex-col gap-6 p-5">
          <div className="flex flex-wrap items-center justify-center gap-4 text-center sm:gap-8">
            <div className="flex min-w-0 flex-col items-center gap-2">
              <TeamLogo
                logoUrl={latestTeams.get(ownerA.ownerId)?.logo_url}
                name={ownerA.teamNames[ownerA.teamNames.length - 1] ?? ownerA.displayName}
                ownerId={ownerA.ownerId}
                size="lg"
              />
              <div className="truncate text-lg font-extrabold sm:text-xl">
                <OwnerLink ownerId={ownerA.ownerId}>{ownerA.displayName}</OwnerLink>
              </div>
              <div className="truncate text-xs text-muted">{ownerA.teamNames.join(' · ')}</div>
            </div>
            <div className="text-sm font-bold text-muted">VS</div>
            <div className="flex min-w-0 flex-col items-center gap-2">
              <TeamLogo
                logoUrl={latestTeams.get(ownerB.ownerId)?.logo_url}
                name={ownerB.teamNames[ownerB.teamNames.length - 1] ?? ownerB.displayName}
                ownerId={ownerB.ownerId}
                size="lg"
              />
              <div className="truncate text-lg font-extrabold sm:text-xl">
                <OwnerLink ownerId={ownerB.ownerId}>{ownerB.displayName}</OwnerLink>
              </div>
              <div className="truncate text-xs text-muted">{ownerB.teamNames.join(' · ')}</div>
            </div>
          </div>

          {headToHead && headToHead.ownerAWins + headToHead.ownerBWins + headToHead.ties > 0 && (
            <p className="text-center text-sm text-muted">
              All-time series:{' '}
              <span className="font-bold text-foreground">
                {headToHead.ownerAWins}-{headToHead.ownerBWins}
                {headToHead.ties ? `-${headToHead.ties}` : ''}
              </span>{' '}
              ·{' '}
              <Link
                href={`/head-to-head?a=${ownerA.ownerId}&b=${ownerB.ownerId}`}
                className="text-brand hover:underline"
              >
                full game log →
              </Link>
            </p>
          )}

          <div className="overflow-x-auto">
            <table className="table-clean w-full">
              <thead>
                <tr>
                  <th>Stat</th>
                  <th className="text-center">
                    <span className="hidden sm:inline">{ownerA.displayName}</span>
                    <span className="sm:hidden">A</span>
                  </th>
                  <th className="text-center">
                    <span className="hidden sm:inline">{ownerB.displayName}</span>
                    <span className="sm:hidden">B</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.label}>
                    <td className="text-muted">{r.label}</td>
                    <td className={`text-center ${r.winner === 'a' ? 'font-bold text-brand' : ''}`}>{r.a}</td>
                    <td className={`text-center ${r.winner === 'b' ? 'font-bold text-brand' : ''}`}>{r.b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(bestSeasonA || bestSeasonB) && (
            <div>
              <h3 className="mb-2 text-sm font-bold">Best Season</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <BestSeasonCard season={bestSeasonA ?? null} />
                <BestSeasonCard season={bestSeasonB ?? null} />
              </div>
            </div>
          )}

          {((awardsA && awardsA.length > 0) || (awardsB && awardsB.length > 0)) && (
            <div>
              <h3 className="mb-2 text-sm font-bold">Awards</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <AwardsList awards={awardsA ?? []} />
                <AwardsList awards={awardsB ?? []} />
              </div>
            </div>
          )}
        </div>
      )}

      {a && b && a === b && (
        <p className="text-sm text-muted">Pick two different owners to compare.</p>
      )}
    </div>
  );
}

function BestSeasonCard({ season }: { season: SeasonPerformance | null }) {
  if (!season) {
    return <div className="rounded-lg border border-border p-3 text-sm text-muted">No completed seasons.</div>;
  }
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="text-xs text-muted">{season.season}</div>
      <div className="font-semibold">
        {season.wins}-{season.losses}
        {season.ties ? `-${season.ties}` : ''} · {season.pointsFor.toFixed(1)} pts
        {season.isChampion ? ' 🏆' : season.isRunnerUp ? ' 🥈' : ''}
      </div>
    </div>
  );
}

function AwardsList({ awards }: { awards: LeagueAward[] }) {
  if (awards.length === 0) {
    return <div className="rounded-lg border border-border p-3 text-sm text-muted">No all-time awards.</div>;
  }
  return (
    <div className="flex flex-col gap-2">
      {awards.map((award) => (
        <div key={award.label} className="flex items-center gap-2 rounded-lg border border-border p-2 text-sm">
          <span aria-hidden="true">{award.emoji}</span>
          <span className="font-semibold">{award.label}</span>
        </div>
      ))}
    </div>
  );
}
