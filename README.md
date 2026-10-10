# NaijaCheck.ng

**Real Prices. Real Slang. Real Hustle.**

A daily Nigerian utility site: indicative prices across 10 cities, fuel and dollar rates, a slang and relationship decoder, hustle blueprints with real capital
ranges, GovHowTo guides, exam cut-offs, data-plan comparisons and calculators. Built with Next.js 14 (App Router, TypeScript), Tailwind and shadcn-style
components. It ships as a fully static site, so it is fast on 2G and 3G. Cloudflare Workers Static Assets serves the export, with a small Worker endpoint for visitor location.

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000 (generates content first)
```

Node 20.9 or later is required. `.nvmrc` pins Node 20 to match the configured Cloudflare build runtime.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run monitor` | Fetches every live source and writes `data/live/*.json` (see Live data). |
| `npm run monitor:test` | Parser tests against captured source responses. |
| `npm run generate` | Runs `scripts/generate-content.ts`. Builds 205 long-form article pages into `content/generated/articles.json` and `public/search-index.json`. |
| `npm run dev` | Regenerates content, then starts the dev server on 0.0.0.0:3000. |
| `npm run build` | Regenerates content, then exports the static site to `out/`. |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm run lint` | `next lint`. |

## Project structure

```
app/                     Routes (App Router). Dynamic routes use generateStaticParams.
  page.tsx               Homepage dashboard
  prices/                Hub, [city], [city]/[item], markets/[slug], fuel, generator-diesel, cost-of-living
  trends/                Public news/Wikipedia attention signals (not X/TikTok), [slug] slang and relationship pages
  hustle/                Hub with blueprint matcher and mock premium checkout, [slug] blueprints and combos
  howto/  exam/  telecom/  learn/
  tools/                 Hub, generator, solar, cookbook, cookbook/[slug]
  admin/                 Disabled public admin notice (noindex; no client-side security claim)
  about/  privacy/       Static pages (privacy under NDPA 2023)
  not-found.tsx          404 page
  sitemap.ts  robots.ts  Generated from the article list
config/
  site.ts                SITE_CONFIG (name, domain, url, description) and constants
  admin.ts               Retired client-side gate (empty; do not use for authentication)
components/
  ads/                   AdSlot (internal related links; AdSense only after approved configuration)
  calc/                  Cost of living, generator, solar, cookbook calculators
  hustle/  trends/  admin/  prices/
  site-header.tsx  bottom-nav.tsx  site-footer.tsx  site-sidebar.tsx  search-bar.tsx
  article-view.tsx       Renders a generated article with JSON-LD
  ui/                    Button, Card, Badge, Input, Select, Label, Sheet
data/                    Source JSON: cities, markets, prices, fuel, rates, slang, blueprints,
                         govhowto, exam, telecom, recipes, learn, sponsors
lib/                     data.ts (pricing maths), articles.ts, seo.ts (metadata and schema),
                         hustle.ts (matcher), cookbook.ts, nav.ts, types.ts
