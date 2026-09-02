import { getAllTeams } from '@/lib/db/queries';
import { DUES, DUES_SEASON, ENTRY_FEE, duesTotals } from '@/lib/dues';
import { StatCard } from '@/components/StatCard';
import { OwnerLink } from '@/components/OwnerLink';
import { TeamLogo } from '@/components/TeamLogo';

export const dynamic = 'force-dynamic';

const money = (amount: number) => `$${amount.toLocaleString('en-US')}`;

export default async function DuesPage() {
  // Deliberately no hasAnyData() gate: the dues list is hand-maintained and
  // should still render before a sync has ever run. The team lookup below is
  // only used to decorate rows with a logo and profile link.
  const teams = await getAllTeams().catch(() => []);

  // Latest season wins, so a team that changed hands or was renamed resolves
  // to whoever holds that name most recently.
  const byName = new Map<string, (typeof teams)[number]>();
  for (const team of [...teams].sort((a, b) => a.season - b.season)) {
    byName.set(team.team_name.trim().toLowerCase(), team);
  }

  const totals = duesTotals();
  const rows = [...DUES].sort(
    (a, b) => Number(a.paid) - Number(b.paid) || a.teamName.localeCompare(b.teamName),
  );

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-extrabold">{DUES_SEASON} Entry Fees</h1>
        <p className="text-sm text-muted">
          {money(ENTRY_FEE)} per team. Unpaid owners are listed first.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Collected"
          value={money(totals.collected)}
          sub={`of ${money(totals.expected)}`}
          accent="accent"
        />
        <StatCard
          label="Outstanding"
          value={money(totals.outstanding)}
          sub={`${totals.unpaidCount} still owing`}
          accent="warm"
        />
        <StatCard label="Paid" value={`${totals.paidCount} / ${DUES.length}`} accent="gold" />
        <StatCard label="Entry Fee" value={money(ENTRY_FEE)} sub="per team" />
      </div>

      <div className="card overflow-x-auto">
        <table className="table-clean table-responsive w-full">
          <thead>
            <tr>
              <th>Team</th>
              <th>Manager</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((entry) => {
              const team = byName.get(entry.teamName.trim().toLowerCase());
              return (
                <tr key={entry.teamName}>
                  <td data-label="Team" className="font-medium">
                    <span className="flex items-center justify-end gap-2 sm:justify-start">
                      <TeamLogo
                        logoUrl={team?.logo_url}
                        name={entry.teamName}
                        ownerId={team?.owner_id}
                        size="sm"
                      />
                      <OwnerLink ownerId={team?.owner_id}>{entry.teamName}</OwnerLink>
                    </span>
                  </td>
                  <td data-label="Manager" className="text-muted">{entry.managerName}</td>
                  <td data-label="Status">
                    <span
                      className={
                        entry.paid
                          ? 'pill bg-accent/15 text-accent'
                          : 'pill bg-accent-warm/15 text-accent-warm'
                      }
                    >
                      {entry.paid ? 'Paid' : 'Unpaid'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
