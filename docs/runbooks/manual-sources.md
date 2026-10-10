# Manual and official-source updates

All changes use a branch/PR and preview. Record source URL, source/effective date, fetch/check date (UTC), geography, unit, method, and reviewer. If any required field is missing, retain the last-good value as stale or mark unavailable.

## NBS monthly references

Candidate official catalogues:

- Food Price Watch: `https://microdata.nigerianstat.gov.ng/index.php/catalog/162`
- PMS Price Watch: `https://microdata.nigerianstat.gov.ng/index.php/catalog/157`
- AGO Price Watch: `https://microdata.nigerianstat.gov.ng/index.php/catalog/158`
- LPG Price Watch: `https://microdata.nigerianstat.gov.ng/index.php/catalog/160`

These catalogues must be checked for a newer usable publication before import. Download the publisher's CSV manually; do not scrape a login. Create a mapping JSON naming the exact CSV columns, for example:

```json
{ "geography": "State", "item": "Item", "value": "Average", "unit": "Unit" }
```

Run:

```bash
npm run nbs:import -- food /safe/path/file.csv \
  --survey-month 2026-09 --publication-date 2026-10-08 \
  --geography-level state \
  --source-url https://microdata.nigerianstat.gov.ng/index.php/catalog/162 \
  --mapping /safe/path/mapping.json
npm run nbs:test
```

For PMS/AGO/LPG, use the matching catalogue URL and category. Pass `--unit` only when the publication explicitly gives one common unit. The importer rejects city geography, missing units, invalid values, duplicates, wrong catalogue URLs, and malformed dates. Preserve survey month and publication date. Never label a state/month average as a live city price or convert LPG pack sizes without a documented methodology.

## Telecom

Check the operator's official plan page/app or USSD flow: MTN (`https://www.mtn.ng/`), Airtel (`https://www.airtel.com.ng/`), Glo (`https://www.gloworld.com/ng/`), and 9mobile (`https://9mobile.com.ng/`). For every displayed offer record network, plan name/data amount, price, validity, eligibility, purchase method, official source URL, and check date. Preview every network page and calculator. If eligibility or validity is unclear, remove the offer and link to the operator; never infer “best value.”

## Admissions and examinations

Use `https://www.jamb.gov.ng/` for national JAMB policy and the institution's official admissions portal for institution/course/session figures. Store session, level (national/institution/course), score or rule, publication date, URL, and reviewer. Never substitute a blog range for an official cut-off. If the session expires or the official list is unavailable, show unavailable/previous-session—not current.

## Government fees and timelines

Use the responsible agency's stable public information page. Immigration uses `https://immigration.gov.ng/passports/`; never scrape its login, application, or payment flow. Record service, fee components, applicant category, effective date, timeline wording, source URL, and check date. A fingerprint change opens a human review only. Until reviewed, retain the prior value as stale or hide it.

## Food/pump/editorial updates

A manual market observation needs item/product, exact unit, market or station, city/state, observed range/value, observation time, collector/reviewer, and permitted evidence. Keep retail pump separate from depot wholesale. Editorial slang requires an editor and dated usage evidence; Google News/Wikipedia counts are only news/pageview signals.

## Preview and fallback

Run generation, tests, build, static audit, and local crawl. Check labels, units, WAT/UTC rendering, mobile tables, and source links in a branch preview. On any validation or preview failure, do not publish: preserve last-good data with stale state or use unavailable.