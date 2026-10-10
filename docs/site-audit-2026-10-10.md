# NaijaCheck production-readiness findings — 10 October 2026

Audit window: 07:55–08:25 UTC (08:55–09:25 WAT). Branch: `arena/c6158e8e-naijacheck`; PR: [#3](https://github.com/nnamdimichael020-wq/naijacheck/pull/3). Production/DNS/Worker attachment and `naijacheck.ng` canonical configuration were not changed.

## Evidence boundaries

- **Live production observation:** GitHub-hosted runner crawl of the unchanged `https://naijacheck.nnamdimichael020.workers.dev` deployment at 08:23 UTC. This is the current production build, not this branch.
- **Runner source evidence:** isolated Live Monitor Action runs on this branch, especially full-success run [38036721407](https://github.com/nnamdimichael020-wq/naijacheck/actions/runs/38036721407).
- **Local branch evidence:** clean static export, exhaustive static audit, Wrangler HTTP crawl/smoke tests, parser/import tests, and dry-run deployment.
- **Preview evidence:** Cloudflare Workers Builds checks are build/deploy evidence only. Interactive browser behavior is not inferred from them.
- **Browser/device evidence:** unavailable in this environment. Search, install/offline lifecycle, native share/clipboard permissions, local watchlist UX, location allow/deny, responsive behavior, and assistive technology remain explicitly unverified; use `docs/runbooks/browser-qa.md`.

## Live production crawl (unchanged production)

Evidence: `docs/evidence/live-worker-crawl-2026-10-10.json`.

- Required live routes `/`, `/status`, `/prices`, `/trends`, `/hustle`, `/tools`, `/robots.txt`, `/sitemap.xml`, and `/api/geo` all returned **200**.
- Recursive crawl: **188 reachable routes**, all 200; **0 fetch errors** and **0 broken internal links**.
- The evidence records per route: HTTP status/final URL, canonical host/URL, title, description, H1, JSON-LD count, external source links, and freshness/state excerpts.
- Production still reflects older `main`: for example `/status` has the duplicate title `Data status | NaijaCheck | NaijaCheck`, and older food/city output remains deployed. Branch fixes below are therefore not claimed live.
- Canonicals remain `https://naijacheck.ng` per owner instruction even though requests were made to the existing `workers.dev` deployment.

## Local branch crawl and Worker smoke

Evidence: `docs/evidence/local-static-crawl-2026-10-10.json` and `docs/evidence/local-worker-http-crawl-2026-10-10.json`.

- Static export: **171 HTML routes**; sitemap: **135 URLs**; no sitemap-missing/indexed-not-in-sitemap routes, broken links, wrong canonical hosts, missing title/description/canonical/H1, or invalid JSON-LD.
- Only duplicate title/description pair is the expected directly addressable `/404` and `/_not-found` export.
- Actual Wrangler HTTP crawl requested **171 generated HTML routes plus required non-HTML routes**: all expected routes returned 200; an unknown route returned 404.
- Worker smoke: `/api/geo` 200 with `Cache-Control: private, no-store`; `POST /api/geo` 405; unknown API/page 404. Static security headers include `nosniff`, `SAMEORIGIN`, restrictive permissions policy, and strict-origin referrer policy.
- `npx wrangler deploy --dry-run` on Wrangler 4.149.0 read 1,524 assets and completed without changing production.

## Monitoring and provenance completed

- CBN runner response was HTTP 200, 14,582 bytes, `text/html`, title `Exchange Rates | Central Bank of Nigeria`. The static page exposes the exact `Date` and `NFEM Rate (₦/US$)` schema and its official `/api/GetAllNFEM_RatesGRAPH` endpoint.
- CBN parsing is now schema-gated: no arbitrary nearby number is accepted. The parser selects the newest valid official `ratedate`/`weightedAvgRate` row; captured fixtures include positive and rejection cases.
- Full-success runner evidence at 08:06 UTC: CBN, Aboki, open.er-api, Awajis, news, and Wikimedia all succeeded. CBN source time was 9 October 14:00 UTC; Awajis source time was 9 October 23:21 UTC. The stable public Immigration page `https://immigration.gov.ng/passports/` also fetched and fingerprinted successfully.
- Awajis now supports decimal medians/table prices, optional `₦`, independent PMS/AGO/LPG detection, reordered headings, and source-published month/day or day/month WAT times. Depot data stays wholesale.
- Per-source Action summaries and short sanitized diagnostic artifacts are implemented. Sanitized diagnostics include HTTP/final URL/content type/size/title/table shape/resource hints/excerpt; raw pages are not retained. The workflow fails when every critical FX/fuel source fails while preserving last-good snapshots.
- CBN, parallel FX, open.er-api cross-rates, depot fuel, retail pump references, food, telecom, exams, government fees, news/pageview signals, and official-page watches now have independent registry states/provenance. Page changes preserve a human-review task and never auto-edit fees.
- Genuine history remains forward-only, changed-observation deduplicated, and bounded at 400 points.

## Official/manual data safeguards

- NBS Food/PMS/AGO/LPG catalogue URLs are pinned in a tested import/validation path (`scripts/nbs/import.ts`). It requires survey month, publication date, state/national geography, exact units, official catalogue URL, explicit CSV column mapping, positive values, and no duplicates. It rejects city labelling and does not auto-publish.
- Exact manual update procedures are in `docs/runbooks/manual-sources.md`. The newest downloadable catalogue files still require a human licence/file/schema review; no NBS values were fabricated or presented as imported.
- Lagos cost-index scaling was removed. Food/cookbook/cost-of-living output now uses only four cities with explicit legacy rows; missing cities stay unavailable. These rows are labelled dated, unverified planning estimates—not live quotes, receipts, or NBS city data.
- Retail pump references remain separate from monitored wholesale depots. Telecom, admissions and government fees are seeded/unavailable until the documented official/manual fields are verified.
- Real push was not falsely implemented. `/status` now has an explicitly page-open local watchlist: rules stay in browser storage, make no server request, and request no notification permission. Secure VAPID/D1 push remains owner/privacy work.
- Community submissions stay closed; monetization/payment/analytics/newsletter remain disabled.

## Dependency audit and compatibility

Before: production audit **10** (1 critical, 6 high, 3 moderate); full audit **19** (1 critical, 14 high, 3 moderate, 1 low).

Applied without `--force`: Node/Cloudflare build runtime → **22** (required by Wrangler 4.149), Next 14.2.35 → maintained **15.5.27**, React/React DOM → **19.3.0**, ESLint/config → **9.39.5/15.5.27**, PostCSS → **8.5.29**, Tailwind 3.4.19, Wrangler → **4.149.0**. Dynamic route params and flat ESLint compatibility config were migrated. Next 16.4.0 passed locally but repeatedly failed the configured Cloudflare branch build, so it was not left as a release candidate.

After: production audit **10** (6 high, 4 moderate); full audit **12** (8 high, 4 moderate), with **0 critical**. Remaining paths are primarily build/lint tooling: Tailwind 3 → chokidar/fast-glob/micromatch/braces and postcss-nested/postcss-selector-parser; eslint-config-next → fast-glob. The remaining Next moderate report is through its bundled PostCSS and npm offers only the Cloudflare-incompatible semver-major Next 16 path. npm offers no patched Tailwind 3 fix and misleadingly suggests downgrading eslint-config-next to older tooling. Next 16/Cloudflare diagnosis and Tailwind 4 migration/removal remain required; no forced fix was used.

Compatibility passed: `npm ci`, typecheck, lint, 12 monitor parser tests, NBS importer tests, Next 15 production build, static audit, Wrangler dry-run, exhaustive local HTTP crawl, Worker security/API smoke, and source-by-source monitor run.

## Remaining actions by responsibility

### Implemented, awaiting owner/device/legal work

- Real-browser/device checklist: PWA install/offline/update, search keyboard UX, native share/clipboard/WhatsApp fallbacks, location allow/deny, mobile/2G behavior, and local watchlist storage/privacy.
- Human review/import of the newest NBS catalogue files and official telecom/admissions/fee values.
- Privacy/legal review before any server-side subscriptions, submissions, analytics, ads, newsletter, affiliates, or payment.
- Optional real push only after owner verifies current zero-cost limits and securely provisions Worker secrets/D1/VAPID; no secrets belong in chat or Git.

### Blocked or deliberately not done

- Production/domain/canonical/Worker routing changes are prohibited and remain untouched.
- No graphical browser or browser automation executable was available; browser tests are not claimed.
- Sandbox TLS cannot directly reach `workers.dev`; the live crawl used a GitHub-hosted runner and is clearly separated from local evidence.
- Tailwind 3 has no patched in-major release for the residual audit chain; Tailwind 4 migration needs a separate compatibility pass.
- PR #3 remains open and unmerged pending explicit approval.