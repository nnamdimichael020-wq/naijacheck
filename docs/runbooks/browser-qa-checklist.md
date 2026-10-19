# Real-browser QA checklist

Record browser/version, OS/device, viewport, preview/live URL, network profile, UTC time and evidence. Source review, unit tests and `curl` are not real-browser evidence.

## Navigation and mobile

- Test 360×640, 390×844, tablet and desktop; zoom to 200%. Verify no clipped controls or page-level horizontal scroll.
- Keyboard through skip link, header, search, dialogs, forms, sharing, notification settings and footer. Check visible focus, Escape, labels, headings and announcements.
- Open representative generated routes. Verify title, description, canonical, one H1, JSON-LD, source/state/freshness copy and no console errors.
- Emulate slow 3G and verify the push invitation does not delay content or fight the bottom navigation.

## History charts (`/status`, `/prices/fuel`, `/prices/generator-diesel`, `/` sparklines)

Charts are drawn only from observations stored in `data/history.json` (max 56 per dataset). Confirm on a real phone, in both themes, before signing off.

- Open `/status` on a 360×640 and a 390×844 phone. Verify no page-level horizontal scroll and that no chart, axis label, legend row or readings table is clipped.
- Verify each chart states its as-of time in WAT and a real point count. The per-series legend must read `stored/56` (for example `9/56 points`) and the summary cards `9 / 56 real points stored`.
- Verify a dataset with fewer than two stored readings shows **"Not enough readings yet"** (or the inline "not enough readings yet (n/56 stored)" note) and draws **no line at all**. Never accept a flat zero line, a single dot joined to nothing, or a value that is not in `data/history.json`.
- Cross-check every plotted value against `data/history.json`: same count, same numbers, same order. Open "Show the … real readings plotted" and confirm the table lists exactly the plotted points with their source time and recorded UTC time.
- Verify a series whose stored readings are all identical is labelled flat ("Flat: every stored reading is identical…") rather than being scaled into a slope.
- Verify the 7d / 30d buttons appear **only** when at least two real readings exist inside that window, that the selected button shows a pressed state, and that switching windows never invents points (the plotted count can only fall or stay the same).
- Confirm series are distinguishable **without colour**: different dash patterns, different marker shapes and a text legend with the latest value and direction word (up/down/no change).
- Test dark mode and 200% zoom: axis labels, gridlines, series and legend must stay readable and no series may disappear into the background.
- Keyboard and screen reader: tab to the window toggle (visible focus, `aria-pressed` announced), confirm the chart SVG is announced as one image with a description naming each series, its count, range and direction, and that the legend and readings table are reachable as real text.
- On `/`, confirm the daily briefing sparklines match the `/status` charts for the same dataset, and that a dataset with one reading shows the compact "Chart: not enough readings yet — 1/56 stored" note.
- Confirm change badges and charts agree: the badge's previous value must be the second-to-last point in the chart's readings table.
- Offline: load `/status` online, cache it, go offline and reload. The charts are static SVG in the cached HTML, so they must still render with the offline/stale warning.
- Verify no chart dependency was added: `package.json` must contain no chart library, and the browser network tab must request no third-party chart CDN on these routes.

## Search and sharing

- Search exact/partial terms for a price, city, slang, tool and absent term; test keyboard choice, URLs, empty state and Escape.
- Test Web Share on mobile and clipboard fallback/denial on desktop.
- On `/`, `/status`, one `/howto/*`, one `/prices/*` hub and one `/tools/*` result page, confirm the explicit **WhatsApp** and **Post on X** buttons open with the page title, a dated factual line and the canonical URL, on both mobile and desktop. Both must remain visible when native Web Share is unsupported.
- Shared text/URL may contain only public title, canonical host, source/date—not calculator, hustle, location, local watch or push subscription values. No @handle is added while `SITE_CONFIG.xHandle` is empty.
- Confirm the WhatsApp/X targets are at least 44px tall, readable in dark mode, and never sit under the fixed bottom nav or the push invitation sheet.

## PWA and offline