scripts/generate-content.ts   Builds every long-form page from /data
content/generated/       Generated articles.json (committed, so builds never depend on the generator)
public/                  Static assets, search-index.json, _headers (Cloudflare security headers)
worker/index.ts          Worker API endpoint for /api/geo
wrangler.jsonc           Cloudflare Workers Static Assets deployment configuration
```

## Updating data

Edit the JSON in `data/`, then run `npm run generate` (or just `npm run build`). Every generated page, table and calculator reads from those files.

The public `/admin` route is disabled. A client-side password is not authentication because its value and all browser-delivered data are readable. Edit JSON through a reviewed Git branch until a server-side editor is protected by Cloudflare Access or equivalent authentication. No submission queue exists, and community reports must not be collected through `/admin`.

## Deploy to Cloudflare Workers

This repository is configured as a **Worker with Static Assets**, not as a Cloudflare Pages project. The Workers dashboard deployment must run
`npx wrangler deploy`; the checked-in `wrangler.jsonc` points the Worker at the exported `out/` directory and routes `/api/*` through `worker/index.ts`.

1. Connect this GitHub repository under **Workers & Pages → Workers Builds** (or use the existing `naijacheck` Worker).
2. Set the production branch to `main` and the root directory to `/`.
3. Use these build settings:
   - **Build command:** `npm run build`
   - **Deploy command:** `npx wrangler deploy`
   - **Node.js version:** `20` (the deployment-compatible Wrangler release is pinned until the owner upgrades the Cloudflare build runtime).
4. Cloudflare Workers Builds must provide its normal deployment credentials; do not add API tokens to the repository.
5. Optional: add **`NEXT_PUBLIC_ADSENSE_CLIENT`** = `ca-pub-XXXXXXXXXXXXXXXX` once your AdSense account is approved. The ad slots switch to Google units
   and the AdSense script loads.
6. Production currently remains on the existing Workers deployment. Do not change DNS, Worker routes/attachment, or `SITE_CONFIG` as part of non-domain maintenance. Domain and canonical decisions require a separate owner-approved change.

`public/_headers` sets response headers and cache rules for static assets. Next.js generates `out/sitemap.xml` and `out/robots.txt` at build time.

## Live data

The monitor attempts only configured public sources. A three-hour schedule is an attempt cadence, not a freshness guarantee: upstream publication and Worker build/deployment can add delay. Every snapshot has a source/effective time and a separate check state on `/status`.

| Data | Source | Refresh |
| --- | --- | --- |
| Official USD (NFEM) | CBN exchange-rate table | attempted every 3 hours; stale after 36h in registry |
| Indicative parallel-market buy/sell quote | Aboki Forex | attempted every 3 hours; separate from CBN |
| Reference GBP and EUR cross-rates | open.er-api.com | attempted every 3 hours; not CBN quotes |
| Wholesale fuel depot medians/tables | Awajis, attributed to petroleumprice.ng | attempted every 3 hours; never retail pump prices |
| Headlines per topic | Google News RSS | attempted every 3 hours; headline links are not fact verification |
| Attention signals | Google News mentions (7 days) and Wikimedia pageviews | attempted every 3 hours; not X/TikTok trends |
| Official page changes (JAMB, NIMC, Immigration, CBN) | fingerprint of visible text | attempted every 3 hours; human review required |

`npm run monitor` runs all sources and writes `data/live/*.json`. It also updates `data/rates.json`, `data/fuel.json` and `data/slang.json`,
which the pages already read. `npm run monitor:test` runs the parser tests against captured responses. A source that fails or changes layout keeps its
last confirmed value and is marked on `/status`. Nothing is guessed.

The workflow `.github/workflows/live-monitor.yml` runs on a 3-hour schedule. It commits changed data, and Cloudflare Workers Builds rebuilds and deploys from that commit.
Scheduled runs only start from the default branch, so merge to `main` before relying on the schedule.

Still not auto-read: food basket prices by city, state pump prices, telecom bundles, and official fees and cut-offs (the page watch flags changes, but
a person confirms the figure). `/status` lists these.

**Location:** `worker/index.ts` serves `/api/geo` from the Cloudflare edge and returns the visitor's country, region, city and timezone. The homepage
uses it to show prices for the visitor's state. Visitors can change their state, and the choice stays on their device. The location response is private
and not cached.

**Trends:** the trend board reads news and Wikipedia. X and TikTok are not read, because that needs a paid API.

## Cloudflare Workers notes

- `wrangler.jsonc` binds the static export in `out/` as `ASSETS`; `/api/*` requests run through `worker/index.ts`.
- The Pages-only `functions/` convention is not used by this Worker deployment.
- `npm run dev` starts the Next.js app, not Wrangler, so the location card falls back to device timezone if `/api/geo` is unavailable during development.
- To test the deployed asset/Worker combination locally after building, run `npx wrangler dev`.

## Trust, history, offline and privacy runbook

- `lib/source-registry.ts` is the typed registry for monitored datasets. Add geography, product type/unit, source and method, source time, check time, cadence, stale threshold and limitation before displaying a new changing reading.
- UTC ISO strings are stored in data. Visitor-facing source times are formatted in WAT; never substitute build time for source/effective time.
- The monitor preserves last-good snapshots. It exits non-zero if every configured source group fails, while individual failures remain visible in `data/live/health.json`.
- `data/history.json` starts empty. Only successful observations are appended; unchanged values are deduplicated and the file is capped at 400 points. Do not backfill without a cited historical source.
- Food/city estimates, retail pump prices, telecom bundles, fees and cut-offs are manual/indicative. A page fingerprint is only a review flag.
- The service worker caches the offline shell and previously visited same-origin pages/assets. `/api/*` is never cached. Offline UI explicitly labels saved changing figures as potentially stale.
- Current browser storage: theme, chosen state, mock-premium flag, editor draft from legacy code if one already exists, and service-worker caches. Calculators/search run locally. No analytics, newsletter, web push, submissions or advertising network is enabled.
- Web push and community submissions remain deferred: there is no authenticated moderator, consent/subscriber store, VAPID secret deployment or abuse-control path. Never call an in-page poll “push.”
- `/admin` is intentionally unavailable. Do not restore a client-side password. Use server-side authentication/Cloudflare Access before handling moderation data.

## Search Console setup (owner action)

1. Do not change `config/site.ts`, DNS, Worker routes/attachment, canonicals, Open Graph URLs, robots or sitemap without separate owner approval. This non-domain work deliberately preserves the main-branch domain configuration and existing production host.
2. Once the owner separately confirms the intended canonical host, add the matching **URL-prefix property** in Google Search Console. Complete one of Google's offered verification methods; do not commit a private verification credential.
3. Submit the sitemap on that same confirmed host, then inspect a sample of hubs and detail pages. Search Console discovery/indexing is not guaranteed and has no promised timeline.
4. If a host migration is approved later, verify ownership, DNS, HTTPS, Worker attachment and redirects before changing `SITE_CONFIG`; avoid serving two indexable canonical hosts.

## Release checks

Run `npm ci`, `npm run typecheck`, `npm run lint`, `npm run monitor:test`, `npm run build`, `npm run audit:static -- /tmp/audit.json`, and `npx wrangler deploy --dry-run`. Then use `npx wrangler dev --local --ip 0.0.0.0` to smoke-test `/`, `/status`, `/api/geo`, an unknown `/api/*`, and a missing static route. Browser-only keyboard, install/offline and Web Share behavior must be tested in a real browser before deployment; a successful static build is not that test.

## Licence

See `LICENSE`.
