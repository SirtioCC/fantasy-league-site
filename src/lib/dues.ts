/**
 * League entry fees, tracked by hand.
 *
 * This is deliberately a plain config file rather than a database table:
 * the site has no admin UI or login, so a DB row would still have to be
 * edited by hand — just through SQL instead of here. To mark someone paid,
 * flip `paid` to true and push.
 *
 * `teamName` is matched against the team names synced from ESPN to pull in
 * each owner's logo and profile link, so keep it spelled exactly as it
 * appears in the league. A name that doesn't match still renders fine, just
 * without the logo or link.
 */
export const DUES_SEASON = 2026;
export const ENTRY_FEE = 100;

export interface DuesEntry {
  teamName: string;
  managerName: string;
  paid: boolean;
}

export const DUES: DuesEntry[] = [
  { teamName: "'22, '24 League Champion", managerName: 'Connor C', paid: true },
  { teamName: 'Gurleys Gone Wild', managerName: 'Alex Corrado', paid: true },
  { teamName: '3rd Down Surprise Punt', managerName: 'Harrison Davis', paid: false },
  { teamName: 'Austin Bowers', managerName: 'Jeff Bloom', paid: true },
  { teamName: 'Bills Simp', managerName: 'Timothy Judge', paid: false },
  { teamName: 'DAWG CHECK', managerName: 'Pierson M', paid: true },
  { teamName: 'Eazy Breecey', managerName: 'Ryan Andrew', paid: false },
  { teamName: 'Haywood Joblomee', managerName: 'Nathan Rickard', paid: false },
  { teamName: 'I still hate you all', managerName: 'John Haley', paid: false },
  { teamName: 'Joe Buck Yourself', managerName: 'Ian Munn', paid: true },
  { teamName: 'Just Happy to be Here', managerName: 'TC Hickey', paid: false },
  { teamName: 'TJ Hock Tua', managerName: 'Alex Tatham', paid: false },
];

export interface DuesTotals {
  paidCount: number;
  unpaidCount: number;
  collected: number;
  outstanding: number;
  expected: number;
}

export function duesTotals(entries: DuesEntry[] = DUES): DuesTotals {
  const paidCount = entries.filter((e) => e.paid).length;
  const unpaidCount = entries.length - paidCount;
  return {
    paidCount,
    unpaidCount,
    collected: paidCount * ENTRY_FEE,
    outstanding: unpaidCount * ENTRY_FEE,
    expected: entries.length * ENTRY_FEE,
  };
}
