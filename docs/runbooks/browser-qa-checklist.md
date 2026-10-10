# Real-browser QA checklist

Record browser/version, OS/device, viewport, preview/live URL, network profile, UTC time and evidence. Source review, unit tests and `curl` are not real-browser evidence.

## Navigation and mobile

- Test 360×640, 390×844, tablet and desktop; zoom to 200%. Verify no clipped controls or page-level horizontal scroll.
- Keyboard through skip link, header, search, dialogs, forms, sharing, notification settings and footer. Check visible focus, Escape, labels, headings and announcements.
- Open representative generated routes. Verify title, description, canonical, one H1, JSON-LD, source/state/freshness copy and no console errors.
- Emulate slow 3G and verify the push invitation does not delay content or fight the bottom navigation.

## Search and sharing

- Search exact/partial terms for a price, city, slang, tool and absent term; test keyboard choice, URLs, empty state and Escape.
- Test Web Share on mobile and clipboard fallback/denial on desktop.
- Shared text/URL may contain only public title, canonical host, source/date—not calculator, hustle, location, local watch or push subscription values.

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

## Location, data and local fallback

- Allow, deny and block `/api/geo`; verify fallback, no crash and no caching/sharing of location.
- Compare CBN, parallel FX, reference FX, wholesale depot PMS/AGO/LPG, food, pump, telecom, exam, fee and trends against `/status`.
- Verify independent source/effective/check times, WAT display and seeded/manual/stale labels. Food must remain dated; depot must say wholesale.
- Add/reload/match/delete above and below local watch rules. Confirm thresholds stay in local storage and are checked only with the page open—even when Web Push is unavailable.

## Disabled features

Exercise calculator bounds and mobile keyboards. Community auto-publishing, real payment, ads, affiliates, newsletter and analytics must remain disabled unless separately approved/configured. Confirm no client-side admin password grants publication.

Any unchecked item remains **not verified**, with its exact device/browser blocker recorded.
