# Phase A — FX & Fuel History as Google-friendly archive (2026-10-21)

## Deliverable: PR unmerged, zero fabricated history points

Branch: `arena/ea29f3ab-naijacheck` (from `5276fad`)
Audit: `npm test` ✅ · `npm run build` ✅ · `node scripts/audit-static.mjs` ✅ (exit 0)
Sitemap: 147 URLs (was 145) — every indexable page in sitemap, no noindex in sitemap, no broken links, unique titles/descriptions.
No merge, no DNS change, no claim that naijacheck.ng is live (canonical still naijacheck.ng as committed, served via workers.dev in production).

---

## 1) New & changed routes (every new/changed route listed)

### New indexable hubs (2 new pages, both in sitemap)

| Route | Title (unique) | Meta description (unique, Nigeria-focused, honest) | Purpose |
|---|---|---|---|
| `/rates` | Naira to Dollar History & Rates in Nigeria — CBN Official vs Parallel Market | Nigeria's naira to dollar history: CBN official NFEM vs parallel (black market) buy quote. Every stored reading explained, source-dated, no interpolation. Real gaps kept. How often checked, what is stored, what is not. | FX history hub: explains official ≠ parallel, links to each FX chart page, states what is stored/not, how we source/how often checked with link to /status, related internal links, no fake “complete from 1999”. |
| `/rates/history` | Naira to Dollar History Archive — All Stored CBN & Parallel FX Readings (Nigeria) | Complete archive of stored naira to dollar readings: CBN official NFEM and parallel buy quote in NGN per US$, with WAT time, source and state for every point. Only real monitor readings — no interpolation. | FX archive table: every stored FX reading newest-first with ChartPointsTable for both datasets, retention honesty, depot vs pump separation. |

### Upgraded hub (existing path, strengthened)

| Route | Before | After |
|---|---|---|
| `/prices/fuel` | Had pump + depot tables + 2 compact charts + links to depot charts. No explicit “how we source / how often”, no full stored-readings tables, no FAQ, no JSON-LD FAQ, no fuel-specific retention doc. | Keeps ArticleView wrapper (existing metaTitle/metaDescription remain unique) but adds: intro “depot ≠ pump”, full stored-readings tables for petrol/diesel/LPG (ChartPointsTable per dataset), “How we source fuel, how often we check & retention” with links to /status, links to /rates FX hub, FAQ (depot≠pump, why separate axes, why 7D/30D disabled, how sourced), and accurate WebPage + FAQPage JSON-LD with temporalCoverage from real points. Still no fake “complete from 1999”. |

### Series archive pages — strengthened (5 existing chart pages, meta + FAQ + hub cross-links)

| Slug | New h1 | New metaTitle | New metaDescription (targets intents) | Added |
|---|---|---|---|---|
| `/charts/parallel-usd-buy` | Naira to dollar history — parallel market buy rate chart (Nigeria) | Naira to dollar history — parallel market buy rate chart Nigeria (Aboki Forex) | Parallel market USD buy rate history in naira per dollar: every stored Aboki Forex reading, no interpolation, real gaps kept. Not a CBN rate. Nigeria-focused archive. | FAQ block (why 7D/30D disabled, gaps, change badge, older history, where to check cadence), hub cross-links (/rates, /rates/history, /prices/fuel, /charts, /status), accurate Dataset + FAQPage JSON-LD with temporalCoverage. Chart behaviour unchanged (TradingView-style scrub / crosshair, real-points-only windows, table). |
| `/charts/cbn-usd` | CBN official dollar to naira history — NFEM closing rate chart | CBN dollar to naira history — official NFEM closing rate chart Nigeria | Official CBN NFEM USD to naira history chart: stored closing readings in NGN per US$ from the CBN site, source-dated, never mixed with parallel-market values. | Same |
| `/charts/depot-petrol` | Depot petrol price history Nigeria — wholesale PMS median chart (gantry, not pump) | Depot petrol price history Nigeria — wholesale PMS median chart (gantry) | Depot petrol price history in Nigeria: wholesale PMS median per litre from stored Awajis/petroleumprice.ng readings only. Gantry prices, not station pump prices. | Same |
| `/charts/depot-diesel` | Diesel depot price history Nigeria — wholesale AGO median chart | Diesel depot price history Nigeria — wholesale AGO median chart | Diesel depot price history in Nigeria: wholesale AGO median per litre from stored monitor readings only. Gantry prices, not pump prices, gaps left visible. | Same |
| `/charts/depot-lpg` | Cooking gas depot price history Nigeria — wholesale LPG median chart (per kg) | Cooking gas depot price history Nigeria — wholesale LPG median per kg chart | Cooking gas depot price history in Nigeria: wholesale LPG median per kilogram from stored Awajis readings. LPG is priced per kg, never mixed into per-litre chart. | Same |

