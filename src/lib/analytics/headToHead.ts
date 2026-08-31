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
