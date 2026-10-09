# NaijaCheck.ng

**Real Prices. Real Slang. Real Hustle.**

A daily Nigerian utility site: indicative prices across 10 cities, fuel and dollar rates, a slang and relationship decoder, hustle blueprints with real capital
ranges, GovHowTo guides, exam cut-offs, data-plan comparisons and calculators. Built with Next.js 14 (App Router, TypeScript), Tailwind and shadcn-style
components. It ships as a fully static site, so it is fast on 2G and 3G and deploys to Cloudflare Pages.

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000 (generates content first)
```

Node 18.18 or later is required. `.nvmrc` pins Node 20.

## Scripts

| Script | What it does |
| --- | --- |
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
```

## Updating data

Edit the JSON in `data/`, then run `npm run generate` (or just `npm run build`). Every generated page, table and calculator reads from those files.

The `/admin` console (password in `config/admin.ts`) lets an editor change prices, fuel and slang trend scores. Edits are saved as a draft in the browser.
Download the JSON, replace the file in `/data`, and commit. The site changes after the next build.

**Security note:** the admin password check runs in the browser, so it keeps casual visitors out, not determined ones. Put `/admin` behind
Cloudflare Access before you give anyone real editing rights.

## Deploy to Cloudflare Pages

1. Push this repository to GitHub.
2. In Cloudflare, go to **Workers & Pages → Create → Pages → Connect to Git**, and select the repo.
3. Use these build settings:
   - **Framework preset:** None (or Next.js (Static HTML Export))
   - **Build command:** `npm run build`
   - **Build output directory:** `out`
4. Add an environment variable **`NODE_VERSION`** = `20`.
5. Optional: add **`NEXT_PUBLIC_ADSENSE_CLIENT`** = `ca-pub-XXXXXXXXXXXXXXXX` once your AdSense account is approved. The ad slots switch to Google units
   and the AdSense script loads.
6. Attach your domain `naijacheck.ng` under **Custom domains**. Set the same value in `config/site.ts` if you change it.

`public/_headers` sets the security headers and cache rules. `out/sitemap.xml` and `out/robots.txt` are generated at build time.

## Content status

Prices, fuel, rates, telecom and exam figures are **indicative** and dated (October 2026). They come from the published reports cited in `data/` and must be
checked before you rely on them. Data-plan prices conflict across sources, so every plan carries an indicative label. Blueprint costs are planning estimates.
The premium checkout is a **mock**: no money moves, and a licensed payment provider must be connected before launch.

## Licence

See `LICENSE`.