All 5 keep: TradingView-style scrub / crosshair from current charts, timeframes only over real points (7D/30D/ALL honesty unchanged, disabled copy when <2 points), visible table of stored points (time WAT, value, source/state via ChartPointsTable), JSON-LD only if accurate (Dataset with temporalCoverage from earliest/latest real sourceTime, FAQPage only with true answers — no fake price validity periods).

### Other changed routes

| Route | Change |
|---|---|
| `/` (homepage) | Added modest non-ugly “FX & fuel history — every stored reading, honest gaps” section with text links to /rates, /rates/history, /prices/fuel, /charts and direct links to each of the 5 chart pages + /status. Satisfies “at least one clear path to rates/fuel history hubs”. |
| `/status` | Added cross-links to FX & fuel hubs: inline sentence “For the full hubs … /rates · /rates/history · /prices/fuel” in history intro, plus bordered “More history” box linking to /rates, /prices/fuel and individual charts. Satisfies “From /status and chart pages: cross-links between FX and fuel history hubs”. |
| `/charts` | Title/desc upgraded for SEO (naira to dollar history chart, depot fuel price history nigeria, etc.), plus new “History hubs — the honest archives” box linking to /rates, /rates/history, /prices/fuel, /status with retention one-liner. |
| `/rates` & `/rates/history` & `/charts/*` & `/prices/fuel` | Added Breadcrumbs + JsonLd breadcrumbSchema + WebPage/CollectionPage/Dataset + FAQPage where appropriate, all with accurate temporalCoverage from real points only. |
| `app/sitemap.ts` | Now lists /rates and /rates/history with liveDate-based lastModified (hubLastmod = max of FX datasets’ latest observedAt, so sitemap agrees with page). /prices/fuel already covered via generated articles. |
| `lib/chart-pages.ts` | Strong unique titles/descriptions aiming at intents: “naira to dollar history”, “parallel market rate chart Nigeria”, “depot petrol price history Nigeria” etc. No two titles/descriptions duplicate; audit confirms 0 duplicates. |

No new verticals, no postal/bank/LGA/exam changes, no AdSense, no mass URL spam (only 2 new indexable hubs, each with clear purpose and enough real content: intro + chart/table + sources + related links + FAQ).

---

## 2) Retention policy (Phase A)

- **Current cap kept: `MAX_HISTORY_POINTS_PER_DATASET = 56`** in `lib/history.ts` (and mirrored in `scripts/monitor/parsers.ts` for the monitor). This is the rolling window: newest replaces oldest per dataset.
- **What it means:** At ~4–8 attempted checks per day (3-hour cadence, duplicates ignored), 56 points ≈ 7–14 days per dataset. Parallel USD currently 50/56, depot medians 39–42/56, CBN 9/56 (less frequent). Archive start `collectionStartedAt: 2026-10-09T21:30:37.656Z` in `data/history.json` — total 182 points today.
- **Storage impact if we had increased modestly:** Each HistoryPoint ≈ 190 bytes JSON; 5 datasets × 56 = 280 points ≈ 53 KB; 5 × 180 = 900 points ≈ 171 KB. Both fit easily in Workers Static Assets (25 MB limit) and Git — zero-cost file/export history already used, no paid DB/KV. We deliberately did NOT increase this PR to keep risk low and to keep existing `monitor:test` assertions stable (they insert 60 parallel points and expect 4 trimmed at 56). Documentation instead fulfills the requirement: keep 56 and say so honestly.
- **How hubs say so:** Every hub and every chart page states “Retention keeps the most recent 56 verified observations… rolling window… Archive grows as the monitor records real checks” and “Archive from 2026-10-09, no backfill”. No “complete from 1999” claim.
- **Never backfill fake older points:** Only `appendBoundedHistory` with `isValidHistoryPoint` + dedup (same sourceTime+value ignored, out-of-order older sourceTime ignored) can append. No scraping of random blogs. Every plotted point is a real check in `data/history.json` or a future legitimate monitor append.

