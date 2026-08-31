import { hasAnyData } from '@/lib/db';
import { getOwners } from '@/lib/db/queries';
import { buildHeadToHeadMatrix, getRivalry } from '@/lib/analytics/headToHead';
import { EmptyState } from '@/components/EmptyState';
import { RivalryPicker } from '@/components/RivalryPicker';
import { OwnerLink } from '@/components/OwnerLink';

export const dynamic = 'force-dynamic';

export default async function HeadToHeadPage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  if (!(await hasAnyData())) return <EmptyState />;

  const [owners, matrix, { a, b }] = await Promise.all([getOwners(), buildHeadToHeadMatrix(), searchParams]);
  const rivalry = a && b && a !== b ? await getRivalry(a, b) : null;

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
                    <OwnerLink ownerId={row.ownerId}>{row.ownerName}</OwnerLink>
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
        <h2 className="text-lg font-bold">Rivalry Lookup</h2>
        <RivalryPicker owners={owners} initialA={a} initialB={b} />

        {rivalry && (
          <div className="card flex flex-col gap-4 p-5">
            <div className="flex flex-wrap items-center justify-center gap-3 text-center sm:gap-6">
              <div className="min-w-0">
                <div className="truncate text-base font-extrabold sm:text-xl">
                  <OwnerLink ownerId={rivalry.ownerAId}>{rivalry.ownerAName}</OwnerLink>
                </div>
                <div className="text-2xl font-extrabold text-brand sm:text-3xl">{rivalry.ownerAWins}</div>
              </div>
              <div className="text-muted">vs</div>
              <div className="min-w-0">
                <div className="truncate text-base font-extrabold sm:text-xl">
                  <OwnerLink ownerId={rivalry.ownerBId}>{rivalry.ownerBName}</OwnerLink>
                </div>
                <div className="text-2xl font-extrabold text-brand sm:text-3xl">{rivalry.ownerBWins}</div>
              </div>
              {rivalry.ties > 0 && (
                <div className="w-full text-sm text-muted">({rivalry.ties} ties)</div>
              )}
            </div>

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
        )}
      </section>
    </div>
  );
}
