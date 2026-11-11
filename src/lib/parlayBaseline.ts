/**
 * Parlay leg records graded by hand for Weeks 1-8 of the 2026 season (Week 5
 * excluded, Weeks 6 and 8 had two picks each). From Week 9 on, results are
 * entered on the Parlay Picks page and added on top of this baseline.
 * Keyed by team name because that's what the records were tallied against.
 */
export const PARLAY_BASELINE_SEASON = 2026;
export const PARLAY_RESULTS_START_WEEK = 9;

const BASELINE: Record<string, { wins: number; losses: number }> = {
  "'22, '24 league champion": { wins: 5, losses: 3 },
  'bills simp': { wins: 5, losses: 2 },
  'gurleys gone wild': { wins: 5, losses: 3 },
  'kenneth walk-tuah iii': { wins: 5, losses: 1 },
  'dawg check': { wins: 5, losses: 3 },
  'haywood joblomee': { wins: 4, losses: 4 },
  'bonnie bloom': { wins: 6, losses: 2 },
  'joe buck yourself': { wins: 5, losses: 2 },
  'eazy breecey': { wins: 5, losses: 3 },
  'i still hate you all': { wins: 4, losses: 3 },
  '3rd down surprise punt': { wins: 5, losses: 3 },
  'just happy to be here': { wins: 4, losses: 4 },
};

function normalize(name: string): string {
  return name.trim().toLowerCase().replace(/[‘’′]/g, "'");
}

export function getParlayBaseline(season: number, teamName: string): { wins: number; losses: number } {
  if (season !== PARLAY_BASELINE_SEASON) return { wins: 0, losses: 0 };
  return BASELINE[normalize(teamName)] ?? { wins: 0, losses: 0 };
}
