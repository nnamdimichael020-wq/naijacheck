# NaijaCheck production-readiness findings — 10 October 2026

Audit window: 07:55–09:23 UTC (08:55–10:23 WAT). Branch: `arena/c6158e8e-naijacheck`; PR: [#3](https://github.com/nnamdimichael020-wq/naijacheck/pull/3). Production/DNS/Worker attachment and `naijacheck.ng` canonical configuration were not changed.

## Evidence boundaries

- **Live production observation:** GitHub-hosted runner crawl of the unchanged `https://naijacheck.nnamdimichael020.workers.dev` deployment at 08:23 UTC. This is the current production build, not this branch.
- **Runner source evidence:** isolated Live Monitor Action runs on this branch, including the post-push full-success run [38040973754](https://github.com/nnamdimichael020-wq/naijacheck/actions/runs/38040973754).
- **Local branch evidence:** clean static export, exhaustive static audit, Wrangler HTTP crawl/smoke tests, parser/import tests, and dry-run deployment.
- **Preview evidence:** Cloudflare Workers Builds checks are build/deploy evidence only. Interactive browser behavior is not inferred from them.
- **Browser/device evidence:** unavailable in this environment. Search, install/offline lifecycle, native share/clipboard permissions, notification permission/background delivery, local watchlist UX, location allow/deny, responsive behavior, and assistive technology remain explicitly unverified; use `docs/runbooks/browser-qa-checklist.md`.

## Live production crawl (unchanged production)

Evidence: `docs/evidence/live-worker-crawl-2026-10-10.json`.

- Required live routes `/`, `/status`, `/prices`, `/trends`, `/hustle`, `/tools`, `/robots.txt`, `/sitemap.xml`, and `/api/geo` all returned **200**.
- Recursive crawl: **188 reachable routes**, all 200; **0 fetch errors** and **0 broken internal links**.
- The evidence records per route: HTTP status/final URL, canonical host/URL, title, description, H1, JSON-LD count, external source links, and freshness/state excerpts.
- Production still reflects older `main`: for example `/status` has the duplicate title `Data status | NaijaCheck | NaijaCheck`, and older food/city output remains deployed. Branch fixes below are therefore not claimed live.
- Canonicals remain `https://naijacheck.ng` per owner instruction even though requests were made to the existing `workers.dev` deployment.

## Local branch crawl and Worker smoke

Evidence: `docs/evidence/local-static-crawl-2026-10-10.json` and `docs/evidence/local-worker-http-crawl-2026-10-10.json`.

- Static export: **170 HTML routes**; sitemap: **135 URLs**; no sitemap-missing/indexed-not-in-sitemap routes, broken links, wrong canonical hosts, missing title/description/canonical/H1, duplicate titles/descriptions, or invalid JSON-LD.
- Actual Wrangler HTTP crawl requested **170 generated HTML routes plus six API/error checks (176 total)** with zero status mismatches.
- Worker smoke: `/api/geo` 200; push config 200/no-store; unconfigured same-origin push subscribe 503; unauthenticated push test 401; unknown API/page 404. A separate local-KV smoke returned 201 for valid same-origin subscribe, 403 cross-origin, 200 unsubscribe, and stored only endpoint plus required keys. Static security headers include `nosniff`, `SAMEORIGIN`, restrictive permissions policy, and strict-origin referrer policy.
- Final release-compatible `npx wrangler deploy --dry-run` completed on Wrangler 4.85.0 without changing production.
- Cloudflare branch-preview build `27bd5fd4-3b68-42b7-9dd3-7231ffc27d13` passed at 08:38 UTC. Its URL is under `production/previews/arena-c6158e8e-naijacheck`; production routing was not changed.

## Monitoring and provenance completed

- CBN runner response was HTTP 200, 14,582 bytes, `text/html`, title `Exchange Rates | Central Bank of Nigeria`. The static page exposes the exact `Date` and `NFEM Rate (₦/US$)` schema and its official `/api/GetAllNFEM_RatesGRAPH` endpoint.
- CBN parsing is now schema-gated: no arbitrary nearby number is accepted. The parser selects the newest valid official `ratedate`/`weightedAvgRate` row; captured fixtures include positive and rejection cases.
- Post-implementation full-success runner evidence at 09:19 UTC: CBN, Aboki, open.er-api, Awajis, news, and Wikimedia all succeeded. CBN source time was 9 October 14:00 UTC; Aboki source time was 10 October 09:07 UTC; Awajis source time was 9 October 23:21 UTC. The stable public Immigration page `https://immigration.gov.ng/passports/` also fetched and fingerprinted successfully with no new change.
- Awajis now supports decimal medians/table prices, optional `₦`, independent PMS/AGO/LPG detection, reordered headings, and source-published month/day or day/month WAT times. Depot data stays wholesale.
- Per-source Action summaries and short sanitized diagnostic artifacts are implemented. Sanitized diagnostics include HTTP/final URL/content type/size/title/table shape/resource hints/excerpt; raw pages are not retained. The workflow fails when every critical FX/fuel source fails while preserving last-good snapshots.
- CBN, parallel FX, open.er-api cross-rates, depot fuel, retail pump references, food, telecom, exams, government fees, news/pageview signals, and official-page watches now have independent registry states/provenance. Page changes preserve a human-review task and never auto-edit fees.
- Genuine history remains forward-only, changed-observation deduplicated, and bounded at 400 points.

## Official/manual data safeguards

- NBS Food/PMS/AGO/LPG catalogue URLs are pinned in a tested import/validation path (`scripts/nbs/import.ts`). It requires survey month, publication date, state/national geography, exact units, official catalogue URL, explicit CSV column mapping, positive values, and no duplicates. It rejects city labelling and does not auto-publish.
- Exact manual update procedures are in `docs/runbooks/manual-sources.md`. The newest downloadable catalogue files still require a human licence/file/schema review; no NBS values were fabricated or presented as imported.
- Lagos cost-index scaling was removed. Food/cookbook/cost-of-living output now uses only four cities with explicit legacy rows; missing cities stay unavailable. These rows are labelled dated, unverified planning estimates—not live quotes, receipts, or NBS city data.
- Retail pump references remain separate from monitored wholesale depots. Telecom, admissions and government fees are seeded/unavailable until the documented official/manual fields are verified.
- Standards-based Web Push is implemented with a Worker/KV subscribe-unsubscribe API, protected owner-test path, service-worker push/click handlers, and a scheduled default-branch snapshot checker. It gates on healthy newer Aboki/Awajis observations, parallel USD movement of at least ₦5 or any depot petrol median change, and a global six-hour cooldown; first observation only establishes a baseline. Per-subscriber KV values contain only endpoint and required keys. `/status` retains the explicitly page-open local watchlist fallback.
- Push remains unavailable in deployed environments until the owner binds `PUSH_SUBSCRIPTIONS`, adds VAPID/admin secrets, deploys after approval, and confirms a physical backgrounded phone. Exact steps and current free-tier bounds are in `docs/runbooks/web-push-owner-setup.md`.
- Community submissions stay closed; monetization/payment/analytics/newsletter remain disabled.

## Dependency audit and compatibility

Before: production audit **10** (1 critical, 6 high, 3 moderate); full audit **19** (1 critical, 14 high, 3 moderate, 1 low).

Applied without `--force`: Next 14.2.35 → maintained **15.5.27**, React/React DOM → **19.3.0**, ESLint/config → **9.39.5/15.5.27**, and PostCSS → **8.5.29**; Tailwind moved to the final 3.x release, 3.4.19. Dynamic route params and flat ESLint compatibility config were migrated. Next 16.4.0 and Wrangler 4.149.0 passed locally but repeatedly failed the currently configured Cloudflare branch build. Wrangler 4.149 requires Node 22 while that deployment is configured for Node 20, so release-compatible Wrangler **4.85.0** and Node 20 remain pinned rather than silently changing owner deployment settings.

After: production audit **10** (6 high, 4 moderate); full audit **18** (13 high, 4 moderate, 1 low), with **0 critical**. Remaining paths are build/lint tooling: Tailwind 3 → chokidar/fast-glob/micromatch/braces and postcss-nested/postcss-selector-parser; eslint-config-next → fast-glob; Wrangler/miniflare → undici/ws-related paths. The remaining Next moderate report is through its bundled PostCSS and npm offers only the Cloudflare-incompatible semver-major Next 16 path. npm offers no patched Tailwind 3 fix and misleadingly suggests older tooling. Owner-approved Cloudflare Node 22 migration is required before retesting current Wrangler; Next 16 and Tailwind 4 also need separate compatibility passes. No forced fix was used.

Compatibility passed: `npm ci`, typecheck, lint, 12 monitor parser tests, Web Push gate/API tests, NBS importer tests, Next 15 production build, static audit, Wrangler dry-run, exhaustive local HTTP crawl, configured and unconfigured Worker security/API smoke, and a source-by-source monitor run. `@pushforge/builder@2.0.5` is exact-pinned, zero-dependency, Node 20-compatible and introduced no npm advisory path.

## Remaining actions by responsibility

### Implemented, awaiting owner/device/legal work

- Real-browser/device checklist: PWA install/offline/update, search keyboard UX, native share/clipboard/WhatsApp fallbacks, notification prompt/denial/unsubscribe/background delivery, location allow/deny, mobile/2G behavior, and local watchlist storage/privacy.
- Human review/import of the newest NBS catalogue files and official telecom/admissions/fee values.
- Privacy/legal review before enabling server-side push subscriptions or any submissions, analytics, ads, newsletter, affiliates, or payment.
- Web Push activation requires the owner's Cloudflare **KV** binding (not D1), VAPID/admin secrets, approved redeploy and physical-phone test; no secrets belong in chat or Git.

### Blocked or deliberately not done

- Production/domain/canonical/Worker routing changes are prohibited and remain untouched.
- No graphical browser or browser automation executable was available; browser tests are not claimed.
- Sandbox TLS cannot directly reach `workers.dev`; the live crawl used a GitHub-hosted runner and is clearly separated from local evidence.
- Tailwind 3 has no patched in-major release for the residual audit chain; Tailwind 4 migration needs a separate compatibility pass.
- PR #3 remains open and unmerged pending explicit approval.