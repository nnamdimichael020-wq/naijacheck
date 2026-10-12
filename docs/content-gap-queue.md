# Content Gap Queue

NaijaCheck is a structured Nigerian daily utility — **not** an open forum, aggregator, or mass AI blog. Every new or refreshed guide moves through this human-reviewed queue before any prose or structured data is updated.

## Workflow & Status Rules

- **`queued`**: A real user need has been identified (manually or via local gap research), with named primary/official sources to verify before writing. No article page is published yet.
- **`writing`**: A human editor is actively verifying official portals, fee schedules, or NBS/market observations and drafting answer-first prose under [`docs/article-writing-guide.md`](./article-writing-guide.md).
- **`published`**: Verified by a human editor, linked to internal calculators/hubs, carrying explicit `updatedAt` / `lastVerified` timestamps and honest verification states (`live` | `recent` | `stale` | `seeded` | `manual` | `unavailable`), and passing static + content audits.

**Hard guardrails:**
1. Bots or local scripts may only propose rows for this table (see [`docs/runbooks/research-bot-safe-use.md`](./runbooks/research-bot-safe-use.md)).
2. Never auto-publish pages or paste forum/Nairaland text into `data/` or `content/`.
3. Never label seeded, stale, manual, or survey figures as `live`.

---

## Verification log for the three flagship guides (checked 12 October 2026)

### `/howto/prepaid-electricity-bands` — status `published`

| Figure | Value published | Official source | State |
|---|---|---|---|
| Service band definitions (A/B/C/D/E minimum daily hours) | 20 / 16 / 12 / 8 / 4 hours | NERC Electricity Tariffs FAQ, `https://nerc.gov.ng/faq/electricity-tariffs/` | `manual` |
| Approved end-user rates, Eko (EKEDP) — Ogun, from 1 September 2026 | Lifeline ₦4.00; A ₦209.50; B ₦61.00; C ₦48.53; D ₦32.48; E ₦32.44 per kWh | NERC `Order/NERC/2026/091` | `manual` |
| Approved end-user rates, Benin (BEDC) — Edo & Delta, from 1 September 2026 | Lifeline ₦4.00; A ₦209.50; B ₦68.56; C ₦56.91; D ₦41.20; E ₦41.21 per kWh | NERC `Order/NERC/2026/089` | `manual` |
| Effective-rate method (amount ÷ units, less VAT) and the 60-day service-failure review | as written | NERC Electricity Tariffs FAQ | `manual` |
| Units bought by ₦10,000 | about 48 / 164 / 206 / 308 / 308 units | Our own division of the verified EKEDP rows — flagged on the page as before VAT and fixed charges | `manual` (derived) |
| Your own DisCo's current rate | **not published** | Not verified — only two DisCo orders were read | `unavailable` |
| Rates in states with their own electricity regulator | **not published** | Set by the state regulator, not by the NERC orders cited | `unavailable` |

### `/howto/drivers-licence-frsc` — status `writing` (blocked on one figure)

Everything except the fee is verified and shipped. Blockers:

1. **Statutory licence fee.** The newest FRSC-published amount we could verify on `frsc.gov.ng` is **₦10,350 (3-year) / ₦15,450 (5-year)**, in the FRSC Service Level Agreements (Second Edition, April 2024). Higher figures are widely quoted in 2026 round-ups, but none could be confirmed on an FRSC page, so the page labels the fee `unavailable / manual` and tells readers to pay the amount the portal generates. **Owner action:** open the portal, start an application, and read the Remita amount the portal itself produces; then update `data/govhowto.json` and the `lastVerified` date.
2. **Driving school fees.** Set per school, not published nationally. Left unquoted on purpose.
3. **Learner's permit and VIO test charges.** Set by state agencies (BIR / MLA / MVAA); differ by state. Left unquoted on purpose.
4. **Actual card-collection time in each state.** FRSC's standard is 60 days; individual centres vary.

Move this row to `published` once item 1 is confirmed against the portal or a dated FRSC notice.

### `/howto/lasrra-lagos-residency` — status `published`

