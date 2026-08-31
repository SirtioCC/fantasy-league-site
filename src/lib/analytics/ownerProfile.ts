import { getDraftPicksForSeason, getOwner, getPlayersMap, getTeamsForOwner } from '@/lib/db/queries';
import { getAllTimeStandings, type OwnerAllTimeSummary } from './records';
import { buildSeasonPerformances, type SeasonPerformance } from './bestWorst';

export interface OwnerDraftPick {
  season: number;
  round: number | null;
  overallPick: number;
  playerName: string;
  position: string | null;
  proTeam: string | null;
  keeper: boolean;
  bidAmount: number | null;
}

export interface OwnerProfile {
  ownerId: string;
  displayName: string;
  summary: OwnerAllTimeSummary | null;
  seasons: SeasonPerformance[];
  bestSeason: SeasonPerformance | null;
  worstSeason: SeasonPerformance | null;
  draftHistory: OwnerDraftPick[];
  favoritePositions: { position: string; count: number }[];
}

export async function getOwnerProfile(ownerId: string): Promise<OwnerProfile | null> {
  const owner = await getOwner(ownerId);
  if (!owner) return null;

  const [allTimeStandings, allSeasonPerformances, ownerTeams] = await Promise.all([
    getAllTimeStandings(),
    buildSeasonPerformances(),
    getTeamsForOwner(ownerId),
  ]);

  const summary = allTimeStandings.find((o) => o.ownerId === ownerId) ?? null;
  const seasons = allSeasonPerformances
    .filter((s) => s.ownerId === ownerId)
    .sort((a, b) => b.season - a.season);

  const bySeasonScore = [...seasons].sort((a, b) => b.wins - a.wins || b.pointsFor - a.pointsFor);
  const bestSeason = bySeasonScore[0] ?? null;
  const worstSeason = bySeasonScore[bySeasonScore.length - 1] ?? null;

  const perTeamPicks = await Promise.all(
    ownerTeams.map(async (team) => {
      const picks = (await getDraftPicksForSeason(team.season)).filter((p) => p.team_id === team.team_id);
      if (picks.length === 0) return [];
      const players = await getPlayersMap(team.season);

      return picks.map((pick): OwnerDraftPick => {
        const player = pick.player_id ? players.get(pick.player_id) : undefined;
        return {
          season: team.season,
          round: pick.round_id,
          overallPick: pick.overall_pick,
          playerName: player?.full_name ?? (pick.player_id ? `Player #${pick.player_id}` : 'Unknown'),
          position: player?.position ?? null,
          proTeam: player?.pro_team ?? null,
          keeper: !!pick.keeper,
          bidAmount: pick.bid_amount,
        };
      });
    }),
  );

  const draftHistory = perTeamPicks.flat().sort((a, b) => b.season - a.season || a.overallPick - b.overallPick);

  const positionCounts = new Map<string, number>();
  for (const pick of draftHistory) {
    if (pick.position) positionCounts.set(pick.position, (positionCounts.get(pick.position) ?? 0) + 1);
  }

  const favoritePositions = Array.from(positionCounts.entries())
    .map(([position, count]) => ({ position, count }))
    .sort((a, b) => b.count - a.count);

  return {
    ownerId,
    displayName: owner.display_name,
    summary,
    seasons,
    bestSeason,
    worstSeason,
    draftHistory,
    favoritePositions,
  };
}
