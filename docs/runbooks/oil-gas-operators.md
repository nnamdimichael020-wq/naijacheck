# Major oil & gas operators in Nigeria — upstream, midstream LNG, refining & downstream reference

Owner runbook for `data/oil-gas-operators.json`, `lib/oil-gas.ts`, `/oil-gas`, and `/oil-gas/[slug]`. Every operator profile is a manually verified, source-cited static reference page — zero invented corporate entities, zero guessed licence numbers or ownership claims, zero thin doorway stubs, and zero stock advice or live crude-price promises.

## Why `/oil-gas` (and not `/energy` or `/codes/oil-gas`)

1. **Why not `/energy`:** In Nigeria, `/energy` implies electricity distribution companies (DisCos such as Ikeja Electric or Eko DisCo), NERC Band A–E electricity tariffs (which live under `/howto/prepaid-electricity-bands` and `/learn/electricity-bill-explained`), and household solar/inverter calculators (`/tools/solar`). Keeping Phase 3 at `/oil-gas` keeps the scope sharply focused on petroleum upstream E&P, midstream LNG/gas processing, crude refining, and major downstream marketers.
2. **Why not `/codes/oil-gas`:** Unlike CBN bank sort/USSD codes or 6-digit NIPOST postal codes, petroleum operator pages are corporate and geographic profiles (registered operating entities, post-divestment asset transfers, headquarters LGAs, NUPRC/NMDPRA oversight, and oil-corridor aviation gateways).
3. **Clean 1-segment hub:** `/oil-gas` fits directly into `DROPDOWN_TOP_LEVEL_ALLOWLIST` (shallow header search dropdown), `ExploreGrid` on `/`, and the `Places` category bubble (`places-oil-gas`) while preserving NaijaCheck's strict **6-bubble** top-level category bar.

## Inclusion scope & explicit non-goals

Phase 3 curates **16 verified major oil and gas operators in Nigeria** across **4 ownership categories** and **4 value-chain segments**:

- **1 National Oil Company (`type: "noc"`)**:
  - `nnpc-limited` — Nigerian National Petroleum Company Limited (`NEPL`, `NUIMS`, `NGML`, `NNPC Retail`; HQ in Abuja).
- **5 International Oil Company Groups (`type: "ioc"`)**:
  - `shell-nigeria` — Shell Companies in Nigeria (`SNEPCo` deepwater Bonga & `Shell Nigeria Gas`).
  - `exxonmobil-nigeria` — ExxonMobil in Nigeria (`Esso Exploration and Production Nigeria Limited` — Erha & Usan deepwater).
  - `chevron-nigeria` — Chevron Nigeria Limited (`CNL` western Niger Delta JV, Escravos/EGTL & deepwater Agbami).
  - `totalenergies-nigeria` — TotalEnergies in Nigeria (`TotalEnergies EP Nigeria` & `TotalEnergies Marketing Nigeria Plc`).
  - `eni-nigeria` — Eni in Nigeria (`Nigerian Agip Exploration Limited — NAE` & `AENR`).
- **1 Incorporated LNG Joint Venture (`type: "jv"`)**:
  - `nigeria-lng` — Nigeria LNG Limited (`NLNG`, Port Harcourt HQ & 6-train + Train 7 Bonny Island complex).
- **9 Indigenous / Independent Upstream, Refining & Downstream Operators (`type: "independent"`)**:
  - `renaissance-africa-energy` — Renaissance Africa Energy Company Limited (acquired `SPDC` in March 2025; Port Harcourt HQ).
  - `seplat-energy` — Seplat Energy Plc (including `SEPNU`, acquired `MPNU` in December 2024).
  - `oando` — Oando Plc (acquired `NAOC` in August 2024).
  - `aradel-holdings` — Aradel Holdings Plc (formerly `NDEP`; Ogbele oil, gas & 11,000 bpd modular refinery).
  - `heirs-energies` — Heirs Energies Limited (`OML 17` operator).
  - `first-ep` — FIRST Exploration & Petroleum Development Company Limited (`OML 83` Anyala & `OML 85` Madu).
  - `dangote-refinery` — Dangote Petroleum Refinery & Petrochemicals FZE (`700,000 bpd` CDU refinery, Ibeju-Lekki, Lagos).
  - `ardova` — Ardova Plc (formerly `Forte Oil` / `African Petroleum — AP`).
  - `conoil` — Conoil Plc (formerly `National Oil / NOLCHEM`).

### Explicit exclusions & non-goals

