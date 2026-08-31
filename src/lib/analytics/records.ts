import { getAllStandings, getAllTeams, getOwners, type StandingRow } from '@/lib/db/queries';
import { getAllGameResults, type GameResult } from './gameResults';

export interface OwnerAllTimeSummary {
  ownerId: string;
  displayName: string;
  seasonsPlayed: number;
  teamNames: string[];
  wins: number;
  losses: number;
  ties: number;
  winPct: number;
  pointsFor: number;
  pointsAgainst: number;
  avgPointsFor: number;
  championships: number;
  runnerUps: number;
  playoffAppearances: number;
  lastPlaceFinishes: number;
}

export async function getAllTimeStandings(): Promise<OwnerAllTimeSummary[]> {
  const [owners, standings, teams] = await Promise.all([getOwners(), getAllStandings(), getAllTeams()]);

  const teamsByOwner = new Map<string, typeof teams>();
  for (const t of teams) {
    const list = teamsByOwner.get(t.owner_id) ?? [];
    list.push(t);
    teamsByOwner.set(t.owner_id, list);
  }

  const standingsByTeamKey = new Map<string, StandingRow>();
  for (const s of standings) standingsByTeamKey.set(`${s.season}:${s.team_id}`, s);

  return owners
    .map((owner): OwnerAllTimeSummary => {
      const ownerTeams = teamsByOwner.get(owner.owner_id) ?? [];
      const teamNames = Array.from(new Set(ownerTeams.map((t) => t.team_name)));

      let wins = 0,
        losses = 0,
        ties = 0,
        pointsFor = 0,
        pointsAgainst = 0,
        championships = 0,
        runnerUps = 0,
        playoffAppearances = 0,
        lastPlaceFinishes = 0;
      const seasonsWithGames = new Set<number>();

      for (const t of ownerTeams) {
        const s = standingsByTeamKey.get(`${t.season}:${t.team_id}`);
        // Skip seasons ESPN has no recorded games for (e.g. a league year
        // that existed but was never actually played) — a 0-0-0 shell
        // shouldn't count as a season played or drag down the averages.
        if (!s || s.wins + s.losses + s.ties === 0) continue;
        seasonsWithGames.add(t.season);
        wins += s.wins;
        losses += s.losses;
        ties += s.ties;
        pointsFor += s.points_for;
        pointsAgainst += s.points_against;
        if (s.is_champion) championships++;
        if (s.is_runner_up) runnerUps++;
        if (s.made_playoffs) playoffAppearances++;
        if (s.is_last_place) lastPlaceFinishes++;
      }

      const seasonsPlayed = seasonsWithGames.size;

      const totalGames = wins + losses + ties;

      return {
        ownerId: owner.owner_id,
        displayName: owner.display_name,
        seasonsPlayed,
        teamNames,
        wins,
        losses,
        ties,
        winPct: totalGames > 0 ? (wins + ties * 0.5) / totalGames : 0,
        pointsFor,
        pointsAgainst,
        avgPointsFor: totalGames > 0 ? pointsFor / totalGames : 0,
        championships,
        runnerUps,
        playoffAppearances,
        lastPlaceFinishes,
      };
    })
    .filter((o) => o.seasonsPlayed > 0)
    .sort((a, b) => b.winPct - a.winPct || b.pointsFor - a.pointsFor);
}

export interface RecordBookEntry {
  season: number;
  week: number;
  ownerId: string;
  ownerName: string;
  teamName: string;
  points: number;
  opponentOwnerId?: string | null;
  opponentOwnerName?: string | null;
  opponentTeamName?: string | null;
  opponentPoints?: number | null;
  margin?: number;
}

export interface RecordStreak {
  ownerId: string;
  ownerName: string;
  length: number;
  startSeason: number;
  endSeason: number;
}

export interface RecordBook {
  mostPointsInGame: RecordBookEntry | null;
  fewestPointsInGame: RecordBookEntry | null;
  biggestBlowout: RecordBookEntry | null;
  closestGame: RecordBookEntry | null;
  longestWinStreak: RecordStreak | null;
  longestLossStreak: RecordStreak | null;
}

function toEntry(g: GameResult): RecordBookEntry {
  return {
    season: g.season,
    week: g.week,
    ownerId: g.ownerId,
    ownerName: g.ownerName,
    teamName: g.teamName,
    points: g.points,
    opponentOwnerId: g.opponentOwnerId,
    opponentOwnerName: g.opponentOwnerName,
    opponentTeamName: g.opponentTeamName,
    opponentPoints: g.opponentPoints,
  };
}

