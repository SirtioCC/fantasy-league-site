import { getRegularSeasonGameResults, type GameResult } from './gameResults';

export interface PowerRankingRow {
  teamId: number;
  ownerId: string;
  ownerName: string;
  teamName: string;
  rank: number;
  powerScore: number; // 0-100
  winPct: number;
  avgPoints: number;
  recentFormAvg: number; // avg points over last up-to-3 games
  scheduleStrength: number; // avg opponent PPG faced
  record: string; // "W-L-T" through this week
}

const WEIGHTS = { winPct: 0.35, avgPoints: 0.35, recentForm: 0.2, scheduleStrength: 0.1 };

function normalize(value: number, min: number, max: number): number {
  if (max - min < 1e-9) return 0.5;
  return (value - min) / (max - min);
}

/**
 * Composite power ranking through a given week of a season (defaults to the
 * latest week with played games). Blends win percentage, scoring average,
 * recent form (last up-to-3 games), and strength of schedule faced so far —
 * not just raw win/loss record.
 */
export function computePowerRankings(season: number, throughWeek?: number): PowerRankingRow[] {
  const allGames = getRegularSeasonGameResults().filter(
    (g) => g.season === season && g.result !== 'BYE',
  );
  if (allGames.length === 0) return [];

  const maxWeek = throughWeek ?? Math.max(...allGames.map((g) => g.week));
  const games = allGames.filter((g) => g.week <= maxWeek);
  if (games.length === 0) return [];

  const byTeam = new Map<number, GameResult[]>();
  for (const g of games) {
    const list = byTeam.get(g.teamId) ?? [];
    list.push(g);
    byTeam.set(g.teamId, list);
  }

  const rows: (PowerRankingRow & { _raw: { winPct: number; avgPoints: number; recentForm: number; scheduleStrength: number } })[] = [];

  for (const [teamId, teamGames] of byTeam) {
    teamGames.sort((a, b) => a.week - b.week);
    const wins = teamGames.filter((g) => g.result === 'W').length;
    const losses = teamGames.filter((g) => g.result === 'L').length;
    const ties = teamGames.filter((g) => g.result === 'T').length;
    const winPct = teamGames.length > 0 ? (wins + ties * 0.5) / teamGames.length : 0;
    const avgPoints = teamGames.reduce((a, g) => a + g.points, 0) / teamGames.length;
    const recent = teamGames.slice(-3);
    const recentForm = recent.reduce((a, g) => a + g.points, 0) / recent.length;
    const oppPoints = teamGames
      .map((g) => g.opponentPoints)
      .filter((p): p is number => p !== null);
    const scheduleStrength = oppPoints.length > 0 ? oppPoints.reduce((a, b) => a + b, 0) / oppPoints.length : 0;

    const meta = teamGames[0];
    rows.push({
      teamId,
      ownerId: meta.ownerId,
      ownerName: meta.ownerName,
      teamName: meta.teamName,
      rank: 0,
      powerScore: 0,
      winPct,
      avgPoints,
      recentFormAvg: recentForm,
      scheduleStrength,
      record: `${wins}-${losses}${ties ? `-${ties}` : ''}`,
      _raw: { winPct, avgPoints, recentForm, scheduleStrength },
    });
  }

  const winPcts = rows.map((r) => r._raw.winPct);
  const avgPointsArr = rows.map((r) => r._raw.avgPoints);
  const recentFormArr = rows.map((r) => r._raw.recentForm);
  const scheduleArr = rows.map((r) => r._raw.scheduleStrength);

  const ranges = {
    winPct: [Math.min(...winPcts), Math.max(...winPcts)] as const,
    avgPoints: [Math.min(...avgPointsArr), Math.max(...avgPointsArr)] as const,
    recentForm: [Math.min(...recentFormArr), Math.max(...recentFormArr)] as const,
    scheduleStrength: [Math.min(...scheduleArr), Math.max(...scheduleArr)] as const,
  };

  for (const row of rows) {
    const score =
      WEIGHTS.winPct * normalize(row._raw.winPct, ranges.winPct[0], ranges.winPct[1]) +
      WEIGHTS.avgPoints * normalize(row._raw.avgPoints, ranges.avgPoints[0], ranges.avgPoints[1]) +
      WEIGHTS.recentForm * normalize(row._raw.recentForm, ranges.recentForm[0], ranges.recentForm[1]) +
      WEIGHTS.scheduleStrength *
        normalize(row._raw.scheduleStrength, ranges.scheduleStrength[0], ranges.scheduleStrength[1]);
    row.powerScore = Math.round(score * 1000) / 10;
  }

  rows.sort((a, b) => b.powerScore - a.powerScore);
  rows.forEach((r, i) => (r.rank = i + 1));

  return rows.map((row) => {
    const { _raw, ...rest } = row;
    void _raw;
    return rest;
  });
}

/** Power rankings for every week of a season, keyed by week number — used
 * for the "power ranking over time" line chart. */
export function computePowerRankingsHistory(season: number): Map<number, PowerRankingRow[]> {
  const games = getRegularSeasonGameResults().filter((g) => g.season === season && g.result !== 'BYE');
  const weeks = Array.from(new Set(games.map((g) => g.week))).sort((a, b) => a - b);
  const history = new Map<number, PowerRankingRow[]>();
  for (const week of weeks) {
    history.set(week, computePowerRankings(season, week));
  }
  return history;
}
