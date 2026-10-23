# Phase 3 Evidence — Major Oil & Gas Operators in Nigeria (`/oil-gas` + `/oil-gas/[slug]`)

- **Date verified:** `2026-10-23` (Africa/Lagos)
- **Branch:** `arena/fefa01be-naijacheck` (branched from `main` @ `08416bccad75f4e056be82b659cb26876bf3facd`)
- **Verification mode:** `"manual"` (`₦0` / `$0` cost — zero paid industry databases, zero scraped private portals, zero invented corporate/ownership/licence claims)

---

## 1. Architecture & Route Prefix Decision (`/oil-gas` vs `/energy`)

- **Chosen routes:** `/oil-gas` (filterable directory hub) + `/oil-gas/[slug]` (`16` static per-operator profiles).
- **Why `/oil-gas` instead of `/energy`:**
  1. Matches direct Nigerian search intent (*"oil companies in Nigeria"*, *"oil and gas operators in Nigeria"*, *"IOCs in Nigeria"*, *"NNPC"*, *"NLNG"*, *"SPDC"*).
  2. Avoids overpromising `/energy` coverage of electricity distribution companies (DisCos) or NERC grid tariffs (already served separately under `/howto/prepaid-electricity-bands`, `/learn/electricity-bill-explained`, and `/tools/solar`).
  3. Integrates cleanly as a 1-segment hub into `DROPDOWN_TOP_LEVEL_ALLOWLIST` (`20` shallow dropdown hubs), homepage `ExploreGrid`, and the `Places` bubble (`places-oil-gas`) while strictly preserving the **6-bubble** top-level category bar (`Money`, `Codes`, `Places`, `Guides`, `Street`, `Tools`).

---

## 2. Dataset Summary & Operator Counts (`data/oil-gas-operators.json`)

- **Total verified operators:** **`16`** (`1` hub + `16` static operator profiles = **`17` new static HTML routes & sitemap URLs**)
- **Breakdown by ownership type (`OperatorType`):**
  - **National Oil Company (`noc`):** `1` (`NNPC Limited`)
  - **International Oil Company groups (`ioc`):** `5` (`Shell Companies in Nigeria — SNEPCo & SNG`, `ExxonMobil in Nigeria — Esso E&P`, `Chevron Nigeria Limited`, `TotalEnergies in Nigeria`, `Eni in Nigeria — Nigerian Agip Exploration`)
  - **Incorporated LNG Joint Venture (`jv`):** `1` (`Nigeria LNG Limited — NLNG`)
  - **Indigenous / Independent Operators (`independent`):** `9` (`Renaissance Africa Energy Company Limited`, `Seplat Energy Plc`, `Oando Plc`, `Aradel Holdings Plc`, `Heirs Energies Limited`, `FIRST E&P`, `Dangote Petroleum Refinery & Petrochemicals`, `Ardova Plc`, `Conoil Plc`)
- **Breakdown by value-chain segment (`OperatorSegment`):**
  - **Upstream (`upstream`):** `8` (`Shell Nigeria`, `ExxonMobil Nigeria`, `Chevron Nigeria`, `Eni Nigeria`, `Renaissance Africa Energy`, `Seplat Energy`, `Heirs Energies`, `FIRST E&P`)
  - **Midstream (`midstream`):** `1` (`Nigeria LNG Limited`)
  - **Downstream (`downstream`):** `3` (`Dangote Petroleum Refinery & Petrochemicals`, `Ardova Plc`, `Conoil Plc`)
  - **Integrated (`integrated`):** `4` (`NNPC Limited`, `TotalEnergies in Nigeria`, `Oando Plc`, `Aradel Holdings Plc`)
- **Nigerian headquarters coverage:** `3` cities / states (`Abuja` in `FCT — Abuja`: `1`; `Lagos` in `Lagos`: `13`; `Port Harcourt` in `Rivers`: `2`), plus verified operational links across Niger Delta corridors (`Rivers`, `Delta`, `Bayelsa`, `Akwa Ibom`, `Edo`, `Imo`) and commercial aviation gateways (`PHC`, `QRW`, `QUO`, `LOS`, `ABV`, `BNI`, `QOW`, `KAN`).

