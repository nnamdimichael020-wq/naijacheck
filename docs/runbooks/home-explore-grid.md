# Phase E — Homepage Explore grid / directory

Date: 2026-10-22 — branch `arena/0b618d31-naijacheck` (from `918b038` main post-Phase D).
Owner: NaijaCheck.

## Goal
A clear, mobile-first category grid on the homepage that advertises every major hub and interlinks the SEO archive + utility sides — no new thin content verticals.

## Placement decision
`Explore NaijaCheck` sits **after `Today on NaijaCheck` dashboard and before FX & fuel history**.

Rationale:
- Daily utility (DailyBriefing, LocationCard, LiveNewsFeed, Dashboard with rates/rice/slang/hustle/govhowto/exam/telecom) stays primary and above-the-fold.
- Category grid is secondary but visible without hunting — first scroll reveals it.
- Keeps existing FX/fuel and Codes sections in place (no removal), avoids pushing briefing below fold, and prevents duplication with the Tools calculator row.

Layout:
- Mobile: 2-column grid (`grid-cols-2`), `gap-3`, each tile `min-h-[112px]` (sm: 124px) with `p-3.5` — touch target well above 44px, full card is tappable (`min-h-11` link hit-area satisfied).
- Desktop: 3 columns at `md`, 4 at `lg` (`md:grid-cols-3 lg:grid-cols-4`), consistent card height, no horizontal scroll.
- Dark mode: uses semantic tokens `bg-card`, `border`, `text-primary`, `text-muted-foreground` — no hard-coded light colors, no overlap with bottom nav/push sheet (grid is in normal flow, not fixed).

## Tiles (10) — each is icon + label + one-line promise + href

All hrefs are real, indexable hubs (verified `out/*.html` exists and `audit:static` shows 0 broken links):

| # | Label | Promise | href | Badge (live) |
|---|-------|---------|------|--------------|
| 1 | Rates & FX history | Official + parallel dollar, with honest history | `/rates` | live · daily brief (static label, count not applicable) |
| 2 | Fuel price history | Depot petrol & diesel, stored readings only | `/prices/fuel` | Lagos · depot |
| 3 | Bank codes & USSD | Sort codes + *901# style USSD, copy in one tap | `/codes/banks` | `12 banks` ← `getAllBanks().length` |
| 4 | Postal / ZIP codes | 6-digit NIPOST codes by state & district | `/codes/postal` | `37 states · 77 places` ← `getAllPostalStates().length` + `postalPlaceCount()` |
| 5 | LGAs (774) | Every Local Government Area by state | `/geo` | `774 LGAs · 37 states/FCT` ← `lgaCounts()` |
| 6 | Gov how-to guides | Step-by-step: NIN, passport, CAC & more | `/howto` | `12 guides` ← `GOV_DOCS.length` |
| 7 | Tools & calculators | Generator, solar, cost-of-living + quiz | `/tools` | `5 tools · quiz` (from `app/tools/page.tsx` TOOLS) |
| 8 | Slang / trends | Decoder for the street — kelebu, japa & co | `/trends` | `20 terms · trending` ← `SLANG_TERMS.length` |
| 9 | Charts index | All price charts in one place | `/charts` | `5 charts` ← `CHART_PAGES.length` |
| 10 | Status & honesty | How we source, how often we check | `/status` | live sources |

**Badge truth:** every numeric badge pulls from the same loader that powers the destination page — single source of truth, not hard-coded. If a loader returns empty, badge is omitted (never invents).

Implementation: `components/home/explore-grid.tsx` — purely presentational, no new data vertical, no new programmatic URLs, no AdSense, no exam archive.

## /codes hub polish (light)
`/codes` already presents banks / postal / geo as equal cards under “What else lives in this Codes hub?” — counts are live (`banks.length`, `postalStates.length`/`postalPlaces`, `lgaTotal`/`lgaStateCount`) and link labels match homepage tiles. No duplicate mega-grid added; homepage grid is the canonical directory.

## Mobile reasoning (screenshot description)
On a 375×812 viewport the grid renders as 2 columns × 5 rows. Cards have `rounded-xl`, `9×9` icon pill (`bg-primary/10`), truncated badge pill on top-right, then label + promise + “Open →” affordance. No text overlap, no fixed footer collision, dark-mode contrast passes (icon pill inverts to `bg-primary` on hover/focus only).

## Verify
```
npm run typecheck   # 0 errors (2 pre-existing warnings in rates/sitemap)
npm run lint        # 0 errors, 4 warnings (2 pre-existing + 0 in new file after cleanup)
npm run test        # pass (site, share, quiz, govhowto, images, hero, headline, monitor, chart, chartui, navfeedback, push, telegram, nbs)
npm run build       # 1058 HTML routes, homepage includes Explore grid
npm run audit:static # 0 brokenInternalLinks, 0 duplicateTitles/Descriptions, 0 invalidJsonLd, share 1055/1055
# Smoke: out/index.html contains 10 tile labels and 3 numeric badges (12 banks, 37 states · 77 places, 774 LGAs) — all hrefs exist as out/*.html
```
PR remains **unmerged** per Absolute rules.
