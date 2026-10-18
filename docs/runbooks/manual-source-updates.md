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

## NBS Food Price Watch vs market prices

Use the NBS Microdata Catalog (`https://microdata.nigerianstat.gov.ng/index.php/catalog/162`) for the Selected Food Price Watch. Read the catalog's methodology and release list; download the release ZIP manually and open the PDF and XLSX. Do not scrape a login, an application flow or a paid data service.

Rules that stop this going wrong:

1. **A monthly survey average is not a live market price.** Quote the survey month and the publication date, not the download date. The May 2026 release, for example, was dated 25 June 2026.
2. **Match the item and unit before comparing.** "Rice local sold loose" is not a branded 50kg bag. A 50kg bag is ₦X ÷ actual kg, not ₦X ÷ an assumed 50.
3. **Never convert local measures by a fixed table.** Cups, mudus, dericas and paint buckets vary by seller and product. The guide tells readers to weigh their own purchase; the runbook must not introduce a national conversion.
4. **No state row becomes a city price.** NBS reports state, zone and national averages. A Lagos or Aba market is not the state average, and the national figure is an average of the state averages.
5. **Import only through the tested path.** Use `npm run nbs:import -- food <file.csv> --survey-month YYYY-MM --publication-date YYYY-MM-DD --geography-level state|national --source-url https://microdata.nigerianstat.gov.ng/index.php/catalog/162 --mapping <mapping.json>`, then `npm run nbs:test`. The importer rejects city geography, missing units, invalid values, duplicates, wrong catalogue URLs and malformed dates.
6. **Keep the page honest while rows are unimported.** If a release has not been read and imported, keep the figures `unavailable` and let readers open the official release themselves. Do not paste a news report's summary of the NBS figures.
7. **Update the trail.** Change `data/govhowto.json` (`lastVerified`, `sourceNote`, `unverifiedItems`), add the release date and any imported rows to `docs/content-gap-queue.md`, and update this runbook only if the method changes.

## Telecom

Use the operator's official current page, app or USSD: MTN, Airtel, Glo or 9mobile. Every offer needs network, plan/data amount, price, validity, eligibility, purchase method, official source URL and check date. If eligibility or validity is unclear, remove the offer and link users to the carrier. Never infer a “best” plan.

## Admissions and cut-offs

Use `https://www.jamb.gov.ng/` for national policy and the institution's official portal for institution/course values. Store session and level (national, institution or course) separately. A previous session, blog range or national minimum must not be displayed as a current course cut-off.

## Government fees and timelines

Use the responsible agency's stable public information page. Immigration uses `https://immigration.gov.ng/passports/`; never scrape application, login or payment flows. Store service, components, category, effective date, exact timeline wording, URL, check date and reviewer. A watcher change only opens human review; it cannot auto-edit a fee.

## Prepaid electricity bands and NERC tariffs

Use `https://nerc.gov.ng/faq/electricity-tariffs/` for the Service-Based Tariff band definitions (A 20h, B 16h, C 12h, D 8h, E 4h) and for NERC's own method of working out an effective rate from a vending receipt.

Use the monthly supplementary orders in the NERC resources library (`https://nerc.gov.ng/resources/`) for ₦/kWh rows. Read the "Approved Allowed Tariffs" table in the order for the DisCo you are quoting, and record the order number, the DisCo, the states the order covers, the effective date and the check date.

Two rules that stop this going wrong:

1. **Never present one DisCo's rate as national.** Band A happened to match across the two September 2026 orders we read, but Bands B–E did not.
2. **Check whether the order covers "yet to be transitioned states" only.** Where a state has moved to its own electricity regulator, that regulator sets the rate, not NERC.

Store the rows in `data/govhowto.json` under the `prepaid-electricity-bands` doc, update `lastVerified`, and list anything you could not verify under `unverifiedItems`. Units-per-naira figures are our own division of a verified rate and must always be labelled as before VAT and fixed charges.

## FRSC driver's licence

Use `https://frsc.gov.ng/` (Service Level Agreements and the ARC Compendium) and `https://www.nigeriadriverslicence.org/` for process steps, the 60-day service standard and the one-month renewal window. Never scrape the application, login or payment flow.

**Current card fee (owner-verified 18 October 2026):** ₦15,000 for a three-year standard motor vehicle licence card and ₦21,000 for a five-year card, as reported by the site owner from the official portal's Remita payment step. Store both amounts with the check date, the attribution and the verification state `manual`. Do not attribute them to a blog, a forum or a third-party fee table.

Rules that stop this going wrong:

