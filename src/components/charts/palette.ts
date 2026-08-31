/** A 12-color categorical palette (one per team), chosen to stay legible on
 * both light and dark backgrounds. */
export const CHART_PALETTE = [
  '#5b3df0',
  '#17c980',
  '#ff7a45',
  '#d4a017',
  '#2f9bff',
  '#e0508a',
  '#00b8a9',
  '#a259ff',
  '#ff5c5c',
  '#3ddc97',
  '#f2994a',
  '#6c7a89',
];

export function colorForIndex(index: number): string {
  return CHART_PALETTE[index % CHART_PALETTE.length];
}