Every rule below was read on the LASRRA online registration portal at `https://registration.lagosresidents.gov.ng` (documents page, form guide, centre locator, FAQ and its answers, validation page) on 12 October 2026, unless a different source is named in the row.

| Figure / rule | Value published | Official source | State |
|---|---|---|---|
| Cost of registration and of the first card | ₦0 — free of charge, no cost to register | LASRRA registration FAQ, "How much does the Residency Card Cost?", `/help/faq` | `manual` |
| Adult documents | Proof of residence (rent receipt/agreement or a utility bill for that address) **plus** one photo ID from the portal's list; originals and photocopies | LASRRA `/help/requirements` and FAQ answer f=12 | `manual` |
| Identity documents accepted | International passport, National ID card, driver's licence, employee ID, student ID, tax card/receipt, association ID, letter of identification from parent/CDA/household or registered association | LASRRA `/help/requirements` | `manual` |
| Registration modes | Online form (prints a confirmation page with the Online Registration Id) plus biometrics at a centre; walk-in registration also listed | LASRRA `/help/howto` and FAQ answer f=15 | `manual` |
| Biometrics captured | Ten fingerprints, signature and face image; facial recognition covers residents without usable fingerprints | LASRRA FAQ answers f=7, f=21 | `manual` |
| Temporary registration card | Issued at the centre, valid 12 months | LASRRA FAQ answer f=23 | `manual` |
| Permanent card | Printed within 12 months, delivered to the LG/LCDA of the registered address, collected after SMS notification | LASRRA FAQ answers f=23, f=34 | `manual` |
| Error holds | Record placed on hold for enquiry; the agency says resolution may take over 5 weeks | LASRRA FAQ answer f=23 | `manual` |
| Corrections after printing | Card taken back at collection point; replacement cards ready in 10–15 working days | LASRRA FAQ answer f=25 | `manual` |
| Children (0–15) | Registered without biometrics; birth certificate, two passport photographs of the child and a copy of the registering adult's card | LASRRA FAQ answers f=19, f=20 and `/help/requirements` | `manual` |
| Age of adult registering a child | 18 in one answer, over 21 in another — discrepancy flagged on the page | LASRRA FAQ answers f=19, f=29 | `manual` (conflict noted) |
| Domestic staff | Entitled to register; notarised employer's rent receipt or utility bill as address evidence | LASRRA FAQ answers f=16, f=33 | `manual` |
| Collection points | LG/LCDA office for the registered address or LASRRA HQ; the portal locator lists **57** LG/LCDA options (counted on the live page) | LASRRA `/help/enrollment` | `manual` |
| School enrolment | Valid LASRRA registration number required for admission/enrolment from 14 September 2026, 2026/2027 session, public and private schools | OEQA press release, 3 September 2026, `https://oeqalagos.com/lasg-makes-lasrra-number-mandatory-for-school-enrolment/` | `manual` |
| Health access | LASHMA biometric card readers integrated with the LASRRA database authenticate ILERA EKO enrollees with the LASRRA ID (pilot across 100 facilities) | Lagos State Ministry of Health, May 2025, `https://lagosministryofhealth.org/lashma-deploys-ilera-eko-biometric-card-readers-in-public-and-private-hospitals/` | `manual` |
| State services | LASRRA ID + NIN + Citizen ID for state financial assistance; BRT, loans and other benefits for card holders | Lagos State Citizens Gate, `https://citizensgate.lagosstate.gov.ng/` | `manual` |
| Replacement-card charge | **not published** — the FAQ says later cards may be replaced at a charge, with no amount given | LASRRA FAQ answer f=24 | `unavailable` |
| USSD card-status short code | **not confirmed on a live agency page**; reported elsewhere as `*347*641#` and `*347641#` | Not verified 12 October 2026 | `unavailable` |
| LAG-ID five-year validity | **not confirmed live**; wording comes from LASRRA's 2022 launch statements only | 2022 launch coverage | `unavailable` |
| NIN slip as proof of identity | **not listed**; the published list names the National ID card | LASRRA `/help/requirements` | `unavailable` |
| Residency qualifying period | Portal FAQ: more than 6 months' intended stay. Agency's older material and press coverage repeat "3 months or more" | LASRRA FAQ answer f=10 vs agency informational material | `manual` (discrepancy flagged) |

