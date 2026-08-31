'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Status = 'idle' | 'loading' | 'success' | 'error';

export function SyncButton() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState<string | null>(null);

  async function handleSync() {
    setStatus('loading');
    setMessage(null);
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Sync failed (${res.status})`);

      const failed = (data.results ?? []).filter((r: { ok: boolean }) => !r.ok);
      const okCount = (data.results ?? []).filter((r: { ok: boolean }) => r.ok).length;
      setMessage(
        failed.length > 0
          ? `Synced ${okCount} season(s), ${failed.length} failed.`
          : `Synced ${okCount} season(s).`,
      );
      setStatus('success');
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Sync failed');
      setStatus('error');
    }
  }

  return (
    <div className="flex items-center gap-2">
      {message && (
        <span
          className={`hidden text-xs sm:inline ${status === 'error' ? 'text-red-500' : 'text-muted'}`}
        >
          {message}
        </span>
      )}
      <button
        onClick={handleSync}
        disabled={status === 'loading'}
        className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        <span className={status === 'loading' ? 'animate-spin' : ''}>⟳</span>
        {status === 'loading' ? 'Syncing…' : 'Refresh data'}
      </button>
    </div>
  );
}
