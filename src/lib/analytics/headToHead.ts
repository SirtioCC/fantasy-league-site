import { getOwners } from '@/lib/db/queries';
import { getAllGameResults, type GameResult } from './gameResults';

export interface HeadToHeadCell {
  opponentOwnerId: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
}

export interface HeadToHeadRow {
  ownerId: string;
  ownerName: string;
  vs: Map<string, HeadToHeadCell>;
}

export async function buildHeadToHeadMatrix(): Promise<HeadToHeadRow[]> {
  const [owners, allGames] = await Promise.all([getOwners(), getAllGameResults()]);
  const games = allGames.filter((g) => g.result !== 'BYE' && g.opponentOwnerId);

  const rows = new Map<string, HeadToHeadRow>();
  for (const o of owners) {
    rows.set(o.owner_id, { ownerId: o.owner_id, ownerName: o.display_name, vs: new Map() });
  }

  for (const g of games) {
    if (!g.opponentOwnerId) continue;
    const row = rows.get(g.ownerId);
    if (!row) continue;

    const cell =
      row.vs.get(g.opponentOwnerId) ??
      ({
        opponentOwnerId: g.opponentOwnerId,
        wins: 0,
        losses: 0,
        ties: 0,
        pointsFor: 0,
        pointsAgainst: 0,
      } satisfies HeadToHeadCell);

    if (g.result === 'W') cell.wins++;
    else if (g.result === 'L') cell.losses++;
    else if (g.result === 'T') cell.ties++;
    cell.pointsFor += g.points;
    cell.pointsAgainst += g.opponentPoints ?? 0;

    row.vs.set(g.opponentOwnerId, cell);
  }

  return Array.from(rows.values());
}

export interface RivalryGame {
  season: number;
  week: number;
  isPlayoff: boolean;
  ownerAPoints: number;
  ownerBPoints: number;
  winnerOwnerId: string | null;
}

export interface Rivalry {
  ownerAId: string;
  ownerAName: string;
  ownerBId: string;
  ownerBName: string;
  ownerAWins: number;
  ownerBWins: number;
  ties: number;
  games: RivalryGame[];
}

export async function getRivalry(ownerAId: string, ownerBId: string): Promise<Rivalry | null> {
  const [ownerRows, allGames] = await Promise.all([getOwners(), getAllGameResults()]);
  const owners = new Map(ownerRows.map((o) => [o.owner_id, o.display_name]));
  const ownerAName = owners.get(ownerAId);
  const ownerBName = owners.get(ownerBId);
  if (!ownerAName || !ownerBName) return null;

  const games = allGames.filter(
    (g) => g.result !== 'BYE' && g.ownerId === ownerAId && g.opponentOwnerId === ownerBId,
  );

  games.sort((a, b) => a.season - b.season || a.week - b.week);

  let ownerAWins = 0,
    ownerBWins = 0,
    ties = 0;

  const rivalryGames: RivalryGame[] = games.map((g: GameResult) => {
    if (g.result === 'W') ownerAWins++;
    else if (g.result === 'L') ownerBWins++;
    else ties++;

    return {
      season: g.season,
      week: g.week,
      isPlayoff: g.isPlayoff,
      ownerAPoints: g.points,
      ownerBPoints: g.opponentPoints ?? 0,
      winnerOwnerId: g.result === 'W' ? ownerAId : g.result === 'L' ? ownerBId : null,
    };
  });

  return {
    ownerAId,
    ownerAName,
    ownerBId,
    ownerBName,
    ownerAWins,
    ownerBWins,
    ties,
    games: rivalryGames,
  };
}

export interface RivalrySummaryEntry {
  opponentOwnerId: string;
  opponentOwnerName: string;
  wins: number;
  losses: number;
  ties: number;
  games: number;
  winPct: number;
}

export interface OwnerRivalrySummary {
  mostPlayed: RivalrySummaryEntry | null;
  bestRecord: RivalrySummaryEntry | null;
  worstRecord: RivalrySummaryEntry | null;
}

/** For one owner: who they've played most, who they dominate, and who
 * dominates them (minimum 3 meetings so a 1-0 fluke doesn't win the title). */
export async function getOwnerRivalrySummary(ownerId: string): Promise<OwnerRivalrySummary> {
  const matrix = await buildHeadToHeadMatrix();
  const row = matrix.find((r) => r.ownerId === ownerId);
  if (!row) return { mostPlayed: null, bestRecord: null, worstRecord: null };

  const owners = new Map(matrix.map((r) => [r.ownerId, r.ownerName]));

  const entries: RivalrySummaryEntry[] = Array.from(row.vs.values()).map((cell) => {
    const games = cell.wins + cell.losses + cell.ties;
    return {
      opponentOwnerId: cell.opponentOwnerId,
      opponentOwnerName: owners.get(cell.opponentOwnerId) ?? 'Unknown Owner',
      wins: cell.wins,
      losses: cell.losses,
      ties: cell.ties,
      games,
      winPct: games > 0 ? (cell.wins + cell.ties * 0.5) / games : 0,
    };
  });

  if (entries.length === 0) return { mostPlayed: null, bestRecord: null, worstRecord: null };

  const mostPlayed = entries.slice().sort((a, b) => b.games - a.games)[0];

  const eligible = entries.filter((e) => e.games >= 3);
  const pool = eligible.length > 0 ? eligible : entries;
  const bestRecord = pool.slice().sort((a, b) => b.winPct - a.winPct || b.games - a.games)[0];
  const worstRecord = pool.slice().sort((a, b) => a.winPct - b.winPct || b.games - a.games)[0];

  return { mostPlayed, bestRecord, worstRecord };
}
