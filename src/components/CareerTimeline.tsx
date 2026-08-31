import type { OwnerTimelineEntry } from '@/lib/analytics/ownerProfile';

function markerFor(entry: OwnerTimelineEntry): { emoji: string; label: string; className: string } {
  if (entry.isChampion) return { emoji: '🏆', label: 'Champion', className: 'bg-gold/20 text-gold' };
  if (entry.isRunnerUp) return { emoji: '🥈', label: 'Runner-up', className: 'bg-accent/15 text-accent' };
  if (entry.madePlayoffs) return { emoji: '✓', label: 'Made playoffs', className: 'bg-accent/10 text-accent' };
  if (entry.isLastPlace) return { emoji: '⬇', label: 'Last place', className: 'bg-accent-warm/15 text-accent-warm' };
  return { emoji: '·', label: 'Missed playoffs', className: 'bg-surface-muted text-muted' };
}

/** One mark per season played — a quick-scan strip of the highs and lows
 * of a career, oldest to newest. */
export function CareerTimeline({ entries }: { entries: OwnerTimelineEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {entries.map((entry) => {
        const marker = markerFor(entry);
        return (
          <div
            key={entry.season}
            title={`${entry.season} — ${marker.label}${entry.finalRank ? ` (#${entry.finalRank})` : ''}`}
            className={`flex flex-col items-center gap-1 rounded-lg px-2.5 py-1.5 ${marker.className}`}
          >
            <span className="text-xs font-bold leading-none">{entry.season}</span>
            <span className="text-base leading-none" aria-hidden="true">
              {marker.emoji}
            </span>
          </div>
        );
      })}
    </div>
  );
}
