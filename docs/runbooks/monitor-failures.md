# Monitor failures

## Scope and expected schedule

`.github/workflows/live-monitor.yml` runs every three hours on the default branch and supports manual dispatch. It reads each source independently. CBN, Aboki, open.er-api, Awajis, Google News RSS, Wikimedia Pageviews, and the public Immigration passport-information watcher must each have their own status, checked time, source/effective time where available, last success, and sanitized error.

The job fails visibly when **all** critical FX/fuel sources (`cbn`, `aboki`, `openEr`, `awajis`) fail. One healthy source does not make another healthy. A scheduled workflow added on a feature branch begins operating only after an approved merge places it on the repository's default branch.

## Triage a run

1. Open GitHub **Actions → NaijaCheck source monitor → failed/partial run**.
2. Read every row in the Action summary; “workflow succeeded” is not proof that every source succeeded.
3. Inspect `data/live/health.json` and bounded `data/live/diagnostics.json` from the run's branch/commit.
4. If available, download `monitor-diagnostics`. It must contain only status, final URL, content type, byte size, title, schema/resource hints and a short redacted excerpt—never cookies, credentials, full pages, challenge bodies or secrets.
5. Classify the incident by exact source: network/timeout, HTTP/block page, schema mismatch, invalid value, unchanged public-page fingerprint, or repository write/commit failure.
6. Preserve the last-good value with stale/unavailable state. Never relabel it live from the workflow's current run.

## Source-specific rules

- **CBN:** require the official page's exact `Date` and `NFEM Rate (₦/US$)` table schema before reading `/api/GetAllNFEM_RatesGRAPH`; select the newest valid `ratedate`/`weightedAvgRate`. Never accept a nearby arbitrary number.
- **Aboki:** keep parallel buy/sell separate from official CBN and open.er-api cross-rates.
- **Awajis:** depot figures are wholesale; never copy them into retail pump data.
- **News/Wikimedia:** these are news/pageview signals, not X, TikTok or social-platform trends.
- **Immigration/JAMB/NIMC/watchers:** inspect stable public information only. Never scrape login/payment flows. A fingerprint change requires human review and cannot auto-change a fee or rule.

## Safe recovery

1. Reproduce with `npm run monitor:test`, then add a minimal sanitized fixture and a rejection test before parser changes.
2. Run `npm run monitor` only if outbound source access is available. Record source-by-source results, not a single aggregate “pass”.
3. Dispatch the workflow once on the branch/default branch appropriate to the investigation.
4. Confirm UTC storage and useful WAT display remain distinct. Check source time, fetch/check time and last-success time separately.
5. If the upstream is still unavailable, leave last-good state stale/unavailable and open a review issue containing only sanitized diagnostics.
6. Never broaden parsing to get green status, bypass a challenge, manually invent a reading, fabricate/backfill history, or commit a raw page.

## Push interaction

The push cron accepts a critical change only when the corresponding `aboki.ok` or `awajis.ok` health flag is true and the source time is newer. A failed source cannot produce a push. If a monitor or parser is suspect, disable/withhold push deployment rather than sending a guessed message. The first valid observation establishes a baseline and sends nothing.
