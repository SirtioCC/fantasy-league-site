/**
 * The 2026 regular-season schedule.
 *
 * Weeks 1-11 are a complete round robin (all 66 pairings exactly once);
 * weeks 12-13 are the only rematches, so every manager faces nine opponents
 * once and exactly two twice, and nobody meets a third time. ESPN's
 * generated schedule doubled some pairings and skipped others, which handed
 * out easier and harder slates by luck of the draw.
 *
 * Pairings were randomized and then checked against those constraints.
 */
export const SCHEDULE_SEASON = 2026;

export interface ScheduleTeam {
  id: string;
  teamName: string;
  manager: string;
}

export const SCHEDULE_TEAMS: ScheduleTeam[] = [
  { id: 'CHAMP', teamName: "'22, '24 League Champion", manager: 'Connor C' },
  { id: 'PUNT', teamName: '3rd Down Surprise Punt', manager: 'Harrison Davis' },
  { id: 'BOWERS', teamName: 'Austin Bowers', manager: 'Jeff Bloom' },
  { id: 'BILLS', teamName: 'Bills Simp', manager: 'Timothy Judge' },
  { id: 'DAWG', teamName: 'DAWG CHECK', manager: 'Pierson M' },
  { id: 'EAZY', teamName: 'Eazy Breecey', manager: 'Ryan Andrew' },
  { id: 'GGW', teamName: 'Gurleys Gone Wild', manager: 'Alex Corrado' },
  { id: 'HAY', teamName: 'Haywood Joblomee', manager: 'Nathan Rickard' },
  { id: 'HATE', teamName: 'I still hate you all', manager: 'John Haley' },
  { id: 'JBY', teamName: 'Joe Buck Yourself', manager: 'Ian Munn' },
  { id: 'HAPPY', teamName: 'Just Happy to be Here', manager: 'TC Hickey' },
  { id: 'TJ', teamName: 'TJ Hock Tua', manager: 'Alex Tatham' },
];

/** One entry per week, each a list of six [teamId, teamId] matchups. */
export const SCHEDULE: [string, string][][] = [
  [['PUNT', 'BOWERS'], ['EAZY', 'GGW'], ['HATE', 'HAPPY'], ['BILLS', 'CHAMP'], ['JBY', 'DAWG'], ['TJ', 'HAY']],
  [['PUNT', 'EAZY'], ['HATE', 'BOWERS'], ['BILLS', 'GGW'], ['JBY', 'HAPPY'], ['TJ', 'CHAMP'], ['HAY', 'DAWG']],
  [['PUNT', 'TJ'], ['HAY', 'JBY'], ['DAWG', 'BILLS'], ['CHAMP', 'HATE'], ['HAPPY', 'EAZY'], ['GGW', 'BOWERS']],
  [['PUNT', 'CHAMP'], ['HAPPY', 'DAWG'], ['GGW', 'HAY'], ['BOWERS', 'TJ'], ['EAZY', 'JBY'], ['HATE', 'BILLS']],
  [['PUNT', 'HAPPY'], ['GGW', 'CHAMP'], ['BOWERS', 'DAWG'], ['EAZY', 'HAY'], ['HATE', 'TJ'], ['BILLS', 'JBY']],
  [['PUNT', 'DAWG'], ['CHAMP', 'HAY'], ['HAPPY', 'TJ'], ['GGW', 'JBY'], ['BOWERS', 'BILLS'], ['EAZY', 'HATE']],
  [['PUNT', 'HAY'], ['DAWG', 'TJ'], ['CHAMP', 'JBY'], ['HAPPY', 'BILLS'], ['GGW', 'HATE'], ['BOWERS', 'EAZY']],
  [['PUNT', 'BILLS'], ['JBY', 'HATE'], ['TJ', 'EAZY'], ['HAY', 'BOWERS'], ['DAWG', 'GGW'], ['CHAMP', 'HAPPY']],
  [['PUNT', 'JBY'], ['TJ', 'BILLS'], ['HAY', 'HATE'], ['DAWG', 'EAZY'], ['CHAMP', 'BOWERS'], ['HAPPY', 'GGW']],
  [['PUNT', 'HATE'], ['BILLS', 'EAZY'], ['JBY', 'BOWERS'], ['TJ', 'GGW'], ['HAY', 'HAPPY'], ['DAWG', 'CHAMP']],
  [['PUNT', 'GGW'], ['BOWERS', 'HAPPY'], ['EAZY', 'CHAMP'], ['HATE', 'DAWG'], ['BILLS', 'HAY'], ['JBY', 'TJ']],
  [['EAZY', 'GGW'], ['HATE', 'TJ'], ['JBY', 'HAPPY'], ['HAY', 'PUNT'], ['BILLS', 'CHAMP'], ['BOWERS', 'DAWG']],
  [['CHAMP', 'JBY'], ['HAY', 'BOWERS'], ['BILLS', 'PUNT'], ['GGW', 'DAWG'], ['TJ', 'HAPPY'], ['HATE', 'EAZY']],
];

/** Weeks 1-11 are the round robin; anything later is a second meeting. */
export const ROUND_ROBIN_WEEKS = 11;

const pairKey = (a: string, b: string) => [a, b].sort().join('|');

/** How many times each pairing meets across the season. */
export const MEETING_COUNTS: Map<string, number> = (() => {
  const counts = new Map<string, number>();
  for (const week of SCHEDULE) {
    for (const [a, b] of week) counts.set(pairKey(a, b), (counts.get(pairKey(a, b)) ?? 0) + 1);
  }
  return counts;
})();

export function meetingCount(a: string, b: string): number {
  return MEETING_COUNTS.get(pairKey(a, b)) ?? 0;
}

export interface ScheduleGame {
  week: number;
  opponentId: string;
  /** True when this pairing is played twice — always a week 12-13 game. */
  isRematch: boolean;
}

/** One team's full season: exactly one game per week, in week order. */
export function gamesForTeam(teamId: string): ScheduleGame[] {
  return SCHEDULE.map((week, i) => {
    const game = week.find(([a, b]) => a === teamId || b === teamId);
    if (!game) return null;
    const opponentId = game[0] === teamId ? game[1] : game[0];
    return { week: i + 1, opponentId, isRematch: i + 1 > ROUND_ROBIN_WEEKS };
  }).filter((g): g is ScheduleGame => g !== null);
}
