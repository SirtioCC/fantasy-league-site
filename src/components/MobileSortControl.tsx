'use client';

/** The `.table-responsive` reflow hides <thead> (and its clickable sort
 * headers) below 640px, so a sortable table has no way to change sort on
 * mobile without this: a native <select> + direction toggle standing in
 * for the header clicks, shown only below that same breakpoint. */
export function MobileSortControl<K extends string>({
  columns,
  sortKey,
  sortDir,
  onSortKeyChange,
  onToggleDir,
}: {
  columns: { key: K; label: string }[];
  sortKey: K;
  sortDir: 'asc' | 'desc';
  onSortKeyChange: (key: K) => void;
  onToggleDir: () => void;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-border p-3 text-sm sm:hidden">
      <label htmlFor="mobile-sort-key" className="shrink-0 text-xs font-semibold text-muted">
        Sort by
      </label>
      <select
        id="mobile-sort-key"
        value={sortKey}
        onChange={(e) => onSortKeyChange(e.target.value as K)}
        className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-2 py-1.5"
      >
        {columns.map((col) => (
          <option key={col.key} value={col.key}>
            {col.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={onToggleDir}
        aria-label={sortDir === 'desc' ? 'Sorted highest first, tap for lowest first' : 'Sorted lowest first, tap for highest first'}
        className="shrink-0 rounded-lg border border-border px-3 py-1.5 font-semibold text-brand"
      >
        {sortDir === 'desc' ? '▼' : '▲'}
      </button>
    </div>
  );
}
