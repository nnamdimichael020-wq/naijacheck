# Chart crosshair read-out — browser evidence (2026-10-20)

Change: TradingView-style crosshair read-out on every stored-history chart and card sparkline (vertical +
horizontal crosshair snapped to a stored reading, emphasized vertex, floating HUD, value-axis price pill,
time pill, "Latest reading" fallback). Spec and phone-check steps: `docs/runbooks/chart-pages.md`.

## What was run

| Item | Value |
| --- | --- |
| When | 2026-10-20, ~16:40 UTC |
| Browser | HeadlessChrome 131.0.6778.0 (`@sparticuz/chromium@131`) driven by `puppeteer-core@23`, Debian 12 sandbox |
| Site | `npm run build` static export (`out/`) served locally; `/api/*` (Cloudflare Worker only) intentionally absent |
| Phone emulation | 390×844 CSS px, DPR 2, `isMobile`, `hasTouch`, Android Chrome UA; touches sent with CDP `Input.dispatchTouchEvent` (real touch → pointer events, `pointerType: "touch"`) |
| Desktop | 1280×900, real mouse moves + keyboard |
| Extra visual checks | 360×844 light theme (home), 390×844 light theme (left plot edge), `/status` USD chart with two series |
| Script | `scripts/qa/chart-crosshair-check.mjs` (asserts against `data/history.json`) |

**This is emulation in desktop Chromium, not a physical phone.** The on-device check in the runbook is still
required before sign-off (Android Chrome and iOS Safari).

## Results — 36/36 checks passed

Home (`/`, Daily Briefing → Parallel USD sparkline) and `/charts/parallel-usd-buy`, phone emulation:

| Check | Home | /charts/parallel-usd-buy |
| --- | --- | --- |
| Idle: HUD says `Latest reading`, crosshair on the latest vertex | ✅ | ✅ |
| Responds on first touch, before any movement (`Selected reading`) | ✅ | ✅ |
| Still scrubbing while the finger is down | ✅ | ✅ |
| Vertical **and** horizontal crosshair on a stored polyline vertex at every drag step | ✅ | ✅ |
| HUD price is always a value stored in `data/history.json` | ✅ | ✅ |
| HUD follows the finger across different readings | ✅ (4 readings) | ✅ (4 readings) |
| HUD shows a full WAT date/time (`18 Oct 2026, 12:06 am WAT`) | ✅ | ✅ |
| HUD inside the card (not clipped) and not covering the plot | ✅ | ✅ |
| Price pill = HUD price; time pill = HUD time; both inside the card | n/a (no axes on a sparkline) | ✅ |
| Lifting the finger returns to `Latest reading` | ✅ | ✅ |
| Vertical finger drag on the plot still scrolls the page (`touch-action: pan-y`) | ✅ (scrollY +205) | ✅ (scrollY +205) |
| Chart shows the latest reading after the scroll | ✅ | ✅ |
| No console errors / hydration warnings | ✅ | ✅ |

Desktop (`/charts/parallel-usd-buy`): hover selects a stored reading ✅ · leaving the plot returns to latest ✅ ·
Home key selects the earliest reading ✅ · Escape returns to latest ✅.

Visual review of the screenshots (phone, both themes): HUD sits above the plot and rides with the crosshair;
both dashed crosshair lines pass through the ringed vertex; the price pill covers the matching value-axis label;
the time pill has its own row under the plot and stays inside the plot at both edges; the two-series USD chart
on `/status` shows two horizontal lines, two price pills and a CBN line in the HUD with CBN's own time; no
page-level horizontal scroll at 360 px or 390 px.

Font note: the sandbox's bundled headless fonts have no ₦ (U+20A6) or ▲▼■ glyphs, so DejaVu Sans was added to
the sandbox font path for screenshots. Phones ship these glyphs in their system fonts, and the site already
renders ₦ everywhere; the DOM text was asserted independently of fonts.

## Responsiveness (6× CPU throttle, one pointer move per animation frame, 3 runs averaged)

| Chart | Median frame | Frames > 33 ms (of 88) |
| --- | --- | --- |
| Home sparkline | 16.7 ms (60 fps) | ~1 |
| `/charts/parallel-usd-buy` (44 readings) | 16.7 ms (60 fps) | 3 |
| `/status` fuel chart (2 series, 74 readings) | ~22 ms | ~16–20 |

Measured before/after two fixes in this change: the plot box is measured once per gesture instead of on every
move (no forced synchronous layout per frame), and the readings tables/legend are memoized so a scrub step
only re-renders the plot, HUD, pills and detail row. The `/status` fuel chart went from a 33 ms median
(~30 fps) to ~22 ms. CSS containment on the card was tried and gave no measurable gain, so it was not kept.

## Bundle impact (gzip, vs `main` @ 43e0bf7)

| Route | First Load JS before → after |
| --- | --- |
| `/` | 129 kB → 135 kB (interactive sparkline; new shared 4.5 kB chunk, cached across chart pages) |
| `/status` | 148 kB → 138 kB |
| `/charts/[slug]` | 142 kB → 131 kB |
| `/prices/fuel` | 147 kB → 136 kB |

The chart pages got lighter because the client chart no longer imports `lib/chart-series` at runtime (which
pulled the live JSON snapshots into the browser bundle); tones and formatting now come from `lib/chart-format`.
Server-rendered HTML grows by 0.7–3.1 KB gzip per chart page (HUD, pills and crosshair are in the static HTML,
so the latest reading's read-out works before hydration).
