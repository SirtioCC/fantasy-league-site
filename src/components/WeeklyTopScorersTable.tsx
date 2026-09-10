'use client';

import { useState } from 'react';
import { OwnerLink } from './OwnerLink';
import { TeamLogo } from './TeamLogo';
import type { WeeklyPlayerScoreRow } from '@/lib/db/queries';

export interface ScorerTeamIdentity {
  ownerId: string;
  teamName: string;
  logoUrl: string | null;
}

export function WeeklyTopScorersTable({
  weeks,
  defaultWeek,
  scoresByWeek,
  teamsById,
}: {
  weeks: number[];
  defaultWeek: number;
  scoresByWeek: Record<number, WeeklyPlayerScoreRow[]>;
  teamsById: Record<number, ScorerTeamIdentity>;
}) {
  const [week, setWeek] = useState(defaultWeek);
  const rows = scoresByWeek[week] ?? [];

  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center gap-2 text-sm font-medium">
        Week
        <select
          value={week}
          onChange={(e) => setWeek(Number(e.target.value))}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-semibold"
        >
          {weeks.map((w) => (
            <option key={w} value={w}>
              Week {w}
            </option>
          ))}
        </select>
      </label>

      <div className="card overflow-x-auto">
        <table className="table-clean table-responsive w-full">
          <thead>
            <tr>
              <th>#</th>
              <th>Player</th>
              <th>Pos</th>
              <th>NFL Team</th>
              <th>Points</th>
              <th>Owner</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-sm text-muted">
                  No scores synced for Week {week} yet.
                </td>
              </tr>
            ) : (
              rows.map((r, i) => {
                const team = r.team_id !== null ? teamsById[r.team_id] : undefined;
                return (
                  <tr key={r.player_id}>
                    <td data-label="#" className="font-semibold text-muted">{i + 1}</td>
                    <td data-label="Player" className="font-medium">{r.full_name}</td>
                    <td data-label="Pos">{r.position ?? '—'}</td>
                    <td data-label="NFL Team">{r.pro_team ?? '—'}</td>
                    <td data-label="Points" className="font-semibold">{r.points.toFixed(1)}</td>
                    <td data-label="Owner">
                      {team ? (
                        <span className="flex items-center justify-end gap-2 sm:justify-start">
                          <TeamLogo logoUrl={team.logoUrl} name={team.teamName} ownerId={team.ownerId} size="sm" />
                          <OwnerLink ownerId={team.ownerId}>{team.teamName}</OwnerLink>
                        </span>
                      ) : (
                        <span className="text-muted">Free agent</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