---

## 3) What was NOT done (explicit non-goals, honoured)

- ❌ No `/rates/2015-06-01` pages unless that day exists as a real stored observation — none created. Only hubs + 5 chart pages.
- ❌ No scraping of random blogs for “historical black market” — no scraper added, monitor sources unchanged (CBN, Aboki, Awajis, News RSS, Wiki).
- ❌ No mass empty-date URL spam — only 2 new indexable URLs, each with intro + chart/table + sources + FAQ + related links (not thin doorway pages).
- ❌ No fabricated history points, no interpolation, no backfill, no seeded/manual labelled as live (all badges come from `lib/source-registry.ts` verification state).
- ❌ No AdSense, no new verticals, no postal/bank/LGA/exam changes.
- ❌ No merge, no DNS/domain change, no “naijacheck.ng is live” claim — still `https://naijacheck.ng` canonical committed, served via `workers.dev` until owner buys domain.
- ❌ No paid APIs/datadumps — cash budget ₦0.

---

## 4) Hub completeness checklist (each hub must include)

| Requirement | /rates | /rates/history | /prices/fuel |
|---|---|---|---|
| Unique title + meta (Nigeria-focused, honest) | ✅ Naira to Dollar History & Rates… | ✅ Naira to Dollar History Archive… | ✅ Existing article meta kept + own WebPage title via JsonLd |
| Short human intro (why official≠parallel; depot≠pump) | ✅ “Why official ≠ parallel — and why we keep them separate” | ✅ Archive intro + depot≠pump note | ✅ “depot ≠ pump” explainer + depot-vs-pump sections |
| Links to full chart pages | ✅ Cards + list for 2 FX series + combined chart | ✅ Tables + cards linking to both FX charts | ✅ FuelHistorySection/LpgHistorySection + table + links to 3 fuel charts |
| “How we source / how often we check” with link to /status | ✅ “How we source & how to verify” + “What is stored, retention & storage impact” both link /status | ✅ “How this archive is built” links /status + /rates | ✅ “How we source fuel, how often we check & retention” links /status |
| Related internal links (status, relevant howto if any) | ✅ status, charts, fuel hub, howto, about | ✅ status, rates, charts, fuel hub | ✅ rates, rates/history, status, generator-diesel, tools/generator, depot charts |
| No fake “complete from 1999” claim | ✅ States “No reading before 2026-10-09 is claimed” | ✅ Same | ✅ Same |

---

## 5) Series-archive completeness (per chart page)

- ✅ Strong unique title/description per intent (see table above)
- ✅ TradingView-style scrub / crosshair kept (HistoryChart unchanged)
- ✅ Timeframes only over real points — 7D/30D/ALL with honest disabled copy (shared in `lib/history.ts`, UI in `components/live/history-chart.tsx`)
- ✅ Visible table of stored points (ChartPointsTable: WAT time, value, change, source, state)
- ✅ FAQ block only with true answers (why 30D disabled → not enough points, why gap → missing reading, change badge — no prior, older history → 2026-10-09 start, where to see cadence → /status)
- ✅ JSON-LD only if accurate: WebPage/Dataset with temporalCoverage `${earliest.sourceTime}/${latest.sourceTime}` from real points, FAQPage with 3 true Q/A, BreadcrumbList — no fake price validity periods.

---

## 6) Internal linking

