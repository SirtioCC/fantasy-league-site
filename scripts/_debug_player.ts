/**
 * One-off diagnostic: dumps the raw ESPN response for a single player so we
 * can see the actual field names/values instead of guessing. Usage:
 *   npx tsx scripts/_debug_player.ts 2025 "Justin Jefferson"
 */
import { getDb } from '@/lib/db';
import { getEspnCredentials } from '@/lib/env';

async function main() {
  const [seasonArg, ...nameParts] = process.argv.slice(2);
  const season = Number(seasonArg);
  const nameQuery = nameParts.join(' ').toLowerCase();
  if (!season || !nameQuery) {
    console.error('Usage: npx tsx scripts/_debug_player.ts <season> "<player name>"');
    process.exit(1);
  }

  const db = await getDb();
  const result = await db.execute({
    sql: 'SELECT player_id, full_name FROM players WHERE season = ? AND lower(full_name) LIKE ?',
    args: [season, `%${nameQuery}%`],
  });
  const row = result.rows[0] as unknown as { player_id: number; full_name: string } | undefined;
  if (!row) {
    console.error(`No player matching "${nameQuery}" found in the local players table for ${season}. Run npm run sync first.`);
    process.exit(1);
  }
  console.log(`Found: ${row.full_name} (player_id ${row.player_id})`);

  const creds = getEspnCredentials();
  if (!creds) {
    console.error('Missing ESPN_S2/ESPN_SWID/LEAGUE_ID in your .env');
    process.exit(1);
  }

  const url = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${season}/players?scoringPeriodId=0&view=kona_playercard`;
  const filter = { players: { filterIds: { value: [row.player_id] } } };

  const res = await fetch(url, {
    headers: {
      Cookie: `espn_s2=${creds.espnS2}; SWID=${creds.swid};`,
      Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0 (fantasy-league-site debug)',
      'x-fantasy-filter': JSON.stringify(filter),
    },
    cache: 'no-store',
  });

  console.log('HTTP status:', res.status);
  const text = await res.text();
  console.log('--- RAW RESPONSE ---');
  console.log(text.slice(0, 8000));
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
