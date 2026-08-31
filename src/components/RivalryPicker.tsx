'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function RivalryPicker({
  owners,
  initialA,
  initialB,
}: {
  owners: { owner_id: string; display_name: string }[];
  initialA?: string;
  initialB?: string;
}) {
  const router = useRouter();
  const [a, setA] = useState(initialA ?? owners[0]?.owner_id ?? '');
  const [b, setB] = useState(initialB ?? owners[1]?.owner_id ?? '');

  return (
    <div className="card flex flex-wrap items-end gap-3 p-4">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Owner A
        <select
          value={a}
          onChange={(e) => setA(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-semibold"
        >
          {owners.map((o) => (
            <option key={o.owner_id} value={o.owner_id}>
              {o.display_name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Owner B
        <select
          value={b}
          onChange={(e) => setB(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-semibold"
        >
          {owners.map((o) => (
            <option key={o.owner_id} value={o.owner_id}>
              {o.display_name}
            </option>
          ))}
        </select>
      </label>
      <button
        onClick={() => router.push(`/head-to-head?a=${a}&b=${b}`)}
        disabled={a === b}
        className="rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        View rivalry
      </button>
    </div>
  );
}
