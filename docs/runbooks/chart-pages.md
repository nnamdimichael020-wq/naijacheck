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
4. Hover, touch scrub and keyboard navigation only *select* a stored reading. The detail row repeats that
   reading's own WAT time, value and its change against the previous **plotted** reading, or says there is
   no earlier plotted reading in the range.
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
```

Then serve `out/` and smoke-test at least `/status`, `/charts`, `/charts/parallel-usd-buy` and one fuel
chart (for example `/charts/depot-petrol`). Check: 200, one H1, three range buttons, a detail row with
`aria-live="polite"`, a table with stored rows, and share links whose canonical URL matches the page.

Manual mobile check (a real device or device emulation with touch): dragging horizontally over the plot
moves the detail row and does not block vertical scrolling; tapping does not navigate away.

## Out of scope for this version

Multi-year history rewrites, CSV export, comparing two series on one chart, paid databases. Do not add
them by widening this runbook's scope.