---

## 3. All 17 Built Routes & Primary Citations

| Route | Operator | Type | Segment | HQ City | Primary Citations Verified (`2026-10-23`) |
| --- | --- | --- | --- | --- | --- |
| `/oil-gas` | Hub directory & divestment guide | — | All | — | `nuprc.gov.ng`, `hostcomply.nuprc.gov.ng/settlor`, `nmdpra.gov.ng`, `ncdmb.gov.ng`, `nnpcgroup.com`, `ngxgroup.com` |
| `/oil-gas/nnpc-limited` | NNPC Limited | NOC | Integrated | Abuja | `nnpcgroup.com/contact`, `nnpcgroup.com/nnpc-gas-marketing-limited`, `retail.nnpcgroup.com`, `hostcomply.nuprc.gov.ng/settlor` |
| `/oil-gas/chevron-nigeria` | Chevron Nigeria Limited (CNL) | IOC | Upstream | Lagos | `chevron.com/worldwide/nigeria`, `hostcomply.nuprc.gov.ng/settlor` |
| `/oil-gas/eni-nigeria` | Eni in Nigeria (Nigerian Agip Exploration) | IOC | Upstream | Lagos | `eni.com/en-IT/actions/global-activities/nigeria.html`, `hostcomply.nuprc.gov.ng/settlor` |
| `/oil-gas/exxonmobil-nigeria` | ExxonMobil in Nigeria (Esso E&P) | IOC | Upstream | Lagos | `corporate.exxonmobil.com/locations/nigeria`, `seplatenergy.com/investors/acquisition-of-mpnu/`, `hostcomply.nuprc.gov.ng/settlor` |
| `/oil-gas/shell-nigeria` | Shell Companies in Nigeria (SNEPCo & SNG) | IOC | Upstream | Lagos | `shell.com.ng`, `shell.com/.../shell-completes-sale-of-spdc`, `hostcomply.nuprc.gov.ng/settlor` |
| `/oil-gas/totalenergies-nigeria` | TotalEnergies in Nigeria | IOC | Integrated | Lagos | `totalenergies.com` (Nov 2025 Bonga & Jan 2026 Renaissance JV press releases), `services.totalenergies.ng`, `hostcomply.nuprc.gov.ng/settlor` |
| `/oil-gas/nigeria-lng` | Nigeria LNG Limited (NLNG) | LNG JV | Midstream | Port Harcourt | `nlng.com`, `nlng.com/business/doing-business-with-nlng`, `nlng.com/documents/2024_NLNG_FACTS_FIGURESB_compressed.pdf` |
| `/oil-gas/aradel-holdings` | Aradel Holdings Plc | Indigenous | Integrated | Lagos | `aradel.com/about-us/`, `ngxgroup.com/...?symbol=ARADEL`, `hostcomply.nuprc.gov.ng/settlor` |
| `/oil-gas/ardova` | Ardova Plc | Indigenous | Downstream | Lagos | `ardovaplc.com`, `cms.ardovaplc.com` Q4 2024 financial report PDF |
| `/oil-gas/conoil` | Conoil Plc | Indigenous | Downstream | Lagos | `doclib.ngxgroup.com` FY 2025 audited financial statements (June 2026 PDF), `ngxgroup.com/...?symbol=CONOIL` |
| `/oil-gas/dangote-refinery` | Dangote Petroleum Refinery & Petrochemicals | Indigenous | Downstream | Lagos | `refinery.dangote.com/about-us/`, `petroleumrefinerysales.dangote.com/contact_us`, `dangote.com/businesses/` |
| `/oil-gas/first-ep` | FIRST E&P | Indigenous | Upstream | Lagos | `first-epdc.com`, `first-epdc.com` March 2025 SPDC consortium completion release, `hostcomply.nuprc.gov.ng/settlor` |
| `/oil-gas/heirs-energies` | Heirs Energies Limited | Indigenous | Upstream | Lagos | `heirsenergies.com`, `heirsenergies.com/category/news-press-releases/news/`, `hostcomply.nuprc.gov.ng/settlor` |
| `/oil-gas/oando` | Oando Plc | Indigenous | Integrated | Lagos | `oandoplc.com`, `oandoplc.com/contact-us`, `eni.com` Nigeria page, `hostcomply.nuprc.gov.ng/settlor` |
| `/oil-gas/renaissance-africa-energy` | Renaissance Africa Energy Company Limited | Indigenous | Upstream | Port Harcourt | `shell.com` SPDC completion release, `ncdmb.gov.ng` Renaissance release, `first-epdc.com`, `hostcomply.nuprc.gov.ng/settlor` |
| `/oil-gas/seplat-energy` | Seplat Energy Plc | Indigenous | Upstream | Lagos | `seplatenergy.com/investors/acquisition-of-mpnu/`, `seplatenergy.com` FY25 audited results (Feb 2026 PDF), `hostcomply.nuprc.gov.ng/settlor` |

