'use client';

import { useMemo, useState } from 'react';
import type { OwnerDraftPick } from '@/lib/analytics/ownerProfile';

/** Draft history grouped by season with a season picker, instead of one
 * long table with every pick from every year stacked in a scroll box. */
export function DraftHistoryTable({ picks }: { picks: OwnerDraftPick[] }) {
  const seasons = useMemo(() => Array.from(new Set(picks.map((p) => p.season))), [picks]);
  const [season, setSeason] = useState(seasons[0]);

  const rows = picks.filter((p) => p.season === season);

  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center gap-2 text-sm font-medium">
        Season
        <select
          value={season}
          onChange={(e) => setSeason(Number(e.target.value))}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-semibold"
        >
          {seasons.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>

      <div className="card overflow-x-auto">
        <table className="table-clean table-responsive w-full">
          <thead>
            <tr>
              <th>Pick</th>
              <th>Player</th>
              <th>Pos</th>
              <th>NFL Team</th>
              <th>Keeper</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d, i) => (
              <tr key={i}>
                <td data-label="Pick">#{d.overallPick}</td>
                <td data-label="Player" className="font-medium">{d.playerName}</td>
                <td data-label="Pos">{d.position ?? '—'}</td>
                <td data-label="NFL Team">{d.proTeam ?? '—'}</td>
                <td data-label="Keeper">{d.keeper ? 'Yes' : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
