/**
 * Manual data sync CLI.
 *
 *   npm run sync              # sync every season the league has data for
 *   npm run sync -- --season 2022   # sync (or re-sync) a single season
 */
import 'dotenv/config';
import { syncAll } from '../src/lib/espn/sync';

function parseArgs(argv: string[]): { season?: number } {
  const idx = argv.indexOf('--season');
  if (idx !== -1 && argv[idx + 1]) {
    const season = Number.parseInt(argv[idx + 1], 10);
    if (Number.isFinite(season)) return { season };
  }
  return {};
}

async function main() {
  const { season } = parseArgs(process.argv.slice(2));

  console.log(season ? `Syncing season ${season}...` : 'Syncing all available seasons...');
  const startedAt = Date.now();

  const summary = await syncAll({ forceSeason: season });

  const ok = summary.results.filter((r) => r.ok);
  const failed = summary.results.filter((r) => !r.ok);

  console.log(`\nDone in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
  console.log(`  Synced: ${ok.map((r) => r.season).join(', ') || 'none'}`);
  if (failed.length > 0) {
    console.log(`  Failed:`);
    for (const f of failed) console.log(`    ${f.season}: ${f.error}`);
  }

  if (ok.length === 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('Sync failed:', err);
  process.exitCode = 1;
});
