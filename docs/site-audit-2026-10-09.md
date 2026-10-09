# NaijaCheck site audit — 2026-10-09

Audit window: 2026-10-09 19:59–20:10 UTC. Repository base: `ff5de36`; branch: `arena/c6158e8e-naijacheck`.

## Scope and evidence boundaries

### Public deployment attempts

The audit attempted `GET` requests to the supplied public origin for `/`, `/status`, `/prices`, `/trends`, `/hustle`, `/tools`, `/robots.txt`, `/sitemap.xml`, and `/api/geo`. Every request failed before HTTP with `curl` status `000` and `OpenSSL SSL_connect: SSL_ERROR_SYSCALL`. The sandbox has an outbound-host allowlist that does not include `workers.dev`; this is **not evidence that the deployment was down**. No browser was available, so this report does not claim a current live-site browser crawl or interactive live-site result.

A DNS lookup for `naijacheck.ng` returned no address in this restricted sandbox and HTTPS could not be attempted. Ownership and Worker attachment cannot be inferred. Per the owner's instruction, this work does not change DNS, Worker attachment, the existing production host, or the main-branch `naijacheck.ng` canonical configuration. Domain/canonical remediation is explicitly outside this change.

### GitHub monitor evidence

At audit start GitHub had no recorded monitor run. Two isolated branch runs were then triggered without touching `main` or production; both completed successfully. The latest run is [GitHub Actions run 37994223339](https://github.com/nnamdimichael020-wq/naijacheck/actions/runs/37994223339), checked sources at `2026-10-09T21:34:27.978Z`, committed its snapshots to this PR branch, and left the normal final workflow triggers as schedule plus manual dispatch. Cloudflare's final PR preview build completed successfully; no production deployment or domain/route change was made.

Latest source-specific evidence:

- CBN parser: failed (`layout not recognised`); the original CBN value remains explicitly **seeded**, not live.
- Awajis fuel parser: failed (`layout not recognised`); wholesale fuel remains explicitly **seeded**, not live.
- Aboki parallel-market quote and open.er-api cross-rates: successful, with separate source states/times.
- Headline topics: six successful feeds; not treated as fact verification.
- Attention signals: 20 news terms and six Wikimedia series; explicitly not X/TikTok activity.
- Official-page watch: JAMB, NIMC and CBN read successfully; Immigration fetch failed. A fingerprint only creates a review flag.
- History: one genuine changed parallel-market observation; no chart is shown until a dataset has two observations.

Food/city prices, retail pump prices, telecom bundles, fees, school/admission data and cut-offs are manual or indicative and are not made current by this workflow.

## Local exhaustive crawl

After a clean production build, `scripts/audit-static.mjs` enumerated every exported HTML document and every sitemap URL, parsed title, meta description, canonical, H1, JSON-LD and internal links, and checked local targets. The built Worker was also served by Wrangler and HTTP-smoked.

- Exported HTML routes: **212** (includes `/404`, disabled `/admin`, and noindex `/offline`).
- Article records/generated content routes: **205**.
- Sitemap URLs: **177** = 173 indexable article routes + `/`, `/about`, `/status`, `/privacy`.
- Repetitive hustle city/capital permutations withheld from indexing: **32**; pages remain locally reachable and are marked `noindex`.
- Broken internal links: **0**.
- Sitemap URLs without a generated route: **0**.
- Indexable generated routes absent from sitemap: **0**.
- Wrong canonical hosts: **0**.
- Duplicate non-empty titles/descriptions: **0 / 0**.
- Missing H1/title: **0 / 0**.
- Invalid JSON-LD blocks: **0**.

Routes by top-level page type: prices 78, hustle 41, trends 29, exam 15, tools 14, how-to 10, learn 9, telecom 9, plus home/about/admin/privacy/status/offline/404.

An exhaustive local HTTP pass requested all 212 generated HTML routes from Wrangler and all 212 returned 200 (the exported `/404` document is directly addressable; an unknown route still returns that document with status 404). Additional smoke results: `/robots.txt`, `/sitemap.xml`, `/manifest.webmanifest`, `/sw.js`, and `/api/geo` returned 200; unknown `/api/nope` and `/definitely-missing` returned 404; `POST /api/geo` returned 405; `/api/geo` returned `Cache-Control: private, no-store`. Local geo metadata was Wrangler's placeholder and is not a real visitor-location test.

## Findings and changes

1. **Canonical/indexing:** domain, production-host and canonical configuration are unchanged by owner instruction. Admin/offline are noindex; repetitive generated hustle permutations were removed from sitemap and marked noindex. Search Console steps are documented but must wait for the separately confirmed canonical decision.
2. **Data trust:** previous types represented snapshots but did not provide one shared verification-state registry. `lib/source-registry.ts` now records dataset semantics, geography/unit, source/method, source/check/last-success times, cadence, stale threshold, state and limitation. `/status` renders it and no longer calls every monitored dataset “live.”
3. **Monitor correctness:** an all-source failure previously exited successfully and FX `checkedAt` could advance even when every FX source failed. The monitor now preserves truthful check/source times, records last success, retains last-good data, and exits non-zero if every configured source group fails.
4. **History:** seeded 30-day values are not imported into first-party history. `data/history.json` starts empty; only actual successful changed observations are appended, deduplicated and capped at 400. The status chart explicitly says unavailable until two observations exist.
5. **Homepage/trends/headlines:** editorial trend scores are sorted before display. Empty headline UI says “Monitored headlines,” not “Live.” News/Wikipedia signals are labelled attention signals and never X/TikTok measurement.
6. **Titles:** `/status` supplied a title already containing the brand while the root template added it again. It is now `Data status | NaijaCheck` once.
7. **Manual datasets:** every generated price/cookbook, telecom, exam, hustle, trend and government guide now has a prominent method/status limitation. This does not turn weak inputs into verified facts; unsupported/high-change figures still need editorial source remediation.
8. **Search:** existing lazy static search was retained. It has loading/failure/no-result and keyboard handling. All four fixed indexable pages were added; normalization, useful aliases and one-edit typo tolerance were added. The final index contains 209 entries (205 articles + 4 fixed pages).
9. **PWA/offline:** a manifest, 192/512 icons, small service worker, offline fallback and offline stale-data banner were added. `/api/*` is never cached. Install/offline lifecycle was inspected and HTTP-smoked but not exercised in a real browser.
10. **Share:** generated guide pages have user-initiated Web Share with clipboard fallback and an encoded WhatsApp fallback. It shares only title, public date and URL. Browser behavior remains untested in this environment.
11. **Privacy/monetization/admin:** privacy text now reflects coarse edge geo processing, state/theme/mock flags and service-worker caches. It states that analytics, push, submissions and ad networks are off. Placeholder “Sponsored” claims were replaced with internal-related-guide labels. The insecure public admin editor is disabled.
12. **Security/dependencies:** `npm ci` reported 19 audit findings (1 low, 3 moderate, 14 high, 1 critical) in the current dependency tree. No forced major upgrade was applied without compatibility review. This remains a release risk.

## Numeric/current-fact inventory

| Dataset/page family | Method and time | Current state |
| --- | --- | --- |
| CBN USD NFEM | CBN page parser; source effective time separate from fetch | Seeded value retained; latest parser failed; never labelled live |
| Parallel quote | Third-party Aboki buy/sell parser; separate from CBN | Recent successful source reading; indicative, not official FX |
| GBP/EUR reference | `open.er-api.com` cross-rate | Recent successful reference reading; not CBN quotes |
| Fuel depot | Awajis tables attributed to petroleumprice.ng | Seeded wholesale/depot value retained; latest parser failed; not retail pump |
| Headlines | Google News RSS links | Six feeds read successfully; links/headlines are not fact verification |
| Attention signals | news mention floor + Wikimedia pageviews | Recent readings; not social-platform activity |
| Food/city and cookbook | editor estimates dated 2026-10-09; some cities scaled from Lagos | Manual/indicative; no reliable free daily feed established |
| Retail pump figures | dated editorial/news source file | Manual; not station-level live data |
| Telecom | dated comparator/sample bundle file | Manual/indicative; confirm in operator channel |
| Exam, fees, cut-offs | manually compiled, some non-official sources | Not auto-verified; official confirmation required |
| Hustle costs/timelines | editorial planning model | Estimates, not measured profits or promises |
| Official-page watch | text fingerprint | Seeded/unavailable; change can only request review |

## Interactive checks not performed

No browser automation or graphical browser was available. Mobile layout, screen-reader output, focus visibility, actual keyboard selection, install prompt, offline relaunch/update/old-cache cleanup, clipboard permission, native share sheet and WhatsApp handoff were **not browser-tested**. Build/type/lint checks and local HTTP smoke tests do not substitute for these checks.