---

## 4. Verification, Audits & Smoke Checks

1. **Typecheck & Lint (`npm run typecheck && npm run lint`):**
   - `tsc --noEmit`: `0` errors.
   - `eslint .`: `0` errors (`0` warnings on any Phase 3 files).
2. **Unit & SSOT Integrity Suites (`npm test`):**
   - All `19` test suites green, including new `lib/oil-gas.test.ts` (`16` operators, primary regulatory/corporate sources, anti-thin-doorway length/uniqueness guards, zero stock-tip guard, and verified geo/postal/airport cross-links), `lib/search.test.ts` (`1,097` omni entries, `20` shallow dropdown hubs, `"Shell Nigeria"`, `"NNPC"`, and `"SPDC"` dropdown vs deep `/search` assertions), and `lib/category-bubbles.test.ts` (`6` main bubbles, `278` verified links).
3. **Production Static Export & Audits (`npm run build && npm run audit:static && npm run audit:content`):**
   - `generatedHtmlRoutes`: **`1,101`** (up from `1,084`)
   - `sitemapUrls`: **`1,065`** (up from `1,048`)
   - `sitemapMissing: []`, `indexedNotInSitemap: []`, `noindexInSitemap: []`
   - `brokenInternalLinks: []`, `brokenImageAssets: []`
   - `duplicateTitles: []`, `duplicateDescriptions: []`, `invalidJsonLd: []`
   - `share`: `1,098 / 1,098` required pages carry valid WhatsApp + X share links (`anchorBelow44px: []`)
   - `audit:content`: **`0` findings** on `/oil-gas` and all `16` `/oil-gas/[slug]` routes (`findingsCount: 6` unchanged pre-existing baseline).
   - Client bundle footprint: `/oil-gas` = `15.8 kB` (`136 kB` First Load JS); `/oil-gas/[slug]` = `188 B` (`120 kB` First Load JS).
4. **Built-HTML & Search Smoke Verification:**
   - Verified `/oil-gas` hub H1, honest scope paragraph, interactive search/type/segment filters, divestment summary cards (`SPDC → Renaissance`, `MPNU → Seplat SEPNU`, `NAOC → Oando`), soft links (`/airports/port-harcourt-international`, `/airports/warri-osubi`, `/geo/rivers`, `/prices/fuel`, `/rates`), and `CollectionPage` + `ItemList` + `BreadcrumbList` + `FAQPage` JSON-LD.
   - Verified 4 distinct operator profiles (`/oil-gas/nnpc-limited`, `/oil-gas/shell-nigeria`, `/oil-gas/renaissance-africa-energy`, `/oil-gas/dangote-refinery`) for unique metadata, canonical URL, answer-first snapshot, `Organization` JSON-LD, primary citations, and `lastVerified`.
   - Verified shallow dropdown vs deep `/search` resolution for `"Shell Nigeria"`, `"NNPC"`, `"SPDC"`, `"MPNU"`, `"NAOC"`, `"NLNG"`, and `"Dangote Refinery"`.
