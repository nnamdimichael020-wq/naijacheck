# Navigation feedback — browser evidence (2026-10-21)

**Change:** light navigation feedback.
- A 3px brand-green top strip appears only after 150 ms.
- A small header-logo pulse appears only after 300 ms.
- Both clear in the frame the new route commits.
- Pending buttons (push, hustle demo payment) get spinners on the button only.
- Search Enter is a client navigation.
- There is no full-screen loader.

Spec, switches and the phone check are in `docs/runbooks/navigation-feedback.md`.

## What was run

| Item | Value |
| --- | --- |
| When | 2026-10-21, ~19:40 UTC (final run on the committed tree; earlier runs agree within a few ms) |
| Browser | HeadlessChrome 131.0.6778.0 (`@sparticuz/chromium@131`) driven by `puppeteer-core@23`, Debian 12 sandbox |
| Site | `npm run build` static export (`out/`) served locally. `/api/geo` is absent (Cloudflare Worker only); `/api/push/*` is mocked by the QA server. |
| Phone emulation | 390×844 CSS px, DPR 2, `isMobile`, `hasTouch`, Android Chrome UA, a fresh incognito context per scenario |
| Networks | Unthrottled; DevTools **Fast 3G** (562.5 ms RTT, 1.44 Mbps down); DevTools **Slow 3G** (2,000 ms RTT, 400 kbps); 4× CPU slowdown for the low-end phone case |
| Timing method | A `MutationObserver` installed before hydration timestamps `data-nav-progress`, `html[data-nav-slow]` and the new `main h1`, relative to an in-page click |
| Script | `scripts/qa/nav-feedback-check.mjs` |

**This is emulation in desktop Chromium, not a physical phone.** The on-device check in the runbook (Android
Chrome and iOS Safari) is still required.

Two harness notes:
- **Service worker bypass.** The navigation scenarios bypass the service worker. Its proxied fetches run outside
  page-level throttling, and it never caches RSC `.txt` payloads, so on a phone those requests hit the network anyway.
- **Push permission stub.** The push scenario stubs `Notification.permission` and gives `requestPermission` a
  600 ms "tap Allow" delay, because `chrome-headless-shell` hard-denies notifications. The real component, service
  worker and `pushManager` flow still run.

## Results — 82/82 checks passed (+2 informational readings)

| Scenario | Checks | What was asserted |
| --- | --- | --- |
| A. Fast, prefetched (bottom nav `/` → `/prices`, then 4 more hops) | 7/7 | The prefetch arrived before the tap. No strip and no pulse on any hop. Ends idle. No page errors. With 4× CPU slowdown nothing is left behind (info: content at 127 ms, 73–127 ms across runs, strip not shown). |
| B. Fast, **not** prefetched (footer `/about`) | 4/4 | The payload was fetched on demand. Still silent: content at 38 ms. |
| C. Fast 3G, not prefetched, **light theme** (`/` → `/about`) | 15/15 | See the list below the table. |
| D. Slow 3G, not prefetched (`/` → `/privacy`) | 15/15 | The same as C, in the dark theme: strip rgb(41, 174, 112), which matches `--primary` hsl(152 62% 42%). |
| E. Slow 3G + `prefers-reduced-motion: reduce` | 15/15 | Static full-width strip (`animation-name: none`, `transform: none`, opacity 1). The logo's computed animation is `none` with no transform in any sample. Hidden instantly at commit (opacity 0, transition 0s). Same timings, geometry and no-overlay results. |
| F. Back/forward, hash, same page | 5/5 | Back and forward on Slow 3G restore from the router cache in 25 / 13 ms and leave nothing behind. A hash-only `router.push`, a same-page `router.push` and the skip link (`#main`) produce no strip and no pulse. |
| G. Button-only spinners | 18/18 | See the list below the table. |
| H. Search Enter | 3/3 | Enter on a result is a **client navigation**: same document, no reload, `/` → `/prices/lagos` in 33 ms on Fast 3G (the result was prefetched). Nothing left behind. No errors. |

Scenario C asserted:
- the navigation is genuinely slow;
- the strip appears at 152 ms and the logo pulse starts at 305 ms;
- both clear in the commit frame (0 ms apart from the new `h1`), and the strip is idle 308 ms later;
- the strip is fixed, `top: 0`, 3px high, full width, `pointer-events: none` and `z-index: 70`, above the sticky z-40 header;
- the old page stays visible and tappable meanwhile: the old `h1` is still present and `elementFromPoint` hits a `<p>` inside `<main>`;
- the strip colour rgb(0, 133, 80) equals the theme's `--primary`;
- the strip uses the CSS animation `nav-progress-grow` (no JS ticking);
- the logo uses `nav-logo-pulse`, with 4 distinct transforms in 4 samples while slow;
- the finish is a 0.2 s fade.

Scenario G asserted, for hustle "Pay … (demo)" with motion and with reduced motion:
- `aria-busy` is set at once, and there is no spinner flash in the first 150 ms;
- a tiny `aria-hidden` spinner appears with "Processing demo payment…";
- it rotates (`inline-spin`), or is static under reduced motion;
- the page strip and logo stay idle;
- everything clears when done.