- Homepage: new “FX & fuel history” section with 4 pill links (FX hub, FX archive, fuel hub, all charts) + 5 direct chart links + /status. Lightweight, not a full category grid.
- /status → /rates · /rates/history · /prices/fuel + individual charts (history intro + “More history” box)
- Chart pages → /rates · /rates/history · /prices/fuel (hub-links box + FAQ “Where do I see how often”)
- /charts → /rates · /rates/history · /prices/fuel + /status
- /rates → /charts/* FX + fuel charts, /rates/history, /prices/fuel, /status, /charts
- /rates/history → /rates, /charts/*, /prices/fuel, /status (and vice versa)
- /prices/fuel → /rates, /rates/history, /status, depot charts

All links verified via `audit:static` — 0 brokenInternalLinks.

---

## 7) Sitemap & audit

- `app/sitemap.ts` now emits 147 URLs (was 145): fixed (7 → includes /rates, /rates/history) + charts (6) + generated articles (~134). LastModified for hubs = newest FX observation (honest, not build clock). Chart pages already honest. `audit:static` passes: sitemapMissing 0, indexedNotInSitemap 0, noindexInSitemap 0, wrongCanonicalHost 0, duplicateTitles 0, duplicateDescriptions 0, invalidJsonLd 0.
- Smoke (sample built HTML): /rates, /rates/history, /charts/parallel-usd-buy, /charts/depot-petrol, /status, /api/push/config all serve (static HTML except API which is Worker dynamic; `/api/*` correctly disallowed in robots and no-store — audit `robots.ok` ✅).

---

## 8) Zero fabricated points proof

- Source of truth: `data/history.json` — 182 points today, 5 datasets, collectionStartedAt 2026-10-09. Every chart/table/hub calls `datasetHistoryPoints(dataset)` → `getDatasetHistory(LIVE_HISTORY, dataset)` which filters `LIVE_HISTORY.points` by dataset and `isValidHistoryPoint`. No page invents a point.
- Monitor gate: `appendBoundedHistory` rejects invalid, ≤0, non-date, duplicate sourceTime+value, older sourceTime. Tested in `npm run monitor:test` (“Bounded history appends only real observations…”).
- Chart helpers: `filterHistoryWindow`, `summarizeHistorySeries`, `historySeriesDomain`, `projectHistorySeries` never interpolate — they map real sourceTime/value to x/y; singleInstant flat handling still uses real points. Tested in `chart:test` + `monitor:test`.
- Seed staleness: `lib/source-registry.ts` computes `stateLabel` from live health + age; hubs show badge from registry, never relabel seeded as live.
- Evidence: `grep -r "2015" app/rates` → no hit; `grep -r "1999"` → only “No ‘complete from 1999’ claim” disclaimer.

---

## 9) Commands to verify locally

```bash
npm ci
npm run typecheck && npm run lint
npm test                         # all 14 suites (site, share, quiz, govhowto, images, hero, headline, monitor, chart, chartui, navfeedback, push, telegram, nbs)
npm run build
node scripts/audit-static.mjs /tmp/audit.json  # must exit 0
python3 -c "import json; print(json.load(open('/tmp/audit.json'))['sitemapUrls'], json.load(open('/tmp/audit.json'))['missing'])"
# smoke
grep -o "<title>.*</title>" out/rates.html
grep -o "<title>.*</title>" out/charts/parallel-usd-buy.html
ls out/rates.html out/rates/history.html out/charts/parallel-usd-buy.html out/charts/depot-petrol.html out/status.html
curl -sS http://localhost:3000/api/push/config # or check worker dev
```

---

## 10) Owner next steps (not in this PR)

- No DNS change needed for indexing drills: add URL-prefix property for `https://naijacheck.nnamdimichael020.workers.dev` in Search Console, submit `sitemap.xml`, request indexing for `/rates`, `/rates/history`, `/prices/fuel`, key `/charts/*`.
- When `.ng` domain bought: add Domain property, DNS TXT verification, resubmit sitemap — no code change (canonical already `https://naijacheck.ng`).

PR unmerged as required. No push to main.
