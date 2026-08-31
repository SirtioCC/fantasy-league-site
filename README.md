# Gridiron Gauntlet — Fantasy Football Stats & Analysis

A stats and analytics site for a private 12-team ESPN Fantasy Football league:
all-time standings, power rankings, "luck" ratings, head-to-head history,
best/worst seasons, and owner profiles — built on top of your league's full
ESPN history.

> The name "Gridiron Gauntlet" and the 🏆 emoji logo are placeholders. See
> [Rebranding](#rebranding) below to swap in your own league name/logo.

## Tech stack

- **Next.js 16 (App Router) + TypeScript + React 19** — a full-stack React
  framework that deploys cleanly to Vercel (or Netlify), with server
  components for data-heavy pages and API routes for the sync endpoints.
- **SQLite via `better-sqlite3`** — the local cache. It's a single file, zero
  ops, synchronous (simple code, no async ceremony for a read-mostly
  dashboard), and fast enough for a league of this size. On Vercel this file
  lives in the function's ephemeral filesystem, which is why the cron sync
  re-populates it on every run (see [Deploying](#deploying-to-vercel)).
- **Tailwind CSS v4** for styling, **Recharts** for the charts.
- **tsx** to run the TypeScript sync script directly from the CLI.

## Project structure

```
src/
  app/                  Pages (App Router) + API routes
    api/sync/route.ts       Manual "refresh now" endpoint
    api/cron/sync/route.ts  Weekly automatic sync endpoint (Vercel Cron)
    page.tsx                Dashboard
    standings/               All-time standings & record book
    power-rankings/          Weekly + season power rankings
    luck/                    Luck ratings, schedule strength, scatter plot
    best-worst/               Best/worst seasons, consistency, boom/bust
    head-to-head/             All-time matrix + rivalry lookup
    teams/[ownerId]/          Owner profile pages
  components/            Shared UI + chart components (Recharts)
  lib/
    env.ts                  Env var loading/validation
    branding.ts              League name/tagline — edit this to rebrand
    db/                      SQLite connection, schema, typed queries
    espn/                    ESPN API client + sync orchestrator
    analytics/                All the stats math (records, luck, power
                               rankings, head-to-head, consistency, etc.)
scripts/sync.ts           CLI entry point for the manual sync
data/league.db             The local SQLite cache (gitignored, generated)
```

## 1. Setup

```bash
npm install
cp .env.example .env
```

Then fill in `.env`:

```
ESPN_S2=...
ESPN_SWID=...
LEAGUE_ID=...
```

### Finding your ESPN cookies

Your league is private, so the ESPN API needs two cookies from a browser
session that's logged into ESPN and a member of the league:

1. Go to [fantasy.espn.com](https://fantasy.espn.com) and log in, then open
   your league.
2. Open your browser's DevTools (F12, or right-click → Inspect) and go to the
   **Application** tab in Chrome/Edge (**Storage** tab in Firefox).
3. In the left sidebar, expand **Cookies** and click on
   `https://fantasy.espn.com`.
4. Find the row named **`espn_s2`** — copy its **Value** exactly (it's a long
   string with `%2F`, `%3D`, etc.). Paste it as `ESPN_S2` in `.env`.
5. Find the row named **`SWID`** — copy its **Value**, including the curly
   braces, e.g. `{ABCD1234-5678-...}`. Paste it as `ESPN_SWID` in `.env`.

These cookies expire periodically (ESPN sessions typically last a while, but
not forever) — if the sync script starts failing with an auth error, just
repeat these steps to grab fresh values.

### Finding your League ID

It's the `leagueId` query parameter in your league's URL, e.g.:

```
https://fantasy.espn.com/football/league?leagueId=123456
                                                    ^^^^^^
```

Put that number in `LEAGUE_ID`.

## 2. Sync your league's data

Before running the site, pull your league's history into the local SQLite
cache:

```bash
npm run sync
```

This will:

- Auto-detect how far back your league's ESPN data goes, by probing
  backwards from the current season until ESPN stops returning data (you can
  also force a lower bound with `LEAGUE_START_YEAR` in `.env` if you know it).
- Pull, for every season found: teams & owners, standings, every week's
  matchups/scores, playoff results, draft results, and waiver/free-agent
  transactions.
- Cache everything in `data/league.db` (created automatically, gitignored).

To re-sync just one season (e.g. to pick up this week's new scores without
re-pulling everything):

```bash
npm run sync -- --season 2025
```

Re-running `npm run sync` any time is safe — it's a full upsert, not an
append, so it won't create duplicates.

## 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). If you haven't synced
yet, every page shows a "no data yet" prompt with a **Refresh data** button
(and the CLI command) instead of erroring.

## 4. Keeping data current

There are two ways to refresh data, and they serve different purposes:

- **Manual, local**: `npm run sync` (or the **Refresh data** button in the
  nav bar, which calls `POST /api/sync`). Use this any time — locally or in
  production.
- **Automatic, weekly, once deployed**: a Vercel Cron job (configured in
  `vercel.json`) hits `GET /api/cron/sync` every **Tuesday at 10:00 UTC**
  (after Monday Night Football has finished), which re-syncs every season —
  cheap for already-completed past seasons, and picks up the current week's
  scores/standings for the in-progress season.

**The cron job only runs once the site is deployed to Vercel** — Vercel Cron
is a platform feature of the hosted deployment, it does not run during local
`npm run dev`. Locally, use the manual sync command/button whenever you want
fresh data.

If you set `CRON_SECRET` in your environment, both the cron endpoint and the
manual `/api/sync` endpoint require it (Vercel automatically sends
`Authorization: Bearer $CRON_SECRET` to cron routes; the manual endpoint
accepts it as an `x-sync-secret` header or `?secret=` query param). Leave
`CRON_SECRET` unset for local dev if you don't want to bother with it.

## 5. Deploying to Vercel

1. Push this repo to GitHub (or GitLab/Bitbucket).
2. Import it in [Vercel](https://vercel.com/new).
3. Add the environment variables from your `.env` file
   (`ESPN_S2`, `ESPN_SWID`, `LEAGUE_ID`, and optionally `LEAGUE_START_YEAR`,
   `CRON_SECRET`, `NEXT_PUBLIC_LEAGUE_NAME`) in the Vercel project settings.
4. Deploy. `vercel.json` already declares the weekly cron job — Vercel picks
   it up automatically, no extra configuration needed.
5. After the first deploy, trigger an initial sync so the site isn't empty:
   hit **Refresh data** in the nav, or `curl -X POST https://your-app.vercel.app/api/sync`
   (add `?secret=...` if you set `CRON_SECRET`).

**Note on SQLite on Vercel:** Vercel's serverless functions have an
ephemeral, ready-only-outside-`/tmp` filesystem — anything written to
`data/league.db` during a request does **not** persist between deploys or
across different function instances. That's fine for this project because
the weekly cron sync (and the manual refresh button) always re-populate it
from ESPN, but it does mean each new function instance starts with an empty
cache until the next sync runs. If you outgrow this (e.g. you want the site
to always be instantly populated without waiting on a cron run, or you want
sync history to persist), swap `DATABASE_PATH` to point at a Vercel-attached
storage volume, or migrate the schema in `src/lib/db/schema.ts` to a hosted
Postgres database (e.g. Vercel Postgres/Neon) — the query layer in
`src/lib/db/queries.ts` is the only place that would need rewriting.

### Deploying to Netlify instead

The app is a standard Next.js App Router project, so `@netlify/plugin-nextjs`
works out of the box. Netlify doesn't read `vercel.json`, though — recreate
the weekly sync as a
[Netlify Scheduled Function](https://docs.netlify.com/functions/scheduled-functions/)
that calls `GET /api/cron/sync` (or reimplement the route as a Netlify
Function directly), since Netlify's cron trigger mechanism is Netlify-specific.

## Rebranding

Two places to edit:

- `src/lib/branding.ts` — league display name, tagline, and emoji logo (or
  swap the emoji for a real `<Image>` if you have a logo file).
- `src/app/globals.css` — the `--brand`, `--accent`, `--accent-warm`, and
  `--gold` CSS variables (light and dark mode) control the color palette used
  throughout the UI and charts.

You can also override the league name at runtime with
`NEXT_PUBLIC_LEAGUE_NAME` in `.env` without touching code.

## How the analytics work

- **Power rankings** — a composite 0–100 score per team, blending (with
  min-max normalization each week) win percentage (35%), season scoring
  average (35%), recent form over the last 3 games (20%), and strength of
  schedule faced so far (10%). Recomputed for every week of the season so you
  can see the trend line, not just a single snapshot.
- **Luck rating** — each week, a team's "expected wins" contribution is the
  fraction of the other teams in the league they outscored that week (ties
  split evenly). Summed across the season, `luck = actual wins − expected
  wins`. Positive means they won more than their weekly scoring alone would
  predict.
- **Schedule strength/luck** — the average points-per-game of the opponents a
  team actually faced, compared to the league average points-per-game that
  season.
- **Over/underperformance** — compares a team's rank by points scored (PF)
  against their rank in the final standings; a team that finishes much better
  in the standings than their scoring would suggest is flagged as having
  overperformed (and vice versa).
- **All-time standings** are grouped by **ESPN owner account** (not team ID
  or team name), so a manager who renames their team — or whose team gets
  reassigned a new team ID by ESPN in some seasons — still has one continuous
  history.
- **Draft-based "favorite positions"**: rather than pulling every weekly
  roster (expensive, and ESPN doesn't reliably expose historical rosters for
  very old seasons), favorite positions/players are derived from each
  owner's draft history, which is available for every synced season.

## Troubleshooting

- **"ESPN rejected the request (401/403)"** — your `ESPN_S2`/`ESPN_SWID`
  cookies are missing, wrong, or expired. Re-grab them (see above).
- **A season is missing from the sync summary** — some very old leagues
  don't have full data available via ESPN's API for every view (draft detail
  and transactions are the most likely to be sparse for old seasons); the
  sync script logs a warning and continues rather than failing the whole
  season.
- **"Could not fetch any season from ESPN"** — double-check `LEAGUE_ID` is
  correct and that the ESPN account behind your cookies is actually a member
  of that league.
