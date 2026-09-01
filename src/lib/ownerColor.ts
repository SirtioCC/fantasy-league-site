import { CHART_PALETTE } from '@/components/charts/palette';

/**
 * A stable accent color per owner, so a manager reads as the same color
 * everywhere on the site (avatars, cards, charts). Derived from the owner
 * id rather than list position, so the color survives new owners joining
 * or the sort order changing.
 */
export function ownerColor(ownerId: string | null | undefined): string {
  if (!ownerId) return CHART_PALETTE[CHART_PALETTE.length - 1];

  let hash = 0;
  for (let i = 0; i < ownerId.length; i++) {
    hash = (hash * 31 + ownerId.charCodeAt(i)) >>> 0;
  }
  return CHART_PALETTE[hash % CHART_PALETTE.length];
}

/** Up to two initials for the avatar fallback when a team has no logo.
 * Punctuation is stripped first so a name like "'22, '24 League Champion"
 * yields "22" rather than a pair of apostrophes. */
export function initialsFor(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter(Boolean);

  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
