'use client';

import { useState } from 'react';
import { OwnerLink } from './OwnerLink';
import { MobileSortControl } from './MobileSortControl';
import { TeamLogo } from './TeamLogo';
import type { PowerRankingRow } from '@/lib/analytics/powerRankings';

type SortKey = 'teamName' | 'ownerName' | 'powerScore' | 'winPct' | 'avgPoints' | 'scheduleStrength';

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'teamName', label: 'Team' },
  { key: 'ownerName', label: 'Owner' },
  { key: 'powerScore', label: 'Power Score' },
  { key: 'winPct', label: 'Record' },
  { key: 'avgPoints', label: 'Avg Pts' },
  { key: 'scheduleStrength', label: 'Sched. Strength' },
];

/** Sortable Power Rankings table — click any column header to sort by it,
 * click again to flip direction. "#" always reflects the row's position
 * in whatever order is currently shown. */
export function PowerRankingsTable({
  rankings,
  logos = {},
}: {
  rankings: PowerRankingRow[];
  /** Owner id -> that season's team logo, for the avatar column. */
  logos?: Record<string, string | null>;
}) {
  const [sortKey, setSortKey] = useState<SortKey>('powerScore');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  const sorted = [...rankings].sort((a, b) => {
    const cmp =
      sortKey === 'teamName' || sortKey === 'ownerName'
        ? a[sortKey].localeCompare(b[sortKey])
        : a[sortKey] - b[sortKey];
    return sortDir === 'asc' ? cmp : -cmp;
  });

  return (
    <div className="card overflow-x-auto">
      <MobileSortControl
        columns={COLUMNS}
        sortKey={sortKey}
        sortDir={sortDir}
        onSortKeyChange={handleSort}
        onToggleDir={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
      />
      <table className="table-clean table-responsive w-full">
        <thead>
          <tr>
            <th>#</th>
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                onClick={() => handleSort(col.key)}
                className="cursor-pointer select-none hover:text-foreground"
              >
                {col.label}
                <span className="ml-1 inline-block w-2.5 text-brand">
                  {sortKey === col.key ? (sortDir === 'desc' ? '▼' : '▲') : ''}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => (
            <tr key={r.teamId}>
              <td data-label="#" className="font-semibold text-muted">{i + 1}</td>
              <td data-label="Team" className="font-medium">
                <span className="flex items-center justify-end gap-2 sm:justify-start">
                  <TeamLogo logoUrl={logos[r.ownerId]} name={r.teamName} ownerId={r.ownerId} size="sm" />
                  <OwnerLink ownerId={r.ownerId}>{r.teamName}</OwnerLink>
                </span>
              </td>
              <td data-label="Owner" className="text-muted">
                <OwnerLink ownerId={r.ownerId}>{r.ownerName}</OwnerLink>
              </td>
              <td data-label="Power Score" className="font-bold text-brand">{r.powerScore.toFixed(1)}</td>
              <td data-label="Record">{r.record}</td>
              <td data-label="Avg Pts">{r.avgPoints.toFixed(1)}</td>
              <td data-label="Sched. Strength">{r.scheduleStrength.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
