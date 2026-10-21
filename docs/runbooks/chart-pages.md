# Chart pages runbook (`/charts`)

This runbook covers the shared history chart and the dedicated chart pages. It records the retention
that is actually in use, the series that have pages, and the checks a change must pass.

## Honesty rules (non-negotiable)

1. `data/history.json` is the only history store. A point is appended only after a successful monitor
   parse (`scripts/monitor/run.ts` → `appendBoundedHistory()` in `lib/history.ts`). Seeded snapshots are
   never appended.
2. A series with fewer than two stored points draws **no line**. The chart card lists `stored / cap` and
   the words “not enough readings yet”.
3. Nothing is interpolated, smoothed, backfilled or extended to “today”. Gaps on the time axis stay gaps.
4. Hover, touch scrub and keyboard navigation only *select* a stored reading. The crosshair snaps to the
   nearest stored projected point (`crosshairSelection()` in `lib/chart-interaction.ts`) — it never follows
   the raw pointer and never shows a price between two readings. The floating HUD, the value-axis price pill,
   the time pill and the detail row all repeat that reading's own WAT time, value and its change against the
   previous **plotted** reading, or say there is no earlier plotted reading in the range.
5. `7D` / `30D` / `ALL` always render. A range holding fewer than two stored readings is disabled and the
   card states the reason in visible text. A filter never manufactures a point.
6. Verification labels come from `lib/source-registry.ts` (`live`, `recent`, `stale`, `seeded`, `manual`,
   `unavailable`). A seeded dataset must never be labelled live, and the readings table labels older rows
   as stored historical readings rather than repeating the current badge.
7. Series on a shared axis must share a unit. Parallel and CBN USD share ₦/US$; petrol and diesel share
   ₦/litre; LPG is ₦/kg and has its own chart.

## Pages

| Route | Dataset | Unit | Source |
| --- | --- | --- | --- |
| `/charts` | index (stored counts + sparklines) | — | — |
| `/charts/parallel-usd-buy` | `parallel-usd-ngn-buy` | ₦ per US$ | Aboki Forex (indicative) |
| `/charts/cbn-usd` | `cbn-usd-ngn` | ₦ per US$ | CBN NFEM closing rate |
| `/charts/depot-petrol` | `fuel-depot-petrol` | ₦ per litre (wholesale) | Awajis / petroleumprice.ng |
| `/charts/depot-diesel` | `fuel-depot-diesel` | ₦ per litre (wholesale) | Awajis / petroleumprice.ng |
| `/charts/depot-lpg` | `fuel-depot-lpg` | ₦ per kg (wholesale) | Awajis / petroleumprice.ng |

The registry lives in `lib/chart-pages.ts`. Every page renders the shared `HistoryChart`
(`size="large"`) plus `ChartPointsTable` (time, value, change, source, state), links back to `/status`
and the related chart pages, and is listed in `app/sitemap.ts` with the newest stored observation as
`lastModified`.

## Crosshair read-out (TradingView-style, pure SVG)

Every interactive chart — `HistoryChart` (`/status`, `/prices/fuel`, `/prices/generator-diesel`, every
`/charts/*` page) and the card sparklines (`MiniSparkline` → `SparklineScrub` on `/`, `/status`, `/charts`) —
uses the same model. No chart library is involved.

| Piece | Where | What it shows |
| --- | --- | --- |
| Vertical crosshair | SVG, full plot height | Dashed line on the selected reading's own projected x |
| Horizontal crosshair | SVG, full plot width, one per series | Dashed line on that series' selected reading's own y |
| Emphasized vertex | SVG | Background halo + ring + the series' marker drawn ×1.45 — larger than any normal point |
| Floating HUD | Own row directly **above** the plot, rides with the crosshair | Label (`Latest reading` / `Selected reading`), price in large tabular numbers with unit (`₦1,370 per USD`, `₦1,350/L`), full WAT date/time, short delta vs previous plotted reading |
| Price pill | Value-axis column, aligned with each horizontal crosshair | The stored value at the series' own precision |
| Time pill | Own slim row directly under the plot, aligned with the vertical crosshair | `18 Oct, 12:06 am WAT` |
| Detail row | Under the chart, `aria-live="polite"` | Same facts for screen readers (the HUD is `aria-hidden`) |

Layout decisions that matter on a phone (plot ≈ 245 × 120 px at 390 px wide):

- The HUD sits **above** the plot, not on it, so it never hides the line; the finger (coming from below)
  never covers it either.
- The price pill lives in the existing value-axis column, so the plot keeps its full width.
- HUD and time pill use proportional anchoring (`left: f·100%`, `translateX(−f·100%)`, with
  `f = crosshairLabelFraction()`), so they always cover the crosshair x and never clip at either edge.
