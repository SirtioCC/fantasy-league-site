'use client';

import { useRouter } from 'next/navigation';

export function SeasonPicker({
  seasons,
  selected,
  basePath,
}: {
  seasons: number[];
  selected: number;
  basePath: string;
}) {
  const router = useRouter();

  return (
    <label className="flex items-center gap-2 text-sm font-medium">
      Season
      <select
        value={selected}
        onChange={(e) => router.push(`${basePath}?season=${e.target.value}`)}
        className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-semibold"
      >
        {seasons.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </label>
  );
}
