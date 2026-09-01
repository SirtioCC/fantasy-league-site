import { getAllTimeStandings, type OwnerAllTimeSummary } from './records';
import { buildSeasonPerformances, type SeasonPerformance } from './bestWorst';
import { getOwnerAwards, type LeagueAward } from './awards';
import { getRivalry } from './headToHead';

export interface OwnerHeadToHead {
  ownerAWins: number;
  ownerBWins: number;
  ties: number;
}

export interface OwnerComparison {
  ownerA: OwnerAllTimeSummary | null;
  ownerB: OwnerAllTimeSummary | null;
  bestSeasonA: SeasonPerformance | null;
  bestSeasonB: SeasonPerformance | null;
  awardsA: LeagueAward[];
  awardsB: LeagueAward[];
  headToHead: OwnerHeadToHead | null;
}

function bestSeasonFor(seasons: SeasonPerformance[], ownerId: string): SeasonPerformance | null {
  return (
    seasons
      .filter((s) => s.ownerId === ownerId)
      .sort((a, b) => b.wins - a.wins || b.pointsFor - a.pointsFor)[0] ?? null
  );
}

/** Side-by-side career comparison between two owners — distinct from the
 * head-to-head matrix (which is only about games *against* each other),
 * this compares their whole all-time résumés. */
export async function compareOwners(ownerAId: string, ownerBId: string): Promise<OwnerComparison> {
  const [standings, seasons, awardsA, awardsB, rivalry] = await Promise.all([
    getAllTimeStandings(),
    buildSeasonPerformances(),
    getOwnerAwards(ownerAId),
    getOwnerAwards(ownerBId),
    getRivalry(ownerAId, ownerBId),
  ]);

  return {
    ownerA: standings.find((s) => s.ownerId === ownerAId) ?? null,
    ownerB: standings.find((s) => s.ownerId === ownerBId) ?? null,
    bestSeasonA: bestSeasonFor(seasons, ownerAId),
    bestSeasonB: bestSeasonFor(seasons, ownerBId),
    awardsA,
    awardsB,
    headToHead: rivalry
      ? { ownerAWins: rivalry.ownerAWins, ownerBWins: rivalry.ownerBWins, ties: rivalry.ties }
      : null,
  };
}
