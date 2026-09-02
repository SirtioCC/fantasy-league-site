'use client';

import { useState } from 'react';
import { OwnerLink } from './OwnerLink';
import { TeamLogo } from './TeamLogo';
import {
  ROUND_ROBIN_WEEKS,
  SCHEDULE,
  SCHEDULE_TEAMS,
  gamesForTeam,
  meetingCount,
  type ScheduleTeam,
} from '@/lib/schedule';

/** Owner id + logo for a team name, resolved server-side from synced ESPN
 * data. Missing entries just render the initials avatar. */
export type ScheduleIdentity = Record<string, { ownerId: string | null; logoUrl: string | null }>;

const byId = new Map<string, ScheduleTeam>(SCHEDULE_TEAMS.map((t) => [t.id, t]));

export function ScheduleView({ identity }: { identity: ScheduleIdentity }) {
  const [teamId, setTeamId] = useState('');
  const selected = teamId ? byId.get(teamId) : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="card flex flex-wrap items-end gap-3 p-4">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Show schedule for
          <select
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-semibold"
          >
            <option value="">Every team</option>
            {SCHEDULE_TEAMS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.teamName} — {t.manager}
              </option>
            ))}
          </select>
        </label>
        {selected && (
          <button
            type="button"
            onClick={() => setTeamId('')}
            className="rounded-full border border-border px-3 py-1.5 text-sm font-semibold text-muted hover:text-foreground"
          >
            Clear
          </button>
        )}
      </div>

      {selected ? <TeamSchedule team={selected} identity={identity} /> : <AllWeeks identity={identity} />}
    </div>
  );
}

function TeamRow({
  team,
  identity,
  size = 'sm',
}: {
  team: ScheduleTeam;
  identity: ScheduleIdentity;
  size?: 'sm' | 'md';
}) {
  const id = identity[team.teamName];
  return (
    <span className="flex min-w-0 items-center gap-2">
      <TeamLogo logoUrl={id?.logoUrl} name={team.teamName} ownerId={id?.ownerId} size={size} />
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-medium">
          <OwnerLink ownerId={id?.ownerId}>{team.teamName}</OwnerLink>
        </span>
        <span className="truncate text-xs text-muted">{team.manager}</span>
      </span>
    </span>
  );
}

function TeamSchedule({ team, identity }: { team: ScheduleTeam; identity: ScheduleIdentity }) {
  const games = gamesForTeam(team.id);
  const rematchOpponents = games.filter((g) => g.isRematch).map((g) => byId.get(g.opponentId)!);

  return (
    <div className="flex flex-col gap-4">
      <div className="card flex flex-col gap-2 p-5">
        <TeamRow team={team} identity={identity} size="md" />
        <p className="text-sm text-muted">
          13 games · plays {rematchOpponents.length} opponents twice
          {rematchOpponents.length > 0 && (
            <> — {rematchOpponents.map((o) => o.teamName).join(' and ')}</>
          )}
        </p>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-clean table-responsive w-full">
          <thead>
            <tr>
              <th>Week</th>
              <th>Opponent</th>
              <th>Meeting</th>
            </tr>
          </thead>
          <tbody>
            {games.map((g) => {
              const opp = byId.get(g.opponentId)!;
              const twice = meetingCount(team.id, g.opponentId) === 2;
              return (
                <tr key={g.week}>
                  <td data-label="Week" className="font-semibold text-muted">Week {g.week}</td>
                  <td data-label="Opponent">
                    <span className="flex justify-end sm:justify-start">
                      <TeamRow team={opp} identity={identity} />
                    </span>
                  </td>
                  <td data-label="Meeting">
                    <span className={g.isRematch ? 'pill bg-accent/15 text-accent' : 'text-muted'}>
                      {g.isRematch ? '2nd meeting' : twice ? '1st of 2' : 'Only meeting'}
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

function AllWeeks({ identity }: { identity: ScheduleIdentity }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {SCHEDULE.map((week, i) => {
        const weekNo = i + 1;
        const isRematchWeek = weekNo > ROUND_ROBIN_WEEKS;
        return (
          <section key={weekNo} className="card flex flex-col gap-3 p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Week {weekNo}</h2>
              {isRematchWeek && <span className="pill bg-accent/15 text-accent">Rematch week</span>}
            </div>
            <ul className="flex flex-col divide-y divide-border">
              {week.map(([a, b]) => (
                <li key={`${a}-${b}`} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-2">
                  <TeamRow team={byId.get(a)!} identity={identity} />
                  <span className="text-xs font-semibold uppercase text-muted">vs</span>
                  <span className="flex justify-end">
                    <TeamRow team={byId.get(b)!} identity={identity} />
                  </span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
