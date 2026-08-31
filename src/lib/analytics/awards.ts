import { getAllTimeStandings } from './records';
import { computeLuckRatings } from './luck';
import { computeConsistency } from './bestWorst';
import { getAllGameResults } from './gameResults';

export interface LeagueAward {
  emoji: string;
  label: string;
  description: string;
  ownerId: string;
  ownerName: string;
}

let cache: LeagueAward[] | null = null;

/**
 * League-wide "superlative" awards — one winner per category, computed once
 * across the whole synced history. Cached like the other analytics modules;
 * invalidated together with the game-results cache after a sync.
 */
export async function computeLeagueAwards(): Promise<LeagueAward[]> {
  if (cache) return cache;

  const [standings, luckRows, consistencyRows, games] = await Promise.all([
    getAllTimeStandings(),
    computeLuckRatings(),
    computeConsistency(),
    getAllGameResults(),
  ]);

  const awards: LeagueAward[] = [];
  const ownerName = new Map(standings.map((s) => [s.ownerId, s.displayName]));

  // Luckiest / Cursed — cumulative all-time luck.
  const luckByOwner = new Map<string, number>();
  for (const r of luckRows) luckByOwner.set(r.ownerId, (luckByOwner.get(r.ownerId) ?? 0) + r.luck);
  const luckEntries = Array.from(luckByOwner.entries());
  if (luckEntries.length > 0) {
    const luckiest = luckEntries.reduce((a, b) => (b[1] > a[1] ? b : a));
    const cursed = luckEntries.reduce((a, b) => (b[1] < a[1] ? b : a));
    awards.push({
      emoji: '🍀',
      label: 'Luckiest',
      description: `+${luckiest[1].toFixed(1)} wins above what their scoring predicted, all-time`,
      ownerId: luckiest[0],
      ownerName: ownerName.get(luckiest[0]) ?? 'Unknown',
    });
    awards.push({
      emoji: '💀',
      label: 'Cursed',
      description: `${cursed[1].toFixed(1)} wins below what their scoring predicted, all-time`,
      ownerId: cursed[0],
      ownerName: ownerName.get(cursed[0]) ?? 'Unknown',
    });
  }

  // Mr. Reliable — lowest average season-to-season scoring std dev.
  const stdDevByOwner = new Map<string, { sum: number; count: number; ownerId: string }>();
  const boomBustByOwner = new Map<string, number>();
  for (const r of consistencyRows) {
    const key = r.ownerId;
    const cur = stdDevByOwner.get(key) ?? { sum: 0, count: 0, ownerId: key };
    cur.sum += r.stdDev;
    cur.count += 1;
    stdDevByOwner.set(key, cur);
    boomBustByOwner.set(key, (boomBustByOwner.get(key) ?? 0) + r.boomWeeks + r.bustWeeks);
  }
  const reliabilityEntries = Array.from(stdDevByOwner.values()).map((v) => ({
    ownerId: v.ownerId,
    avgStdDev: v.sum / v.count,
  }));
  if (reliabilityEntries.length > 0) {
    const mostReliable = reliabilityEntries.reduce((a, b) => (b.avgStdDev < a.avgStdDev ? b : a));
    awards.push({
      emoji: '🎯',
      label: 'Mr. Reliable',
      description: `Lowest week-to-week scoring swing (±${mostReliable.avgStdDev.toFixed(1)} pts, season avg)`,
      ownerId: mostReliable.ownerId,
      ownerName: ownerName.get(mostReliable.ownerId) ?? 'Unknown',
    });
  }

  // Boom or Bust — most boom+bust weeks all-time.
  const boomBustEntries = Array.from(boomBustByOwner.entries());
  if (boomBustEntries.length > 0) {
    const boomBust = boomBustEntries.reduce((a, b) => (b[1] > a[1] ? b : a));
    awards.push({
      emoji: '🎢',
      label: 'Boom or Bust',
      description: `${boomBust[1]} boom-or-bust weeks all-time — scored 15%+ above or below their own season average`,
      ownerId: boomBust[0],
      ownerName: ownerName.get(boomBust[0]) ?? 'Unknown',
    });
  }

  // Clutch — best playoff win %, minimum 3 playoff games if possible.
  const playoffByOwner = new Map<string, { wins: number; losses: number; ties: number }>();
  for (const g of games) {
    if (!g.isPlayoff || g.result === 'BYE') continue;
    const cur = playoffByOwner.get(g.ownerId) ?? { wins: 0, losses: 0, ties: 0 };
    if (g.result === 'W') cur.wins++;
    else if (g.result === 'L') cur.losses++;
    else cur.ties++;
    playoffByOwner.set(g.ownerId, cur);
  }
  const playoffEntries = Array.from(playoffByOwner.entries()).map(([ownerId, rec]) => {
    const total = rec.wins + rec.losses + rec.ties;
    return { ownerId, total, winPct: total > 0 ? (rec.wins + rec.ties * 0.5) / total : 0, rec };
  });
  const eligiblePlayoff = playoffEntries.filter((e) => e.total >= 3);
  const playoffPool = eligiblePlayoff.length > 0 ? eligiblePlayoff : playoffEntries;
  if (playoffPool.length > 0) {
    const clutch = playoffPool.reduce((a, b) => (b.winPct > a.winPct ? b : a));
    awards.push({
      emoji: '🏆',
      label: 'Clutch',
      description: `${(clutch.winPct * 100).toFixed(0)}% playoff win rate (${clutch.rec.wins}-${clutch.rec.losses}${clutch.rec.ties ? `-${clutch.rec.ties}` : ''})`,
      ownerId: clutch.ownerId,
      ownerName: ownerName.get(clutch.ownerId) ?? 'Unknown',
    });
  }

  // Iron Man — most seasons played.
  if (standings.length > 0) {
    const ironMan = standings.reduce((a, b) => (b.seasonsPlayed > a.seasonsPlayed ? b : a));
    awards.push({
      emoji: '🦾',
      label: 'Iron Man',
      description: `${ironMan.seasonsPlayed} seasons in the league — more than anyone else`,
      ownerId: ironMan.ownerId,
      ownerName: ironMan.displayName,
    });
  }

  // High Scorer / Ice Cold — career points-for average.
  if (standings.length > 0) {
    const highScorer = standings.reduce((a, b) => (b.avgPointsFor > a.avgPointsFor ? b : a));
    const iceCold = standings.reduce((a, b) => (b.avgPointsFor < a.avgPointsFor ? b : a));
    awards.push({
      emoji: '🔥',
      label: 'High Scorer',
      description: `${highScorer.avgPointsFor.toFixed(1)} points per game, career average`,
      ownerId: highScorer.ownerId,
      ownerName: highScorer.displayName,
    });
    awards.push({
      emoji: '🥶',
      label: 'Ice Cold',
      description: `${iceCold.avgPointsFor.toFixed(1)} points per game, career average`,
      ownerId: iceCold.ownerId,
      ownerName: iceCold.displayName,
    });
  }

  cache = awards;
  return awards;
}

export function invalidateAwardsCache() {
  cache = null;
}

export async function getOwnerAwards(ownerId: string): Promise<LeagueAward[]> {
  const all = await computeLeagueAwards();
  return all.filter((a) => a.ownerId === ownerId);
}