- **Not every filling station or contractor:** Do not claim completeness over thousands of independent retail stations, oilfield service contractors, or marginal-field SPVs without substantive verified public profiles.
- **No live crude oil prices or stock tips:** Never embed Brent/Bonny Light tickers, share-price targets, buy/sell opinions, licence-round rumours, unverified modular refinery announcements, or recruitment/tender links. Dated Lagos gantry/depot fuel history lives separately on `/prices/fuel`.
- **Zero thin doorway pages:** `lib/oil-gas.ts` rejects any entry lacking valid `sources[]` or carrying `< 80` characters of `operationsSummary`, and `lib/oil-gas.test.ts` enforces `>= 120` unique characters, `>= 2` `keyAssets`, and `>= 2` public sources (`>= 1` primary).

## Data store: `data/oil-gas-operators.json` (SSOT)

Top-level fields:
- `updatedAt`: ISO `YYYY-MM-DD` date of latest human verification.
- `scope`: Explicit inclusion/exclusion statement rendered on `/oil-gas#sources`.
- `notes`: Regulatory context (`PIA 2021`, `NUPRC` vs `NMDPRA`) and divestment summary rendered on `/oil-gas`.
- `hubSources`: Primary regulatory and exchange portals (`nuprc.gov.ng`, `hostcomply.nuprc.gov.ng/settlor`, `nmdpra.gov.ng`, `ncdmb.gov.ng`, `nnpcgroup.com`, `ngxgroup.com`).

Per-operator fields:
- `slug`, `name`, `fullLegalName?`, `alternateNames?`
- `type?`: `"noc" | "ioc" | "jv" | "independent"` (only when verified from primary filings)
- `segment?`: `"upstream" | "midstream" | "downstream" | "integrated"`
- `focusSummary?`, `headquartersCity?`, `headquartersLocality?`
- `stateSlug?`, `stateName?`, `lgaSlug?`, `lgaName?` (must match `data/lgas.json`)
- `postalHref?`, `postalLabel?` (must resolve to a generated `/codes/postal/...` route)
- `operationalHubs?`, `airportSlugs?` (must resolve to `data/airports.json` slugs)
- `listingStatus?`, `regulatorScope?`, `operationsSummary`, `keyAssets?`, `website?`
- `sources`: `Array<{ label: string; url: string; kind: "primary" | "secondary" }>`
- `lastVerified`: ISO `YYYY-MM-DD`
- `verification`: `"manual"`
- `notes?`: Disambiguation / divestment / corporate lineage note

## Handling divestments, acquisitions & corporate renamings

Nigeria's petroleum sector undergoes periodic asset transfers and corporate rebrands (e.g., `NAOC -> Oando`, `MPNU -> Seplat/SEPNU`, `SPDC -> Renaissance`, `NDEP -> Aradel`, `Forte Oil -> Ardova`). When updating `data/oil-gas-operators.json`:

1. **Wait for regulatory completion before changing operatorship:**
   - Do **not** treat a signed Sale and Purchase Agreement (SPA) as completed operatorship until ministerial consent / NUPRC completion is publicly confirmed by the seller, buyer, or NUPRC. For example, TotalEnergies' January 2026 SPA with Vaaris for its 10% non-operated Renaissance JV oil stake is noted as a signed SPA in `notes` until completion is confirmed.
2. **Preserve legacy search aliases (`alternateNames`):**
   - Nigerians continue searching legacy acronyms (`SPDC`, `MPNU`, `NAOC`, `NDEP`, `Forte Oil`, `AP`, `NOLCHEM`, `NPDC`) years after a rename or sale. Keep legacy names in `alternateNames` (explicitly prefixed with `"formerly ..."` or `"acquisition"` where helpful) and explain the exact completion date and retained vs transferred assets in `operationsSummary` and `notes`.
3. **Update both sides of a divestment together:**
   - When an IOC divests an onshore/shallow-water subsidiary to an indigenous buyer, update **both** the IOC entry (clarifying retained deepwater/gas/LNG entities) and the acquirer entry in the same PR, citing primary completion releases on both pages, and bump `lastVerified` + `updatedAt`.
4. **Keep cross-links valid:**
   - Every `stateSlug`/`lgaSlug` must exist in `data/lgas.json`, every `postalHref` must exist in `getAllPostalStates()` or `getAllPostalAreaParams()`, and every `airportSlugs` entry must exist in `data/airports.json`.

## Pre-PR verification gate

Run from repository root:

```bash
npm run generate
npm run typecheck
npm run lint
npm test
npm run build
npm run audit:static
npm run audit:content
```

All commands must exit `0` with `brokenInternalLinks: []`, `indexedNotInSitemap: []`, `duplicateTitles: []`, `invalidJsonLd: []`, and zero new content-audit findings on `/oil-gas*`.