export async function getRecordBook(): Promise<RecordBook> {
  const games = (await getAllGameResults()).filter((g) => g.result !== 'BYE');
  if (games.length === 0) {
    return {
      mostPointsInGame: null,
      fewestPointsInGame: null,
      biggestBlowout: null,
      closestGame: null,
      longestWinStreak: null,
      longestLossStreak: null,
    };
  }

  // Single-week-only games for point-based records: a combined multi-week
  // matchup (e.g. a 2-week championship round) reports a cumulative total,
  // which isn't a fair comparison against a normal single week's score.
  const singleWeekGames = games.filter((g) => g.durationWeeks === 1);

  const mostPoints =
    singleWeekGames.length > 0 ? singleWeekGames.reduce((a, b) => (b.points > a.points ? b : a)) : null;
  const fewestPoints =
    singleWeekGames.length > 0 ? singleWeekGames.reduce((a, b) => (b.points < a.points ? b : a)) : null;

  // Only look at one side of each matchup for margin-based records.
  const seen = new Set<string>();
  let biggestBlowout: GameResult | null = null;
  let closestGame: GameResult | null = null;

  for (const g of singleWeekGames) {
    if (g.opponentTeamId === null) continue;
    const key = [g.season, g.week, g.teamId, g.opponentTeamId].sort().join(':') + `:${g.season}:${g.week}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const margin = Math.abs(g.points - (g.opponentPoints ?? 0));
    if (!biggestBlowout || margin > Math.abs(biggestBlowout.points - (biggestBlowout.opponentPoints ?? 0))) {
      biggestBlowout = g;
    }
    if (g.result !== 'T' && (!closestGame || margin < Math.abs(closestGame.points - (closestGame.opponentPoints ?? 0)))) {
      closestGame = g;
    }
  }

  // Win/loss streaks per owner, in chronological order across all seasons.
  const byOwner = new Map<string, GameResult[]>();
  for (const g of games) {
    const list = byOwner.get(g.ownerId) ?? [];
    list.push(g);
    byOwner.set(g.ownerId, list);
  }

  let longestWinStreak: RecordBook['longestWinStreak'] = null;
  let longestLossStreak: RecordBook['longestLossStreak'] = null;

  for (const [, list] of byOwner) {
    list.sort((a, b) => a.season - b.season || a.week - b.week);

    let winRun = 0,
      winStart = 0;
    let lossRun = 0,
      lossStart = 0;

    list.forEach((g, i) => {
      if (g.result === 'W') {
        if (winRun === 0) winStart = i;
        winRun++;
      } else {
        if (winRun > (longestWinStreak?.length ?? 0)) {
          longestWinStreak = {
            ownerId: list[i - 1].ownerId,
            ownerName: list[i - 1].ownerName,
            length: winRun,
            startSeason: list[winStart].season,
            endSeason: list[i - 1].season,
          };
        }
        winRun = 0;
      }

      if (g.result === 'L') {
        if (lossRun === 0) lossStart = i;
        lossRun++;
      } else {
        if (lossRun > (longestLossStreak?.length ?? 0)) {
          longestLossStreak = {
            ownerId: list[i - 1].ownerId,
            ownerName: list[i - 1].ownerName,
            length: lossRun,
            startSeason: list[lossStart].season,
            endSeason: list[i - 1].season,
          };
        }
        lossRun = 0;
      }
    });

    if (winRun > (longestWinStreak?.length ?? 0)) {
      longestWinStreak = {
        ownerId: list[list.length - 1].ownerId,
        ownerName: list[list.length - 1].ownerName,
        length: winRun,
        startSeason: list[winStart].season,
        endSeason: list[list.length - 1].season,
      };
    }
    if (lossRun > (longestLossStreak?.length ?? 0)) {
      longestLossStreak = {
        ownerId: list[list.length - 1].ownerId,
        ownerName: list[list.length - 1].ownerName,
        length: lossRun,
        startSeason: list[lossStart].season,
        endSeason: list[list.length - 1].season,
      };
    }
  }

  return {
    mostPointsInGame: mostPoints ? toEntry(mostPoints) : null,
    fewestPointsInGame: fewestPoints ? toEntry(fewestPoints) : null,
    biggestBlowout: biggestBlowout ? toEntry(biggestBlowout) : null,
    closestGame: closestGame ? toEntry(closestGame) : null,
    longestWinStreak,
    longestLossStreak,
  };
}
