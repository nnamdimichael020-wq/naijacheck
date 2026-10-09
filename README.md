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

Node 18.18 or later is required. `.nvmrc` pins Node 20.

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
  trends/                Hub with simulated X/TikTok monitor, [slug] slang and relationship pages
  hustle/                Hub with blueprint matcher and mock premium checkout, [slug] blueprints and combos
  howto/  exam/  telecom/  learn/
  tools/                 Hub, generator, solar, cookbook, cookbook/[slug]
  admin/                 Editor console (password gate, noindex)
  about/  privacy/       Static pages (privacy under NDPA 2023)
  not-found.tsx          404 page
  sitemap.ts  robots.ts  Generated from the article list
config/
  site.ts                SITE_CONFIG (name, domain, url, description) and constants
  admin.ts               Admin password (client-side gate)
components/
  ads/                   AdSlot (labelled sponsor cards, or AdSense when configured)
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

The `/admin` console (password in `config/admin.ts`) lets an editor change prices, fuel and slang trend scores. Edits are saved as a draft in the browser.
Download the JSON, replace the file in `/data`, and commit. The site changes after the next build.

**Security note:** the admin password check runs in the browser, so it keeps casual visitors out, not determined ones. Put `/admin` behind
Cloudflare Access before you give anyone real editing rights.

## Deploy to Cloudflare Workers

This repository is configured as a **Worker with Static Assets**, not as a Cloudflare Pages project. The Workers dashboard deployment must run
`npx wrangler deploy`; the checked-in `wrangler.jsonc` points the Worker at the exported `out/` directory and routes `/api/*` through `worker/index.ts`.

1. Connect this GitHub repository under **Workers & Pages → Workers Builds** (or use the existing `naijacheck` Worker).
2. Set the production branch to `main` and the root directory to `/`.
3. Use these build settings:
   - **Build command:** `npm run build`
   - **Deploy command:** `npx wrangler deploy`
   - **Node.js version:** `20` (Wrangler is pinned to a Node 20-compatible release).
4. Cloudflare Workers Builds must provide its normal deployment credentials; do not add API tokens to the repository.
5. Optional: add **`NEXT_PUBLIC_ADSENSE_CLIENT`** = `ca-pub-XXXXXXXXXXXXXXXX` once your AdSense account is approved. The ad slots switch to Google units
   and the AdSense script loads.
6. Attach `naijacheck.ng` to the deployed Worker in **Custom domains**. Set the same value in `config/site.ts` if you change it.

`public/_headers` sets response headers and cache rules for static assets. Next.js generates `out/sitemap.xml` and `out/robots.txt` at build time.

## Live data

Everything that can be read from a public source is refreshed automatically.

| Data | Source | Refresh |
| --- | --- | --- |
| Official USD (NFEM) | CBN exchange-rate table | every 3 hours |
| Black market USD, GBP, EUR | Aboki Forex (buy and sell) | every 3 hours |
| Reference GBP and EUR | open.er-api.com | every 3 hours |
| Fuel depot medians and depot tables | Awajis, sourced from petroleumprice.ng | every 3 hours |
| Headlines per topic | Google News RSS | every 3 hours |
| Trend counts | Google News mentions (7 days) and Wikipedia pageviews | every 3 hours |
| Official page changes (JAMB, NIMC, Immigration, CBN) | fingerprint of visible text | every 3 hours, flagged for review |

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

## Licence

See `LICENSE`.