1. **The card fee is not the whole cost.** Learner's permit, driving school and VIO test charges are set locally and differ by state. Never print a national figure for them and never invent a state amount. Say plainly that they are separate from the ₦15,000 / ₦21,000 card fee.
2. **The live Remita total is the authority.** Banks and payment channels may add a small convenience fee. If the portal's total differs from the published amount, readers pay the portal total against the reference the portal generates.
3. **The April 2024 SLA is superseded.** It listed ₦10,350 (3-year) and ₦15,450 (5-year). Keep those only as historical context when explaining why older pages show less; never present them as the current fee.
4. **Re-check method.** Start a licence application in the portal and read the total at the Remita step. Do not submit payment, do not automate or scrape the login/payment flow, and do not record personal data. Update `data/govhowto.json` (`fee`, `feeSource`, the fee table, `sourceNote`, FAQs, `lastVerified`) and `docs/content-gap-queue.md` in the same PR.
5. **Review triggers.** A changed fingerprint on `frsc-licence-portal` or `frsc-sla` opens human review; it never edits a fee by itself. If a future check cannot read the portal amount, keep the last-good amount explicitly dated and stale rather than guessing, and tell readers the live Remita total governs.

## Lagos State residency registration (LASRRA / LAG-ID)

Use the LASRRA registration portal at `https://registration.lagosresidents.gov.ng` — never the agency's social posts, an agent's page or a "concierge" listing — for:

- `/help/requirements` — the documents the centre asks for (adult proof of residence + one photo ID from the list; children's birth certificate and photographs).
- `/help/howto` — the online form, the printed confirmation page and the Online Registration Id.
- `/help/enrollment` — the LG/LCDA centre locator. Read the count of listed LG/LCDAs from the live page; never copy addresses into `data/`, because centres move and a stale address is worse than none.
- `/help/faq` and `/help/answers?f=N` — the agency's own rules: free card and registration, biometrics captured, temporary card validity, printing window, collection by SMS, replacement cards, corrections and error holds.
- `/validation/` — the validation exercise wording.

Supporting official sources: Lagos State Identity Management services (`https://lagosstate.gov.ng/services/identitymanagement`), Lagos State Citizens Gate (`https://citizensgate.lagosstate.gov.ng/`) for the LASRRA ID + NIN + Citizen ID requirement, the Office of Education Quality Assurance school-enrolment press release (`https://oeqalagos.com/lasg-makes-lasrra-number-mandatory-for-school-enrolment/`) and the Lagos State Ministry of Health note on the LASHMA card readers.

Rules that stop this going wrong:

1. **Publish ₦0, or publish nothing.** The registration and the first card are free by the agency's own FAQ. Never repeat an agent's or a blog's figure for "fast" registration. A replacement-card charge is mentioned by the FAQ without an amount: keep it `unavailable` until a LASRRA desk confirms the current figure.
2. **No office addresses.** Point readers to the portal's locator and say why: LASRRA relocates centres and the locator is the only live list.
3. **Do not state a NIN requirement that the portal does not state.** The identity list names the National ID card, not the NIN slip. NIN appears in downstream state services (Citizens Gate financial assistance), so attribute it there.
4. **Flag the agency's own inconsistencies instead of picking a side** — the three-month versus six-month residency wording, and the 18 versus over-21 age for the adult registering a child.
5. **The informational site can be down.** `www.lagosresidents.gov.ng` was returning a WordPress critical error on 12 October 2026. If it comes back, re-read the FAQ and Mandate pages and reconcile them against the portal; if it stays down, keep quoting the portal.
6. **Never collect or store personal data.** Do not ask readers for NINs, registration numbers or documents, and do not scrape the registration or validation flows (login and payment paths are off-limits).

Update `data/govhowto.json` under the `lasrra-lagos-residency` doc, refresh `lastVerified`, add anything you could not confirm to `unverifiedItems`, and keep the `docs/content-gap-queue.md` verification log in step. The monitor fingerprints `/help/requirements` and `/help/faq`; a changed fingerprint opens human review and never edits the page by itself.

## Food, fuel and editorial observations

A manual observation needs exact item/product, unit, market/station, city/state, observed value/range, observation time, permitted evidence, collector and reviewer. Keep retail pump separate from wholesale depot. Do not describe seeded/manual/old data as live. Slang requires dated usage/editorial evidence; Google News and Wikimedia are only mention/pageview signals.

## Validation and release

Run generation, typecheck, lint, relevant tests, build, static crawl, local Worker smoke and branch preview. Check labels, units, source/effective/check times, WAT rendering, mobile tables and outbound source links. On failure, do not publish the update: retain last-good stale data or mark unavailable. Follow `release-after-approval.md`; never push directly to `main` or merge without approval.
