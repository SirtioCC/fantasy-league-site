import { hasAnyData } from '@/lib/db';
import { getLatestTeamByOwner, getOwners } from '@/lib/db/queries';
import { buildHeadToHeadMatrix, getRivalry } from '@/lib/analytics/headToHead';
import { compareOwners } from '@/lib/analytics/compare';
import type { SeasonPerformance } from '@/lib/analytics/bestWorst';
import type { LeagueAward } from '@/lib/analytics/awards';
import { EmptyState } from '@/components/EmptyState';
import { OwnerPairPicker } from '@/components/OwnerPairPicker';
import { TeamLogo } from '@/components/TeamLogo';
import { OwnerLink } from '@/components/OwnerLink';

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

export default async function HeadToHeadPage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  if (!(await hasAnyData())) return <EmptyState />;

  const [owners, matrix, latestTeams, { a, b }] = await Promise.all([
    getOwners(),
    buildHeadToHeadMatrix(),
    getLatestTeamByOwner(),
    searchParams,
  ]);

  const pairPicked = Boolean(a && b && a !== b);
  // The matchup card blends both views: how the two have done against each
  // other (rivalry) and how their whole careers stack up (comparison).
  const [rivalry, comparison] = pairPicked
    ? await Promise.all([getRivalry(a!, b!), compareOwners(a!, b!)])
    : [null, null];

  const ownerA = comparison?.ownerA ?? null;
  const ownerB = comparison?.ownerB ?? null;

  const rows: StatRow[] =
    ownerA && ownerB
      ? [
          { label: 'Seasons Played', a: String(ownerA.seasonsPlayed), b: String(ownerB.seasonsPlayed), winner: null },
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
          { label: 'Points For', a: ownerA.pointsFor.toFixed(1), b: ownerB.pointsFor.toFixed(1), winner: null },
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
        <h1 className="text-2xl font-extrabold">Head-to-Head</h1>
        <p className="text-sm text-muted">All-time regular season + playoff results between every pair of owners.</p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="card overflow-x-auto">
          <table className="table-clean w-full">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-surface">Owner ↓ vs →</th>
                {owners.map((o) => (
                  <th key={o.owner_id}>
                    <OwnerLink ownerId={o.owner_id}>{o.display_name}</OwnerLink>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.map((row) => (
                <tr key={row.ownerId}>
                  <td className="sticky left-0 z-10 bg-surface font-medium">
                    <span className="flex items-center gap-2">
                      <TeamLogo
                        logoUrl={latestTeams.get(row.ownerId)?.logo_url}
                        name={latestTeams.get(row.ownerId)?.team_name ?? row.ownerName}
                        ownerId={row.ownerId}
                        size="sm"
                      />
                      <OwnerLink ownerId={row.ownerId}>{row.ownerName}</OwnerLink>
                    </span>
                  </td>
                  {owners.map((o) => {
                    if (o.owner_id === row.ownerId) {
                      return (
                        <td key={o.owner_id} className="text-center text-muted">
                          —
                        </td>
                      );
                    }
                    const cell = row.vs.get(o.owner_id);
                    return (
                      <td key={o.owner_id} className="text-center">
                        {cell ? `${cell.wins}-${cell.losses}${cell.ties ? `-${cell.ties}` : ''}` : '0-0'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted sm:hidden">Swipe the table left to see every owner →</p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">Compare Two Owners</h2>
        <p className="text-sm text-muted">
          Their record against each other, their careers side by side, and every game they&apos;ve played.
        </p>
        <OwnerPairPicker
          owners={owners}
          initialA={a}
          initialB={b}
          basePath="/head-to-head"
          buttonLabel="Compare"
        />

        {a && b && a === b && <p className="text-sm text-muted">Pick two different owners to compare.</p>}

        {rivalry && ownerA && ownerB && (
          <div className="card flex flex-col gap-6 p-5">
            <div className="flex flex-wrap items-center justify-center gap-4 text-center sm:gap-8">
              <div className="flex min-w-0 flex-col items-center gap-2">
                <TeamLogo
                  logoUrl={latestTeams.get(rivalry.ownerAId)?.logo_url}
                  name={latestTeams.get(rivalry.ownerAId)?.team_name ?? rivalry.ownerAName}
                  ownerId={rivalry.ownerAId}
                  size="lg"
                />
                <div className="truncate text-base font-extrabold sm:text-xl">
                  <OwnerLink ownerId={rivalry.ownerAId}>{rivalry.ownerAName}</OwnerLink>
                </div>
                <div className="text-2xl font-extrabold text-brand sm:text-3xl">{rivalry.ownerAWins}</div>
              </div>
              <div className="text-sm font-bold text-muted">VS</div>
              <div className="flex min-w-0 flex-col items-center gap-2">
                <TeamLogo
                  logoUrl={latestTeams.get(rivalry.ownerBId)?.logo_url}
                  name={latestTeams.get(rivalry.ownerBId)?.team_name ?? rivalry.ownerBName}
                  ownerId={rivalry.ownerBId}
                  size="lg"
                />
                <div className="truncate text-base font-extrabold sm:text-xl">
                  <OwnerLink ownerId={rivalry.ownerBId}>{rivalry.ownerBName}</OwnerLink>
                </div>
                <div className="text-2xl font-extrabold text-brand sm:text-3xl">{rivalry.ownerBWins}</div>
              </div>
              {rivalry.ties > 0 && <div className="w-full text-sm text-muted">({rivalry.ties} ties)</div>}
            </div>

            <div>
              <h3 className="mb-2 text-sm font-bold">Career Comparison</h3>
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
            </div>

            {(comparison?.bestSeasonA || comparison?.bestSeasonB) && (
              <div>
                <h3 className="mb-2 text-sm font-bold">Best Season</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <BestSeasonCard season={comparison?.bestSeasonA ?? null} />
                  <BestSeasonCard season={comparison?.bestSeasonB ?? null} />
                </div>
              </div>
            )}

            {((comparison?.awardsA?.length ?? 0) > 0 || (comparison?.awardsB?.length ?? 0) > 0) && (
              <div>
                <h3 className="mb-2 text-sm font-bold">Awards</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <AwardsList awards={comparison?.awardsA ?? []} />
                  <AwardsList awards={comparison?.awardsB ?? []} />
                </div>
              </div>
            )}

            <div>
              <h3 className="mb-2 text-sm font-bold">Every Meeting</h3>
              <div className="overflow-x-auto">
                <table className="table-clean table-responsive w-full">
                  <thead>
                    <tr>
                      <th>Season</th>
                      <th>Week</th>
                      <th>{rivalry.ownerAName}</th>
                      <th>{rivalry.ownerBName}</th>
                      <th>Winner</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rivalry.games.map((g, i) => (
                      <tr key={i}>
                        <td data-label="Season">{g.season}</td>
                        <td data-label="Week">
                          {g.week}
                          {g.isPlayoff ? ' (P)' : ''}
                        </td>
                        <td
                          data-label={rivalry.ownerAName}
                          className={g.winnerOwnerId === rivalry.ownerAId ? 'font-bold' : ''}
                        >
                          {g.ownerAPoints.toFixed(1)}
                        </td>
                        <td
                          data-label={rivalry.ownerBName}
                          className={g.winnerOwnerId === rivalry.ownerBId ? 'font-bold' : ''}
                        >
                          {g.ownerBPoints.toFixed(1)}
                        </td>
                        <td data-label="Winner" className="text-muted">
                          {g.winnerOwnerId === rivalry.ownerAId
                            ? rivalry.ownerAName
                            : g.winnerOwnerId === rivalry.ownerBId
                              ? rivalry.ownerBName
                              : 'Tie'}
                        </td>
                      </tr>
                    ))}
                    {rivalry.games.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center text-muted">
                          These two owners haven&apos;t played each other yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </section>
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