1. Load online and inspect service worker/cache storage.
2. Confirm `/api/geo` and every `/api/push/*` response are absent from caches.
3. Cache two public pages, go offline, reload them and request an uncached page.
4. Cached content must show an offline/stale warning; uncached navigation must show the offline fallback.
5. Return online; verify recovery, service-worker update and old-cache cleanup.

## Web Push invitation and permission

- Clear site data/permission. Confirm no browser permission prompt appears at page load.
- On a meaningful first visit, wait 45 seconds; confirm a dismissible, non-modal, dark-mode-safe sheet appears above bottom navigation.
- Select **Not now**, reload and revisit; confirm it stays hidden for at least seven days (inspect the stored expiry rather than waiting seven days).
- On a fresh profile, select **Enable alerts** and confirm only that click causes `Notification.requestPermission()`.
- Deny/dismiss permission; confirm useful status, no repeated native prompt and no broken page.
- Confirm unsupported browsers and unconfigured previews honestly fall back to the page-open watchlist and never say enabled.

## Background delivery (owner-configured environment only)

- Follow `web-push-owner-setup.md` on physical Android Chromium, desktop Chromium/Firefox, and an installed iOS/iPadOS Home Screen app where supported.
- Background/lock the device before the protected owner test. A push-service HTTP success alone is not a visual-delivery pass.
- Verify title/body includes source and as-of time, icon appears, and tap focuses/navigates an existing same-origin window or opens `/status`.
- Verify arbitrary/cross-origin subscribe calls fail and unauthenticated `/api/push/test` returns 401.
- Select **Unsubscribe and clear**; confirm browser subscription and matching KV key are gone. Test an expired endpoint cleanup (404/410) without exposing endpoint data.
- Confirm genuine-change logic: first observation no send; USD change below ₦5 no send; unhealthy source no send; qualifying USD/fuel change sends; second event inside six hours is delayed/coalesced, never an extra alert.

## Telegram alerts link and channel (owner-configured only)

- The channel URL is committed in `config/site.ts`, so on a normal build with **no** dashboard variables set, confirm the footer link and the `/status` "Alerts on Telegram" section are present and point at `https://t.me/naijacheck_alerts`. This is the regression check for the link having vanished before.
- Only when the committed value is deliberately cleared in a test build: confirm **no** Telegram link, section or placeholder appears in the footer or on `/status`, and that no Telegram script/iframe is requested.
- With a real channel URL configured, confirm the footer link and the `/status` "Alerts on Telegram" section render, open the correct `https://t.me/…` channel in a new tab, carry `rel="noopener noreferrer"`, and never ask for a Telegram login, phone number or code.
- Confirm the copy still states the shared rule (healthy source, newer source time, parallel USD ≥ ₦5 or depot petrol median change, at most one burst every six hours). No copy may promise alerts on unchanged or failed readings.
- Confirm `/status` reports Web Push and Telegram together: Web Push copy must be unchanged from the previous release.
- On a phone in a second browser/profile, open the channel from the site link and verify the previous owner test message is visible with its `/status` link working.
- Confirm the channel posted at most one message per genuine change, and never a message for a baseline, an unchanged reading or a failed monitor.

## Location, data and local fallback

- Allow, deny and block `/api/geo`; verify fallback, no crash and no caching/sharing of location.
- Compare CBN, parallel FX, reference FX, wholesale depot PMS/AGO/LPG, food, pump, telecom, exam, fee and trends against `/status`.
- Verify independent source/effective/check times, WAT display and seeded/manual/stale labels. Food must remain dated; depot must say wholesale.
- Add/reload/match/delete above and below local watch rules. Confirm thresholds stay in local storage and are checked only with the page open—even when Web Push is unavailable.

## Disabled features

Exercise calculator bounds and mobile keyboards. Community auto-publishing, real payment, ads, affiliates, newsletter and analytics must remain disabled unless separately approved/configured. Confirm no client-side admin password grants publication.

Any unchecked item remains **not verified**, with its exact device/browser blocker recorded.
