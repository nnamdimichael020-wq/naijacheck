# Real-browser QA checklist

Record browser/version, OS/device, viewport, network profile, preview/live URL, UTC time, and evidence. Do not mark an item passed from source inspection or `curl` alone.

## Navigation and mobile

- Test 360×640, 390×844, tablet, and desktop. Zoom to 200%; verify no clipped controls or horizontal page scroll (tables may scroll inside their container).
- Keyboard through skip link, header, search, dialogs, forms, share controls, and footer. Check visible focus, Escape, labels, headings, and screen-reader announcements.
- Open every header/footer route and representative dynamic routes. Verify title, description, canonical, one H1, JSON-LD, source/state/freshness copy, and no console errors.

## Search

- Search exact and partial terms for prices, a city, slang, a tool, and an absent term.
- Verify keyboard selection, result URLs, empty state, close/Escape, and that no private calculator values enter the URL or index.

## PWA/offline

1. Install/reload once online; inspect service-worker/cache storage.
2. Verify `/api/geo` is absent from caches.
3. Open two content pages, go offline, reload both, then open an uncached page.
4. Cached pages must display the offline banner and warn that saved data may be stale; uncached navigation must show the offline fallback.
5. Return online and verify recovery. Test service-worker update and cache-version cleanup.

## Sharing/privacy

- Test Web Share on supported mobile and clipboard fallback on desktop/denied permission.
- Shared text/URL may contain only public title, current canonical host, source/date; never calculator, hustle-form, local watchlist, location, or other private inputs.
- Test clipboard failure and no-JavaScript fallback.

## Location

- Allow, deny, and block `/api/geo`; verify a useful fallback and no crash.
- Confirm personalized/API responses are not service-worker cached and location is not included in shares or analytics.

## Data and local watchlist

- Compare CBN, parallel FX, reference FX, depot PMS/AGO/LPG, food, pump, telecom, exam, fee, and trend cards with `/status`.
- Verify source/effective/check times are distinct and useful WAT display is not presented as source time.
- Food must say dated/unverified and never infer a missing city. Depot prices must say wholesale.
- Add above/below local rules, reload, verify local persistence and matching, delete them, and clear site storage. Confirm there is no notification permission prompt or network request for rules.

## Forms and disabled features

- Exercise valid/invalid bounds for calculators on mobile keyboards.
- Community submission and payment/ads/newsletter/analytics must remain closed/disabled unless an approved server-side setup is documented. Confirm no client-side admin password grants publication.

Current limitation: this checklist is required device/browser work. CLI crawl/build results are not a substitute.