# Monitoring runbook

## Scope and cadence

`.github/workflows/live-monitor.yml` runs every three hours on the default branch and can be dispatched manually. It reads each source independently; one success never changes another source's state or timestamp.

| Key | Dataset | Source |
|---|---|---|
| `cbn` | Official USD/NGN NFEM | `https://www.cbn.gov.ng/rates/ExchRateByCurrency.html`, schema-gated data from `/api/GetAllNFEM_RatesGRAPH` |
| `aboki` | Parallel-market buy/sell | `https://abokiforex.app/` |
| `openEr` | USD-based reference cross-rates | `https://open.er-api.com/v6/latest/USD` |
| `awajis` | Wholesale depot PMS/AGO/LPG | `https://awajis.com/fuel-price-in-nigeria-today/` |
| `news` | News mention signal | Google News RSS; not a social-platform trend |
| `wiki` | Pageview signal | Wikimedia Pageviews; not a social-platform trend |

JAMB, NIMC, the public Immigration passport information page, and CBN home page are fingerprint watches. A change creates/preserves `reviewRequired`; it never updates a fee or rule.

## Reading a run

1. Open the run and read **NaijaCheck source monitor** in the Action summary.
2. Check every row, its source time, last success, and error. “Workflow success” does not mean every source succeeded.
3. Download `monitor-diagnostics` when present. It contains only status, final URL, content type, byte size, title, table shape/resource hints, and a short redacted excerpt; no full response body.
4. Inspect `data/live/health.json`, `diagnostics.json`, and each dataset snapshot. UTC is stored; the UI may render WAT.
5. A run is full source success only when CBN, Aboki, open.er-api, Awajis, feeds/pageviews, and the Immigration watch all succeeded. Runs with CBN/fuel/Immigration failures must be reported as partial.

The job fails visibly if all critical FX/fuel sources (`cbn`, `aboki`, `openEr`, `awajis`) fail. Last-good values remain in place with stale state.

## Parser failure

- Do not broaden a regex to accept a nearby number.
- CBN requires the page's `Date` and exact `NFEM Rate (₦/US$)` column. The official JSON endpoint is read only after this schema gate, and the newest valid `ratedate`/`weightedAvgRate` row is selected.
- Add a minimal sanitized captured fixture and a rejection test before changing a parser.
- If CBN is blocked/challenged or its schema cannot be verified, keep it stale/unavailable. Manually enter nothing from a challenge page.
- Awajis depot values remain wholesale; never copy them into retail pump fields.

## Recovery

Re-run parser tests, then dispatch once. If a publisher is unavailable, leave last-good state and open a review issue with the diagnostic metadata. Never commit raw pages, bypass a challenge, fabricate a point, or backfill history. `data/history.json` accepts only changed, timestamped successful observations and is bounded.