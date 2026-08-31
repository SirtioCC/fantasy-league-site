import { isEspnConfigured } from '@/lib/env';
import { SyncButton } from './SyncButton';

export function EmptyState({ title = 'No data yet' }: { title?: string }) {
  const configured = isEspnConfigured();

  return (
    <div className="card mx-auto flex max-w-xl flex-col items-center gap-4 p-10 text-center">
      <span className="text-4xl">🏈</span>
      <h2 className="text-lg font-bold">{title}</h2>
      {configured ? (
        <>
          <p className="text-sm text-muted">
            Your ESPN credentials are configured, but no data has been synced yet. Run a sync to
            pull your league&apos;s history.
          </p>
          <div className="flex flex-col items-center gap-3">
            <SyncButton />
            <code className="rounded bg-surface-muted px-2 py-1 text-xs">npm run sync</code>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted">
          Add <code className="rounded bg-surface-muted px-1">ESPN_S2</code>,{' '}
          <code className="rounded bg-surface-muted px-1">ESPN_SWID</code>, and{' '}
          <code className="rounded bg-surface-muted px-1">LEAGUE_ID</code> to your{' '}
          <code className="rounded bg-surface-muted px-1">.env</code> file, then run{' '}
          <code className="rounded bg-surface-muted px-1">npm run sync</code>. See the README for
          how to find your cookie values.
        </p>
      )}
    </div>
  );
}
