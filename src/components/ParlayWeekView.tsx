'use client';

import { useState, useTransition } from 'react';
import { OwnerLink } from './OwnerLink';
import { TeamLogo } from './TeamLogo';
import { savePick } from '@/app/parlay/actions';

export interface ParlayTeam {
  ownerId: string;
  teamName: string;
  logoUrl: string | null;
}

export interface LowScorer extends ParlayTeam {
  score: number;
}

export function ParlayWeekView({
  season,
  weeks,
  defaultWeek,
  teams,
  lowestByWeek,
  picksByWeek,
}: {
  season: number;
  weeks: number[];
  defaultWeek: number;
  teams: ParlayTeam[];
  lowestByWeek: Record<number, LowScorer[]>;
  picksByWeek: Record<number, Record<string, string>>;
}) {
  const [week, setWeek] = useState(defaultWeek);
  const lowest = lowestByWeek[week] ?? [];

  return (
    <div className="flex flex-col gap-4">
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

      <div className="card flex flex-col gap-3 p-5">
        {lowest.length === 0 ? (
          <p className="text-sm text-muted">
            Scores for Week {week} aren&apos;t final yet — no one&apos;s on the hook until the week wraps.
          </p>
        ) : (
          <>
            <h2 className="text-xs font-bold uppercase tracking-wide text-muted">
              {lowest.length > 1 ? 'On the hook this week (tied for lowest)' : 'On the hook this week'}
            </h2>
            <div className="flex flex-wrap gap-3">
              {lowest.map((l) => (
                <span key={l.ownerId} className="flex items-center gap-2 rounded-full bg-warm/15 px-3 py-1.5">
                  <TeamLogo logoUrl={l.logoUrl} name={l.teamName} ownerId={l.ownerId} size="sm" />
                  <span className="font-semibold">
                    <OwnerLink ownerId={l.ownerId}>{l.teamName}</OwnerLink>
                  </span>
                  <span className="text-xs text-muted">{l.score.toFixed(1)} pts</span>
                </span>
              ))}
            </div>
            <p className="text-xs text-muted">Owes the $5 parlay this week.</p>
          </>
        )}
      </div>

      <div key={week} className="card overflow-x-auto">
        <table className="table-clean table-responsive w-full">
          <thead>
            <tr>
              <th>Owner</th>
              <th>Pick</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {teams.map((t) => (
              <PickRow key={t.ownerId} season={season} week={week} team={t} initialText={picksByWeek[week]?.[t.ownerId] ?? ''} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PickRow({
  season,
  week,
  team,
  initialText,
}: {
  season: number;
  week: number;
  team: ParlayTeam;
  initialText: string;
}) {
  const [text, setText] = useState(initialText);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <tr>
      <td data-label="Owner" className="font-medium">
        <span className="flex items-center justify-end gap-2 sm:justify-start">
          <TeamLogo logoUrl={team.logoUrl} name={team.teamName} ownerId={team.ownerId} size="sm" />
          <OwnerLink ownerId={team.ownerId}>{team.teamName}</OwnerLink>
        </span>
      </td>
      <td data-label="Pick">
        <input
          type="text"
          value={text}
          maxLength={280}
          onChange={(e) => {
            setText(e.target.value);
            setSaved(false);
          }}
          placeholder="e.g. Mahomes o250.5 yds, Bills -3.5, Eagles/Cowboys o47.5"
          className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
        />
      </td>
      <td data-label="">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await savePick(season, week, team.ownerId, text);
              setSaved(true);
            })
          }
          className="rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
        >
          {pending ? 'Saving…' : saved ? 'Saved ✓' : 'Save'}
        </button>
      </td>
    </tr>
  );
}
