import { notFound } from 'next/navigation';
import { hasAnyData } from '@/lib/db';
import { getOwnerProfile } from '@/lib/analytics/ownerProfile';
import { StatCard } from '@/components/StatCard';
import { EmptyState } from '@/components/EmptyState';
import { OwnerLink } from '@/components/OwnerLink';
import { CareerTimeline } from '@/components/CareerTimeline';
import { CareerTrendChart } from '@/components/charts/CareerTrendChart';
import { slugToOwnerId } from '@/lib/ownerSlug';

export const dynamic = 'force-dynamic';

export default async function OwnerProfilePage({
  params,
}: {
  params: Promise<{ ownerId: string }>;
}) {
  if (!(await hasAnyData())) return <EmptyState />;

  const { ownerId: ownerIdSlug } = await params;
  const ownerId = slugToOwnerId(ownerIdSlug);
  const profile = await getOwnerProfile(ownerId);
  if (!profile) notFound();

  const { summary } = profile;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-extrabold">{profile.displayName}</h1>
        {summary && (
          <p className="text-sm text-muted">
            {summary.seasonsPlayed} seasons · {summary.teamNames.join(' · ')}
          </p>
        )}
      </div>

      {profile.timeline.length > 0 && (
        <section className="flex flex-col gap-2">
          <CareerTimeline entries={profile.timeline} />
        </section>
      )}

      {profile.awards.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">Awards</h2>
          <div className="flex flex-wrap gap-3">
            {profile.awards.map((a) => (
              <div key={a.label} className="card flex items-center gap-3 p-3">
                <span className="text-2xl" aria-hidden="true">
                  {a.emoji}
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-bold">{a.label}</div>
                  <div className="text-xs text-muted">{a.description}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard
            label="Record"
            value={`${summary.wins}-${summary.losses}${summary.ties ? `-${summary.ties}` : ''}`}
            sub={`${(summary.winPct * 100).toFixed(1)}% win rate`}
          />
          <StatCard label="Championships" value={summary.championships} accent="gold" />
          <StatCard label="Runner-Ups" value={summary.runnerUps} />
          <StatCard label="Playoff Appearances" value={summary.playoffAppearances} accent="accent" />
          <StatCard label="Points For" value={summary.pointsFor.toFixed(0)} sub={`${summary.avgPointsFor.toFixed(1)} / game`} />
          <StatCard label="Last-Place Finishes" value={summary.lastPlaceFinishes} accent="warm" />
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {profile.bestSeason && (
          <div className="card p-4">
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">Best Season</h3>
            <p className="text-lg font-bold">
              {profile.bestSeason.season} — {profile.bestSeason.wins}-{profile.bestSeason.losses}
              {profile.bestSeason.ties ? `-${profile.bestSeason.ties}` : ''}
              {profile.bestSeason.isChampion && ' 🏆'}
            </p>
            <p className="text-sm text-muted">{profile.bestSeason.pointsFor.toFixed(1)} points for</p>
          </div>
        )}
        {profile.worstSeason && (
          <div className="card p-4">
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">Worst Season</h3>
            <p className="text-lg font-bold">
              {profile.worstSeason.season} — {profile.worstSeason.wins}-{profile.worstSeason.losses}
              {profile.worstSeason.ties ? `-${profile.worstSeason.ties}` : ''}
            </p>
            <p className="text-sm text-muted">{profile.worstSeason.pointsFor.toFixed(1)} points for</p>
          </div>
        )}
      </section>

      {profile.careerTrend.length > 1 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">Career Trend</h2>
          <CareerTrendChart points={profile.careerTrend} />
        </section>
      )}

      {(profile.recordsHeld.length > 0 ||
        profile.rivalrySummary.mostPlayed ||
        profile.rivalrySummary.bestRecord ||
        profile.rivalrySummary.worstRecord) && (
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {(profile.rivalrySummary.mostPlayed ||
            profile.rivalrySummary.bestRecord ||
            profile.rivalrySummary.worstRecord) && (
            <div className="card flex flex-col gap-3 p-4">
              <h3 className="text-sm font-bold uppercase tracking-wide text-muted">Rivalries</h3>
              {profile.rivalrySummary.mostPlayed && (
                <RivalryLine
                  label="Most played"
                  ownerId={profile.rivalrySummary.mostPlayed.opponentOwnerId}
                  ownerName={profile.rivalrySummary.mostPlayed.opponentOwnerName}
                  entry={profile.rivalrySummary.mostPlayed}
                />
              )}
              {profile.rivalrySummary.bestRecord && (
                <RivalryLine
                  label="Best record vs."
                  ownerId={profile.rivalrySummary.bestRecord.opponentOwnerId}
                  ownerName={profile.rivalrySummary.bestRecord.opponentOwnerName}
                  entry={profile.rivalrySummary.bestRecord}
                />
              )}
              {profile.rivalrySummary.worstRecord && (
                <RivalryLine
                  label="Worst record vs."
                  ownerId={profile.rivalrySummary.worstRecord.opponentOwnerId}
                  ownerName={profile.rivalrySummary.worstRecord.opponentOwnerName}
                  entry={profile.rivalrySummary.worstRecord}
                />
              )}
            </div>
          )}

          {profile.recordsHeld.length > 0 && (
            <div className="card flex flex-col divide-y divide-border p-0">
              <h3 className="p-4 pb-2 text-sm font-bold uppercase tracking-wide text-muted">Records Held</h3>
              {profile.recordsHeld.map((r) => (
                <div key={r.label} className="flex flex-col gap-0.5 px-4 py-3 text-sm">
                  <span className="font-medium">{r.label}</span>
                  <span className="text-xs text-muted">{r.detail}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">Season by Season</h2>
        <div className="card overflow-x-auto">
          <table className="table-clean table-responsive w-full">
            <thead>
              <tr>
                <th>Season</th>
                <th>Team</th>
                <th>Record</th>
                <th>PF</th>
                <th>PA</th>
                <th>Final Rank</th>
              </tr>
            </thead>
            <tbody>
              {profile.seasons.map((s) => (
                <tr key={s.season}>
                  <td data-label="Season" className="font-semibold">{s.season}</td>
                  <td data-label="Team">{s.teamName}</td>
                  <td data-label="Record">
                    {s.wins}-{s.losses}
                    {s.ties ? `-${s.ties}` : ''}
                  </td>
                  <td data-label="PF">{s.pointsFor.toFixed(1)}</td>
                  <td data-label="PA">{s.pointsAgainst.toFixed(1)}</td>
                  <td data-label="Final Rank">
                    {s.finalRank ?? '—'}
                    {s.isChampion && ' 🏆'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {profile.favoritePositions.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">Draft Tendencies</h2>
          <div className="card flex flex-wrap gap-2 p-4">
            {profile.favoritePositions.map((p) => (
              <span key={p.position} className="pill bg-surface-muted">
                {p.position} <span className="text-muted">×{p.count}</span>
              </span>
            ))}
          </div>
        </section>
      )}

      {profile.draftHistory.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">Draft History</h2>
          <div className="card max-h-[480px] overflow-y-auto overflow-x-auto">
            <table className="table-clean table-responsive w-full">
              <thead>
                <tr>
                  <th>Season</th>
                  <th>Pick</th>
                  <th>Player</th>
                  <th>Pos</th>
                  <th>NFL Team</th>
                  <th>Keeper</th>
                </tr>
              </thead>
              <tbody>
                {profile.draftHistory.map((d, i) => (
                  <tr key={i}>
                    <td data-label="Season" className="font-semibold">{d.season}</td>
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
        </section>
      )}
    </div>
  );
}

function RivalryLine({
  label,
  ownerId,
  ownerName,
  entry,
}: {
  label: string;
  ownerId: string;
  ownerName: string;
  entry: { wins: number; losses: number; ties: number; games: number };
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-medium">
        <OwnerLink ownerId={ownerId}>{ownerName}</OwnerLink>{' '}
        <span className="text-muted">
          ({entry.wins}-{entry.losses}
          {entry.ties ? `-${entry.ties}` : ''})
        </span>
      </span>
    </div>
  );
}
