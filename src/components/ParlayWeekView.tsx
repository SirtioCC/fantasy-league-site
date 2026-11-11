'use client';

import { useState, useTransition } from 'react';
import { OwnerLink } from './OwnerLink';
import { TeamLogo } from './TeamLogo';
import { savePick, saveResult } from '@/app/parlay/actions';

export interface ParlayTeam {
  ownerId: string;
  teamName: string;
  logoUrl: string | null;
}

export interface ParlayRecord {
  /** Season-to-date legs won/lost through the viewed week. */
  wins: number;
  losses: number;
  /** Legs won/lost in the viewed week alone (what the inputs edit). */
  weekWins: number;
  weekLosses: number;
}

export interface LowScorer extends ParlayTeam {
  /** Why they're on the hook — e.g. "80.2 pts" or "Last place, 2025 season". */
  detail: string;
}

export function ParlayWeekView({
  season,
  weeks,
  defaultWeek,
  teams,
  onTheHookByWeek,
  picksByWeek,
  recordsByWeek,
}: {
  season: number;
  weeks: number[];
  defaultWeek: number;
  teams: ParlayTeam[];
  onTheHookByWeek: Record<number, LowScorer[]>;
  picksByWeek: Record<number, Record<string, string>>;
  recordsByWeek: Record<number, Record<string, ParlayRecord>>;
}) {
  const [week, setWeek] = useState(defaultWeek);
  const lowest = onTheHookByWeek[week] ?? [];
  const records = recordsByWeek[week];

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
                  <span className="text-xs text-muted">{l.detail}</span>
                </span>
              ))}
            </div>
            <p className="text-xs text-muted">Owes the $10 parlay this week.</p>
          </>
        )}
      </div>

      <div key={week} className="card overflow-x-auto">
        <table className="table-clean table-responsive w-full">
          <thead>
            <tr>
              <th>Owner</th>
              <th>Pick</th>
              {records && <th>Legs W / L</th>}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {teams.map((t) => (
              <PickRow
                key={t.ownerId}
                season={season}
                week={week}
                team={t}
                initialText={picksByWeek[week]?.[t.ownerId] ?? ''}
                record={records?.[t.ownerId]}
              />
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
  record,
}: {
  season: number;
  week: number;
  team: ParlayTeam;
  initialText: string;
  record?: ParlayRecord;
}) {
  const [text, setText] = useState(initialText);
  const [weekWins, setWeekWins] = useState(record?.weekWins ?? 0);
  const [weekLosses, setWeekLosses] = useState(record?.weekLosses ?? 0);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <tr>
      <td data-label="Owner" className="font-medium">
        <span className="flex items-center justify-end gap-2 sm:justify-start">
          <TeamLogo logoUrl={team.logoUrl} name={team.teamName} ownerId={team.ownerId} size="sm" />
          <OwnerLink ownerId={team.ownerId}>{team.teamName}</OwnerLink>
          {record && (
            <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-semibold tabular-nums text-muted">
              {record.wins}-{record.losses}
            </span>
          )}
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
      {record && (
        <td data-label="Legs W / L">
          <span className="flex items-center justify-end gap-1 sm:justify-start">
            <LegInput
              label="Legs won"
              value={weekWins}
              onChange={(v) => {
                setWeekWins(v);
                setSaved(false);
              }}
            />
            <span className="text-muted">/</span>
            <LegInput
              label="Legs lost"
              value={weekLosses}
              onChange={(v) => {
                setWeekLosses(v);
                setSaved(false);
              }}
            />
          </span>
        </td>
      )}
      <td data-label="">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await savePick(season, week, team.ownerId, text);
              if (record) await saveResult(season, week, team.ownerId, weekWins, weekLosses);
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

function LegInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      inputMode="numeric"
      min={0}
      max={10}
      aria-label={label}
      value={value}
      onChange={(e) => onChange(Math.max(0, Math.min(10, Number(e.target.value) || 0)))}
      className="w-12 rounded-lg border border-border bg-surface px-2 py-1.5 text-center text-sm"
    />
  );
}