For push "Enable alerts" on `/status`:
- `aria-busy` and the button spinner show for the 0.6 s prompt;
- the strip and logo stay idle;
- the spinner and `aria-busy` clear when the flow settles.

Info: headless Chromium has no push service, so the flow ends on the existing actionable message: "This browser
refused to create a push subscription. Close private/incognito tabs, refresh, and try again."

## Fast vs slow networks — timelines (ms after the tap)

| Network and link | Content on screen | Strip shown | Logo pulse | Strip finishes | Pulse stops | Strip gone |
| --- | --- | --- | --- | --- | --- | --- |
| Fast, prefetched `/` → `/prices` | 33 | — | — | — | — | — |
| Fast, prefetched hops `/trends`, `/hustle`, `/tools`, `/` | 30, 42, 20, 41 | — | — | — | — | — |
| Fast + 4× CPU, prefetched `/` → `/prices` | 127 (73–127 across runs) | — | — | — | — | — |
| Fast, not prefetched `/` → `/about` | 38 | — | — | — | — | — |
| **Fast 3G**, not prefetched `/` → `/about` | **1,233** | 152 | 305 | 1,233 | 1,233 | 1,541 |
| **Slow 3G**, not prefetched `/` → `/privacy` | **4,285** | 152 | 305 | 4,285 | 4,285 | 4,593 |
| Slow 3G + reduced motion `/` → `/privacy` | 4,283 | 152 (static) | attribute at 305; no animation | 4,283 (instant) | 4,283 | 4,591 |
| Slow 3G back `/privacy` → `/` | 25 | — | — | — | — | — |
| Slow 3G forward `/` → `/privacy` | 13 | — | — | — | — | — |
| Fast 3G search Enter `/` → `/prices/lagos` | 33 | — | — | — | — | — |

Reading the table:
- Fast and prefetched navigations show nothing.
- On 3G the strip appears at about 0.15 s and the pulse at about 0.3 s.
- Content is never delayed: the indicators end in the same frame as the new page.
- The only thing after content is the strip's ~0.3 s fade, which is pointer-transparent.

## Screenshots (kept out of Git)

They are in `/home/user/naijacheck-qa/nav-feedback/` in the QA workspace, next to `results.json`:

| File | Shows |
| --- | --- |
| `slow-3g-pending.png` | Dark theme, about 1 s into a Slow 3G tap. The thin green strip is about 40% across. The home page is fully visible, with no overlay. The logo is mid-pulse. |
| `slow-3g-pending-top.png` | A crop of the top 64px of the same moment. |
| `fast-3g-light-pending.png` and `-top.png` | Light theme, Fast 3G, mid-flight. The strip is about 47% across and the logo is visibly lighter (mid-pulse). |
| `reduced-motion-pending.png` and `-top.png` | Reduced motion. The static full-width strip, with the logo at full opacity. |
| `hustle-pay-spinner.png` | The demo checkout sheet: "Processing demo payment…" with the inline spinner on the button only. |

## Size and 3G cost (vs `main` at 04751f3, same machine)

| Asset | Before | After | Change |
| --- | --- | --- | --- |
| First Load JS shared by all (Next build output) | 103 kB | 104 kB | +1 kB (rounded) |
| `/` · `/status` · `/charts/[slug]` · `/prices/fuel` First Load JS | 135 · 138 · 131 · 136 kB | 137 · 139 · 133 · 137 kB | +1–2 kB (rounded) |
| `main-app` chunk (gzip -9): instrumentation hook + store | 258 B | 1,467 B | +1,209 B |
| `app/layout` chunk (gzip -9): strip component + search Enter change | 7,611 B | 7,852 B | +241 B |
| Site CSS (gzip -9) | 8,074 B | 8,348 B | +274 B |

That is about +1.7 KB gzip per first page load: about 9 ms of transfer on Fast 3G and 34 ms on Slow 3G.
- There are no new dependencies.
- No timers, observers or animation frames run while idle. The strip's motion is a compositor-only CSS transform.
- The Pages-Router `main-*.js` bundle grew too, but no exported page references it.

## Non-regression

| Check | Result |
| --- | --- |
| `npm test` (all suites incl. new `navfeedback:test`, `push:test`, `telegram:test`, `share:test`, `quiz:test`, chart suites) | exit 0. The suites pass: 30 navigation feedback, 28 chart render, 27 chart interaction and 23 parser tests. |
| `npm run typecheck` / `npx eslint .` | clean / clean |
| `npm run build` | 185/185 static pages |
| `npm run audit:static` | 180 routes and 145 sitemap URLs. 0 missing from the sitemap, 0 broken links or images, 0 invalid JSON-LD. Share 177/177. Hero motion checks intact. `navFeedback`: 179 shell pages checked, all clean. |
| Audit fault injection (a non-idle strip, a removed `aria-hidden`, a removed logo mark, `animate-spin`, a logo animation outside `no-preference`) | Each was reported, and the exit code was 1. The restored output passes. |
| Unit-test mutation check (bar delay 0, no pulse clear on commit, spinner animation outside `no-preference`) | Each was caught by the named test. |
| Chart crosshair browser QA from PR #21 (`scripts/qa/chart-crosshair-check.mjs`) | 36/36 against this build |
