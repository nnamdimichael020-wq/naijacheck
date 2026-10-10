# Manual source updates

Every update uses a branch and PR. Record source URL/name, source or effective date, fetch/check date in UTC, geography, value and unit, verification method, reviewer and limitation. Keep UTC in storage and display useful WAT separately. If a required field is absent, keep the last-good value explicitly stale or mark it unavailable.

## NBS monthly references

Use the official catalogues for Food Price Watch (`/catalog/162`), PMS (`/catalog/157`), AGO (`/catalog/158`) and LPG (`/catalog/160`) at `https://microdata.nigerianstat.gov.ng/`. Download the publisher CSV manually; do not scrape a login. Create a local mapping such as:

```json
{ "geography": "State", "item": "Item", "value": "Average", "unit": "Unit" }
```

Run, with the publication's real metadata:

```bash
npm run nbs:import -- food /safe/path/file.csv \
  --survey-month 2026-09 --publication-date 2026-10-08 \
  --geography-level state \
  --source-url https://microdata.nigerianstat.gov.ng/index.php/catalog/162 \
  --mapping /safe/path/mapping.json
npm run nbs:test
```

Use the matching category/catalogue for PMS, AGO or LPG. The importer rejects city geography, missing units, invalid values, duplicates, wrong catalogue URLs and malformed dates. NBS state/month surveys are not live city prices. Never infer a missing city or convert pack sizes without a reviewed methodology.

## Telecom

Use the operator's official current page, app or USSD: MTN, Airtel, Glo or 9mobile. Every offer needs network, plan/data amount, price, validity, eligibility, purchase method, official source URL and check date. If eligibility or validity is unclear, remove the offer and link users to the carrier. Never infer a “best” plan.

## Admissions and cut-offs

Use `https://www.jamb.gov.ng/` for national policy and the institution's official portal for institution/course values. Store session and level (national, institution or course) separately. A previous session, blog range or national minimum must not be displayed as a current course cut-off.

## Government fees and timelines

Use the responsible agency's stable public information page. Immigration uses `https://immigration.gov.ng/passports/`; never scrape application, login or payment flows. Store service, components, category, effective date, exact timeline wording, URL, check date and reviewer. A watcher change only opens human review; it cannot auto-edit a fee.

## Food, fuel and editorial observations

A manual observation needs exact item/product, unit, market/station, city/state, observed value/range, observation time, permitted evidence, collector and reviewer. Keep retail pump separate from wholesale depot. Do not describe seeded/manual/old data as live. Slang requires dated usage/editorial evidence; Google News and Wikimedia are only mention/pageview signals.

## Validation and release

Run generation, typecheck, lint, relevant tests, build, static crawl, local Worker smoke and branch preview. Check labels, units, source/effective/check times, WAT rendering, mobile tables and outbound source links. On failure, do not publish the update: retain last-good stale data or mark unavailable. Follow `release-after-approval.md`; never push directly to `main` or merge without approval.
