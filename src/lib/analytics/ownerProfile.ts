import { getDraftPicksForSeason, getOwner, getPlayersMap, getTeamsForOwner } from '@/lib/db/queries';
import { getAllTimeStandings, getRecordBook, type OwnerAllTimeSummary, type RecordBook } from './records';
import { buildSeasonPerformances, type SeasonPerformance } from './bestWorst';
import { getOwnerAwards, type LeagueAward } from './awards';
import { getOwnerRivalrySummary, type OwnerRivalrySummary } from './headToHead';
import { computeLuckRatings } from './luck';

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

export interface OwnerRecordHeld {
  label: string;
  detail: string;
}

export interface OwnerCareerTrendPoint {
  season: number;
  pointsFor: number;
  avgPointsFor: number;
  luck: number | null;
}

export interface OwnerTimelineEntry {
  season: number;
  finalRank: number | null;
  isChampion: boolean;
  isRunnerUp: boolean;
  madePlayoffs: boolean;
  isLastPlace: boolean;
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
  awards: LeagueAward[];
  rivalrySummary: OwnerRivalrySummary;
  recordsHeld: OwnerRecordHeld[];
  careerTrend: OwnerCareerTrendPoint[];
  timeline: OwnerTimelineEntry[];
}

export async function getOwnerProfile(ownerId: string): Promise<OwnerProfile | null> {
  const owner = await getOwner(ownerId);
  if (!owner) return null;

  const [allTimeStandings, allSeasonPerformances, ownerTeams, awards, rivalrySummary, recordBook, allLuck] =
    await Promise.all([
      getAllTimeStandings(),
      buildSeasonPerformances(),
      getTeamsForOwner(ownerId),
      getOwnerAwards(ownerId),
      getOwnerRivalrySummary(ownerId),
      getRecordBook(),
      computeLuckRatings(),
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

  const recordsHeld = buildRecordsHeld(ownerId, recordBook);

  const luckBySeason = new Map(
    allLuck
      .filter((r) => r.ownerId === ownerId)
      .map((r) => [r.season, r.luck] as const),
  );
  const careerTrend: OwnerCareerTrendPoint[] = [...seasons]
    .sort((a, b) => a.season - b.season)
    .map((s) => {
      const games = s.wins + s.losses + s.ties;
      return {
        season: s.season,
        pointsFor: s.pointsFor,
        avgPointsFor: games > 0 ? s.pointsFor / games : 0,
        luck: luckBySeason.get(s.season) ?? null,
      };
    });

  const timeline: OwnerTimelineEntry[] = [...seasons]
    .sort((a, b) => a.season - b.season)
    .map((s) => ({
      season: s.season,
      finalRank: s.finalRank,
      isChampion: s.isChampion,
      isRunnerUp: s.isRunnerUp,
      madePlayoffs: s.madePlayoffs,
      isLastPlace: s.isLastPlace,
    }));

  return {
    ownerId,
    displayName: owner.display_name,
    summary,
    seasons,
    bestSeason,
    worstSeason,
    draftHistory,
    favoritePositions,
    awards,
    rivalrySummary,
    recordsHeld,
    careerTrend,
    timeline,
  };
}

/** Cross-references the league-wide record book against one owner, so the
 * profile page can show "you hold this record" rather than just linking to
 * the global standings page's record book. */
function buildRecordsHeld(ownerId: string, recordBook: RecordBook): OwnerRecordHeld[] {
  const held: OwnerRecordHeld[] = [];

  if (recordBook.mostPointsInGame?.ownerId === ownerId) {
    held.push({
      label: 'Most points in a game',
      detail: `${recordBook.mostPointsInGame.points.toFixed(2)} · ${recordBook.mostPointsInGame.season} Week ${recordBook.mostPointsInGame.week}`,
    });
  }
  if (recordBook.fewestPointsInGame?.ownerId === ownerId) {
    held.push({
      label: 'Fewest points in a game',
      detail: `${recordBook.fewestPointsInGame.points.toFixed(2)} · ${recordBook.fewestPointsInGame.season} Week ${recordBook.fewestPointsInGame.week}`,
    });
  }
  if (
    recordBook.biggestBlowout &&
    (recordBook.biggestBlowout.ownerId === ownerId || recordBook.biggestBlowout.opponentOwnerId === ownerId)
  ) {
    const b = recordBook.biggestBlowout;
    const won = b.ownerId === ownerId;
    held.push({
      label: won ? 'Biggest blowout (winning side)' : 'Biggest blowout (losing side)',
      detail: `${Math.abs(b.points - (b.opponentPoints ?? 0)).toFixed(2)} pts · ${b.season} Week ${b.week}`,
    });
  }
  if (
    recordBook.closestGame &&
    (recordBook.closestGame.ownerId === ownerId || recordBook.closestGame.opponentOwnerId === ownerId)
  ) {
    const c = recordBook.closestGame;
    held.push({
      label: 'Closest game',
      detail: `${Math.abs(c.points - (c.opponentPoints ?? 0)).toFixed(2)} pts · ${c.season} Week ${c.week}`,
    });
  }
  if (recordBook.longestWinStreak?.ownerId === ownerId) {
    held.push({
      label: 'Longest win streak',
      detail: `${recordBook.longestWinStreak.length} games · ${recordBook.longestWinStreak.startSeason}–${recordBook.longestWinStreak.endSeason}`,
    });
  }
  if (recordBook.longestLossStreak?.ownerId === ownerId) {
    held.push({
      label: 'Longest losing streak',
      detail: `${recordBook.longestLossStreak.length} games · ${recordBook.longestLossStreak.startSeason}–${recordBook.longestLossStreak.endSeason}`,
    });
  }

  return held;
}
