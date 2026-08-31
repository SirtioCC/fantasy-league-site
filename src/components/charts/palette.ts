/** A 12-color categorical palette (one per team), chosen to stay legible on
 * both light and dark backgrounds. */
export const CHART_PALETTE = [
  '#ea580c',
  '#15803d',
  '#2563eb',
  '#ca8a04',
  '#dc2626',
  '#0891b2',
  '#7c3aed',
  '#db2777',
  '#65a30d',
  '#0d9488',
  '#9a3412',
  '#64748b',
];

export function colorForIndex(index: number): string {
  return CHART_PALETTE[index % CHART_PALETTE.length];
}