- Every HUD line is single-line and always rendered (the delta line says "first plotted reading in this
  range" when there is no previous reading), so the HUD height is constant and the plot never jumps mid-scrub.
  Compact/large HUDs have four lines; the card-sparkline HUD has three (label and price share a line).
- Two series on one axis each get their own horizontal line, vertex, price pill and HUD line; overlapping
  price pills are spread around their true levels (`stackAxisCallouts()`), the lines never move.
- No transitions or animation anywhere: the crosshair moves on the same frame as the pointer, and
  `prefers-reduced-motion` is respected by construction.

### Pointer-leave policy (decision)

**When nobody is scrubbing, the chart falls back to the latest stored reading** and the HUD says
**"Latest reading"** (dimmed crosshair, neutral pill borders). While scrubbing it says **"Selected reading"**.
The policy is the pure, unit-tested `scrubPointerAction()`:

| Input | Effect |
| --- | --- |
| Mouse hover / move | select nearest stored reading |
| Mouse leaves the plot | back to latest |
| Finger/pen down, drag | select (responds on first contact, before any movement) |
| Finger/pen lifts | back to latest |
| Vertical page scroll (browser cancels the pointer because the plot keeps `touch-action: pan-y`) | back to latest |
| Arrow keys / Home / End | step between stored readings |
| Escape, or focus leaves the plot | back to latest |

The server-rendered HTML already shows the latest reading's HUD, pills and crosshair, so the read-out works
before hydration and without JavaScript.

## Phone check (home + `/charts/parallel-usd-buy`)

Do this on a real phone before sign-off (Android Chrome and iOS Safari if available), in light and dark mode:

1. Open `/`. In **Daily Naija Briefing**, the Parallel USD card shows a small HUD above its sparkline reading
   `Latest reading ₦… per USD`, the latest WAT time, and a dimmed crosshair on the last point.
2. Put a finger on that sparkline and drag sideways. On first contact the HUD flips to `Selected reading`;
   while dragging, the vertical **and** horizontal dashed lines jump between real points (never between them),
   the touched point gets a ringed marker, and the HUD price/time change with it. Check the value against the
   readings table on `/charts/parallel-usd-buy`.
3. Lift the finger: the HUD returns to `Latest reading`. Drag **vertically** on the sparkline: the page must
   scroll normally.
4. Open `/charts/parallel-usd-buy`. Drag across the plot: confirm the HUD above the plot (large price + unit,
   full WAT date/time, delta vs previous plotted reading), the **price pill** on the left value axis showing the
   same price, the **time pill** under the plot showing the same time, and both crosshair lines through the
   ringed point. Nothing may be clipped at the left or right edge (try both ends).
5. Lift the finger → `Latest reading`; vertical drag on the plot → page scrolls.

An automated emulation of these steps (390×844 touch viewport + desktop mouse, assertions against
`data/history.json`) lives in `scripts/qa/chart-crosshair-check.mjs`; results from this change are in
`docs/evidence/chart-crosshair-2026-10-20.md`. Emulation is not a substitute for the on-device check above.

## Retention in use

- **56 points per dataset** (`MAX_HISTORY_POINTS_PER_DATASET` in `lib/history.ts`). When a 57th reading
  arrives the oldest is dropped, so every chart is a rolling window, not a full archive.
- The store is a committed JSON file shipped in the static export. The monitor workflow commits it; there
  is no runtime write from a visitor.
- No KV namespace, D1 database or paid chart service is used for history, so the charts add **zero** KV
  reads/writes. If a future change moves history into KV, re-check the free-tier limits cited in
  `docs/zero-cost-operations-2026-10-09.md` before writing: Cloudflare currently lists Workers KV Free at
  100,000 reads/day, 1,000 writes/day, 1,000 deletes/day, 1,000 lists/day and 1 GB stored, with daily limits
  resetting at 00:00 UTC.
- Do not raise the cap to “keep everything” without a separate decision: it grows the committed file and
  the exported HTML, and the UI copy (`stored / 56`) is asserted by tests.

## Adding another chart page

1. Confirm the dataset is already appended by the monitor and has a `ChartSeriesSpec` in
   `lib/chart-series.ts` (label, unit suffix, marker shape, dash, tone, source).
2. Add a `ChartPage` entry to `CHART_PAGES` in `lib/chart-pages.ts`: unique slug, dataset, matching
   registry id, unique H1/meta title/meta description, summary, unit label, related slugs.
3. `npm run chartui:test` fails if a slug is duplicated, a spec/dataset disagrees, a related slug is
   missing, a registry id is unknown, or the copy claims “live”.
4. The sitemap and static params pick the page up automatically. Rebuild and run `npm run audit:static`
   to prove the page is in the sitemap, has a canonical URL, and carries the WhatsApp/X share links.

## Verification checklist

```bash
npm run typecheck
npm run lint
npm run chart:test
npm run chartui:test
npm test
npm run build
npm run audit:static -- /tmp/audit.json
# optional real-browser emulation of the phone check (needs a local Chrome/Chromium):
npm i --no-save puppeteer-core@23
CHROME_PATH=/path/to/chrome node scripts/qa/chart-crosshair-check.mjs --out /tmp/chart-qa
```

Then serve `out/` and smoke-test at least `/status`, `/charts`, `/charts/parallel-usd-buy` and one fuel
chart (for example `/charts/depot-petrol`). Check: 200, one H1, three range buttons, a detail row with
`aria-live="polite"`, a table with stored rows, and share links whose canonical URL matches the page.

Manual mobile check (a real device or device emulation with touch): dragging horizontally over the plot
moves the detail row and does not block vertical scrolling; tapping does not navigate away.

## Out of scope for this version

Multi-year history rewrites, CSV export, comparing two series on one chart, paid databases. Do not add
them by widening this runbook's scope.
