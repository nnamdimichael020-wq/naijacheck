# Google-readiness evidence — 2026-10-15 (UTC)

Purpose: record what was checked, what changed, and what remains owner-only for the Google
Search Console phase. Everything "code-side" below is machine-enforced by `npm run audit:static`;
everything "owner" is a manual step in
[`../runbooks/google-search-console-owner-setup.md`](../runbooks/google-search-console-owner-setup.md).
No ranking claims are made anywhere in this phase.

## 1. What was audited

A production static export was enumerated page by page (`npm run build` → `out/`, then
`node scripts/audit-static.mjs`) and compared against the emitted `sitemap.xml` and `robots.txt`:

- **172** exported HTML documents total.
- **137** are public and indexable; **35** are deliberately excluded from indexing:
  `/404`, `/admin` (noindex stub), `/offline` (noindex fallback, `public/offline.html`), and the
  32 `hustle-combo` city/capital permutation pages (each carries a `noindex` robots meta, per
  `lib/seo.ts`, until each has distinct sourced value).
- Worker dynamic surface (`/api/geo`, `/api/push/*`, `/api/telegram/*`) serves JSON with
  `no-store` (see `worker/index.ts`) and is not part of the export — it belongs in `robots.txt`
  disallow, not in the sitemap.

## 2. Gap table — before → after

| Check | Before (main `7ac728f`) | After (this branch) |
|---|---|---|
| Indexable pages listed in sitemap | 137 / 137 (correct by construction) | 137 / 137 — now **enforced**: audit exits 1 if any indexable page drops out of the sitemap (`indexedNotInSitemap`) |
| Noindex pages kept out of sitemap | implicit (generator filter) | **enforced**: new `noindexInSitemap` guard exits 1 (`/admin`, `/offline`, 32 hustle permutations verified absent) |
| `robots.txt` disallow list | `/admin` only — the Worker API surface (`/api/*`) was crawlable | `/admin` **and** `/api/` disallowed; public pages still `Allow: /` |
| robots directives machine-checked | never checked | **enforced**: new `robots.ok` guard asserts allow-all, admin+api blocked, and the exact sitemap URL; exit 1 on regressions |
| Sitemap URL in robots | `https://naijacheck.ng/sitemap.xml` (from `config/site.ts`) | unchanged — confirmed correct for the committed canonical host config; guard now locks it |
| Sitemap `lastmod` for `/` and `/status` | stale hardcoded `2026-10-09` | real revision date: latest genuine monitor check in `data/live/` (`2026-10-15` at audit time); still never the build clock |
| Homepage + 10 hubs title/description/canonical pattern | consistent (`pageMetadata`, unique per path, canonical on committed host) — verified, unchanged | same pattern re-verified on `/`, `/prices`, `/prices/markets`, `/trends`, `/hustle`, `/tools`, `/howto`, `/exam`, `/telecom`, `/learn`, `/tools/cookbook`, `/status`: 0 missing, 0 duplicate titles/descriptions |
| Broken internal links | 0 | 0 (137 pages re-crawled) |
| JSON-LD validity | 0 invalid blocks | 0 invalid blocks |
| GSC account procedure | none — nothing documented | `docs/runbooks/google-search-console-owner-setup.md`: novice steps for property, verification file in `public/`, sitemap submit, indexing requests |
| DNS / domain / canonical host | `naijacheck.ng` committed config on `workers.dev` hosting | **unchanged by design** — the `.ng` domain is the separate, paid, owner decision (runbook section 5) |
| Ranking claims | none | none (runbook explicitly forbids fake claims, cloaking, honeytokens, link buying) |

## 3. Commands run on this branch (2026-10-15, Node v22)

| Command | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npm run build` | exit 0 — 177 static pages generated, export complete |
| `node scripts/audit-static.mjs` | exit 0 — `sitemapUrls: 137`, `sitemapMissing: []`, `indexedNotInSitemap: []`, `noindexInSitemap: []`, `robots.ok: true`, `brokenInternalLinks: []`, `missing.{title,description,canonical,h1}: []`, `duplicateTitles/Descriptions: []`, `invalidJsonLd: []` |
| Negative control: `/status` removed from `out/sitemap.xml`, `/api/` disallow removed from `out/robots.txt` | audit exit **1**, reported `indexedNotInSitemap: ["/status"]` and `robots.apiBlocked: false` → guards fire as intended; pristine output restored and re-audited to exit 0 |
| `npm test` (`site`, `headline`, `monitor`, `chart`, `push`, `telegram`, `nbs` suites) | exit 0 |
| Static smoke of the export (`/`, `/sitemap.xml`, `/robots.txt`) | all HTTP 200 with expected bodies (`Allow: /`, `Disallow: /admin`, `Disallow: /api/`, `Sitemap: https://naijacheck.ng/sitemap.xml`; 137 `<url>` entries) |

## 4. Owner-only checklist (nothing here can be done from the repo)

Owner steps, after an approved merge and deploy — full detail in the runbook:

1. Add a **URL-prefix** GSC property for the live `workers.dev` host (Domain property is impossible there: no DNS records on `workers.dev`).
2. Verify ownership with the GSC **HTML file**, committed byte-for-byte to `public/` via a normal PR, then click Verify. The file is not a secret.
3. Submit `sitemap.xml` in that property. Expect "Success" fetch with all `<loc>` pointing at `https://naijacheck.ng/…` — normal pre-domain state, not an error to "fix".
4. Request indexing (URL Inspection) for `/`, `/status`, and the top how-to URLs (`/howto/passport-renewal-2026`, `/howto/nin-correction`, `/howto/bvn-correction`, `/howto/cac-business-name`, `/howto/freelancer-tax-tin`). Manual quota ≈ 10–12/day; requests are queue hints, never guarantees.
5. Later, **only** as a separate paid owner decision: buy the `.ng` domain, point DNS, add the Worker custom domain; then add a GSC Domain property, resubmit the sitemap, re-request indexing. No code change is needed for canonicals — `config/site.ts` already declares them.
