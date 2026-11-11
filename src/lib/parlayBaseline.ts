/**
 * Parlay leg records, graded by hand against NFL box scores and updated here
 * each week. The Parlay Picks page shows each owner's record from
 * PARLAY_RECORDS_START_WEEK on; the badge on Week N is the record through
 * Week N-1 (everything graded before that week's picks).
 *
 * Keyed by team name because that's what the records are tallied against.
 */
export const PARLAY_SEASON = 2026;
export const PARLAY_RECORDS_START_WEEK = 9;

type Tally = { wins: number; losses: number };

/** Weeks 1-8 combined (Week 5 excluded; Weeks 6 and 8 had two picks each). */
const THROUGH_WEEK_8: Record<string, Tally> = {
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

/** Graded results per week from Week 9 on. Owners with no pick are left out. */
const WEEKLY_RESULTS: Record<number, Record<string, Tally>> = {
  9: {
    "'22, '24 league champion": { wins: 1, losses: 0 }, // Christian Watson 4+ rec (7)
    'bills simp': { wins: 1, losses: 0 }, // Lions ML (19-9)
    'gurleys gone wild': { wins: 0, losses: 1 }, // Chuba Hubbard ATD (0 TD)
    'kenneth walk-tuah iii': { wins: 1, losses: 0 }, // Texans ML (44-22)
    'dawg check': { wins: 1, losses: 0 }, // Browns +10.5 (lost 23-22 OT)
    'haywood joblomee': { wins: 1, losses: 0 }, // Lions -6 (won by 10)
    'bonnie bloom': { wins: 1, losses: 0 }, // McCaffrey ATD
    'joe buck yourself': { wins: 1, losses: 0 }, // Chiefs ML (35-12)
    'eazy breecey': { wins: 1, losses: 0 }, // Rams -2.5 (20-13)
    '3rd down surprise punt': { wins: 0, losses: 1 }, // Swift ATD (0 TD)
    'just happy to be here': { wins: 1, losses: 0 }, // Gibbs ATD
  },
};

function normalize(name: string): string {
  return name.trim().toLowerCase().replace(/[‘’′]/g, "'");
}

/** Record shown on the Week `week` page: everything graded before that week. */
export function getParlayRecord(season: number, week: number, teamName: string): Tally {
  if (season !== PARLAY_SEASON) return { wins: 0, losses: 0 };
  const key = normalize(teamName);
  const base = THROUGH_WEEK_8[key] ?? { wins: 0, losses: 0 };
  let { wins, losses } = base;
  for (const [w, results] of Object.entries(WEEKLY_RESULTS)) {
    if (Number(w) >= week) continue;
    const r = results[key];
    if (r) {
      wins += r.wins;
      losses += r.losses;
    }
  }
  return { wins, losses };
}