Owner actions left open (see the LASRRA section of [`docs/runbooks/manual-source-updates.md`](./runbooks/manual-source-updates.md)):

1. Ask a LASRRA helpdesk or LG office for the current replacement-card charge and record it here before quoting any amount.
2. Confirm the USSD short code on a live agency page or from the LASRRA desk.
3. Re-read `www.lagosresidents.gov.ng` (FAQ, Our Mandate, LAG-ID Card Status) once the site stops returning the WordPress critical error seen on 12 October 2026, and reconcile the three-month/six-month and 18/21-age discrepancies.
4. The monitor now fingerprints two LASRRA pages (`lasrra-requirements`, `lasrra-faq`); treat a changed fingerprint as a review trigger, never an auto-edit.

---

## Copy-Paste Row Template

Use this exact schema when adding a candidate topic to the queue:

```markdown
| <Topic> | <User intent (the exact question a Nigerian is trying to solve)> | <Why forums are weak (what is outdated, noisy, or unsafe on forum threads)> | <Sources to verify (official portals, agency circulars, or primary data)> | <Priority (P1|P2|P3)> | <Status (queued|writing|published)> |
```

Allowed `Status` values: `queued` | `writing` | `published`.

---

## Active Content Gap Queue

| Topic | User Intent | Why Forums Are Weak | Sources to Verify | Priority | Status |
|---|---|---|---|---|---|
| Nigerian e-Passport renewal & fresh application fees (32-page vs 64-page, 5-year vs 10-year) | Know the exact official NIS portal fee by booklet type and age group, biometric capture steps, and how to avoid paying touts at Ikoyi, Alausa, Festac, or Gwagwalada. | Forum threads mix 2021–2023 old fees with unofficial "express" agent charges, bury official portal links under 50 pages of middlemen advertising phone numbers, and lack last-verified dates. | Nigeria Immigration Service (`https://immigration.gov.ng/passports/`), official NIS application portal (`https://passport.immigration.gov.ng/`), Federal Ministry of Interior circulars. | P1 | published |
| NIN registration, modification (date of birth / name correction) & NIMC self-service fees | Find out which NIN services are free vs paid, official NIMC self-service modification charges, required supporting documents (court affidavit, newspaper publication, birth certificate), and enrolment centre rules. | Forum posts routinely quote arbitrary cybercafé or tout markups as "official NIMC fees" and share unsafe third-party WhatsApp contacts offering illegal database edits. | National Identity Management Commission (`https://nimc.gov.ng/`), official NIMC fee schedule & self-service portal notices. | P1 | published |
| CAC Business Name vs Limited Liability Company (LTD) registration cost & annual returns | Decide between a Business Name and a Private Limited Company, verify official CAC CRP filing fees, stamp duty (FIRS), and annual return penalties before starting a side hustle. | Forum threads quote outdated pre-CRP fees, confuse lawyer/agent service charges with statutory CAC fees, and omit mandatory annual returns that later mark businesses "Inactive". | Corporate Affairs Commission (`https://www.cac.gov.ng/`), CAC Company Registration Portal (`https://pre.cac.gov.ng/`), FIRS stamp duty portal. | P1 | published |
| JAMB UTME national minimum policy marks vs competitive departmental cut-off marks (UNILAG, UI, UNN, OAU, ABU) | Understand the difference between JAMB's national minimum benchmark and real Post-UTME / departmental merit aggregates for Medicine, Law, Nursing, Computer Science, and Engineering. | Forum megathreads mix rumours, self-reported scores without aggregate formulas, and prior-session cut-offs presented as current-session guarantees. | JAMB official portal (`https://www.jamb.gov.ng/`), JAMB Policy Meeting communiqués, and each university's official admissions portal (e.g. `https://unilag.edu.ng/`). | P1 | published |
| Wholesale depot petrol (PMS) & diesel (AGO) gantry prices vs retail filling station pump prices | Understand why Lagos/Rivers depot gantry medians differ from local NNPC and independent marketer pump prices across states, and estimate monthly generator fuel spend. | Social and forum posts conflate ex-depot wholesale prices per litre with retail pump prices, triggering panic without naming the depot, state, or timestamp. | Awajis / petroleumprice.ng depot tables (`https://awajis.com/fuel-price-in-nigeria-today/`), NMDPRA / NNPC Ltd public notices, and NaijaCheck `/tools/generator` + `/status`. | P1 | published |
| Prepaid electricity meter bands (Band A–E), NERC tariff lookup & token unit calculation | Check how NERC service-band classifications (Band A vs Band B–E) affect kWh unit costs across DisCos (IKEDC, EKEDC, AEDC, IBEDC, PHED) and compare grid cost against generator/solar payback. | Forum complaints rarely state the user's tariff band, DisCo, or kWh rate, making it impossible to calculate how many units ₦10,000 actually buys. | **Verified:** NERC Electricity Tariffs FAQ (`https://nerc.gov.ng/faq/electricity-tariffs/`) for the band definitions and the receipt method; NERC September 2026 supplementary orders `Order/NERC/2026/091` (Eko, EKEDP) and `Order/NERC/2026/089` (Benin, BEDC) for the ₦/kWh rows. Internal links to `/tools/generator` and `/tools/solar`. | P1 | published |
| Driver's licence fresh application & renewal (3-year vs 5-year) via FRSC / VIO /MVAA | Follow the exact accredited driving school, CBT test, VIO inspection, FRSC biometric capture, and Remita payment steps without falling for fake plastic cards. | Forum threads are full of intermediaries offering "no-capture" licences that fail FRSC verification checks on the road. | **Verified:** FRSC Service Level Agreements (2nd ed., April 2024) and FRSC ARC Compendium 2024 on `frsc.gov.ng`, plus the Nigeria Driver's Licence portal. **Blocked:** the current statutory fee — see blockers below. | P2 | writing |
| Lagos State residency registration (LASRRA / LAG-ID) requirements & neighbourhood offices | Know what documents (proof of address, utility bill, NIN) are required for LASRRA registration and where to pick up the card for Lagos schools, hospitals, and state services. | Forum discussions confuse old temporary slips with the smart LAG-ID card and list relocated local government collection points. | **Verified:** LASRRA registration portal (`https://registration.lagosresidents.gov.ng` — `/help/requirements`, `/help/howto`, `/help/enrollment`, `/help/faq`, `/validation/`), Lagos State Identity Management services (`https://lagosstate.gov.ng/services/identitymanagement`), Lagos State Citizens Gate (`https://citizensgate.lagosstate.gov.ng/`), OEQA school-enrolment press release (3 September 2026) and Lagos State Ministry of Health (May 2025). Read on 12 October 2026. **Blocked items:** replacement-card charge, USSD short code, LAG-ID five-year validity — see the LASRRA verification log above. | P2 | published |
| NBS monthly Food Price Watch vs major physical market realities (Mile 12, Bodija, Oyingbo, Dawanau, Ariaria) | Compare official state-level monthly NBS averages with dated wholesale/retail market planning ranges for rice (50kg & 1kg), garri, beans, yam, and palm oil. | Forum food-price threads contain unverified one-off anecdotes ("I bought paint bucket for ₦X") without specifying measure weight (mudu, derica, congo, paint rubber, kg), market, or date. | National Bureau of Statistics Microdata (`https://microdata.nigerianstat.gov.ng/index.php/catalog/162`), documented physical market checks, and `/prices/cost-of-living`. | P2 | queued |
| Customs duty & VIN valuation check for clearing used cars at Tin Can / Apapa ports | Understand how Nigeria Customs Service VIN valuation, exchange rate for customs duty, and terminal/shipping demurrage work before importing a vehicle. | Clearing agents on forums post conflicting "flat rate" clearing quotes that hide CBN customs FX rate changes and terminal storage fees. | Nigeria Customs Service (`https://customs.gov.ng/`), NCS B'Odogwu / trade portal public notices, CBN customs exchange rate schedule. | P3 | queued |
