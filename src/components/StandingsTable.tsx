'use client';

import { useState } from 'react';
import { OwnerLink } from './OwnerLink';
import { MobileSortControl } from './MobileSortControl';
import { TeamLogo } from './TeamLogo';
import type { OwnerAllTimeSummary } from '@/lib/analytics/records';

type SortKey =
  | 'displayName'
  | 'wins'
  | 'winPct'
  | 'pointsFor'
  | 'avgPointsFor'
  | 'pointsAgainst'
  | 'championships'
  | 'runnerUps'
  | 'playoffAppearances'
  | 'lastPlaceFinishes';

const COLUMNS: { key: SortKey; label: string; center?: boolean }[] = [
  { key: 'displayName', label: 'Owner' },
  { key: 'wins', label: 'Record' },
  { key: 'winPct', label: 'Win%' },
  { key: 'pointsFor', label: 'PF' },
  { key: 'avgPointsFor', label: 'PPG' },
  { key: 'pointsAgainst', label: 'PA' },
  { key: 'championships', label: 'Championships', center: true },
  { key: 'runnerUps', label: 'Runner Up', center: true },
  { key: 'playoffAppearances', label: 'Playoff Appearances', center: true },
  { key: 'lastPlaceFinishes', label: 'Last Place Finishes', center: true },
];

/** Sortable all-time standings table — click any column header to sort by
 * it, click again to flip direction. "#" always reflects the row's
 * position in whatever order is currently shown. */
export function StandingsTable({
  standings,
  logos = {},
}: {
  standings: OwnerAllTimeSummary[];
  /** Owner id -> that owner's current team logo, for the avatar column. */
  logos?: Record<string, string | null>;
}) {
  const [sortKey, setSortKey] = useState<SortKey>('winPct');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  const sorted = [...standings].sort((a, b) => {
    const cmp =
      sortKey === 'displayName' ? a.displayName.localeCompare(b.displayName) : a[sortKey] - b[sortKey];
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
                className={`cursor-pointer select-none hover:text-foreground ${col.center ? '!text-center' : ''}`}
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
          {sorted.map((s, i) => (
            <tr key={s.ownerId}>
              <td data-label="#" className="font-semibold text-muted">{i + 1}</td>
              <td data-label="Owner" className="font-medium">
                <span className="flex items-center justify-end gap-2 sm:justify-start">
                  <TeamLogo
                    logoUrl={logos[s.ownerId]}
                    name={s.teamNames[s.teamNames.length - 1] ?? s.displayName}
                    ownerId={s.ownerId}
                    size="sm"
                  />
                  <OwnerLink ownerId={s.ownerId}>{s.displayName}</OwnerLink>
                </span>
              </td>
              <td data-label="Record">
                {s.wins}-{s.losses}
                {s.ties ? `-${s.ties}` : ''}
              </td>
              <td data-label="Win%">{(s.winPct * 100).toFixed(1)}%</td>
              <td data-label="PF">{s.pointsFor.toFixed(1)}</td>
              <td data-label="PPG">{s.avgPointsFor.toFixed(1)}</td>
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
  );
}
