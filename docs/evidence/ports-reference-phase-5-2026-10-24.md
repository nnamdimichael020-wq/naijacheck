# Phase 5 Evidence Report — Major Nigerian Seaports & Marine Terminals (`/ports`)

- **Date:** 2026-10-24 (Africa/Lagos)
- **Branch:** `arena/26fad0c0-naijacheck`
- **Cost / external runtime APIs:** ₦0 / $0 (100% static Next.js export; zero paid AIS or maritime APIs)

## 1. Summary & Route Inventory

- **Route prefix chosen:** `/ports` + `/ports/[slug]` (`1` hub + `12` leaf pages = `13` new static routes; documented in `data/ports.json` `prefixChoice` and `docs/runbooks/ports.md`).
- **Port count:** `12` verified operational seaports and major marine export terminals across `6` coastal states (`Lagos`, `Rivers`, `Delta`, `Cross River`, `Akwa Ibom`, `Bayelsa`):
  - **`6` NPA Landlord Commercial Seaport Complexes (`commercial-seaport`):**
    1. `/ports/lagos-apapa-port` — Lagos Port Complex, Apapa (`NGAPP`, Lagos State)
    2. `/ports/tin-can-island-port` — Tin Can Island Port Complex (`NGTIN`, Lagos State; includes Kirikiri Lighter Terminal `NGKIK` context)
    3. `/ports/onne-port` — Onne Port Complex (`NGONN`, Rivers State; FOT & FLT)
    4. `/ports/rivers-port-port-harcourt` — Rivers Port Complex / Port of Port Harcourt (`NGPHC`, Rivers State; includes Okrika Jetty `NGOKR` oversight)
    5. `/ports/delta-warri-port` — Delta Ports Complex: Warri, Koko, Sapele & Burutu (`NGWAR`, Delta State; documents `NGKOK`, `NGSPL`, `NGBUR`)
    6. `/ports/calabar-port` — Calabar Port Complex (`NGCBQ`, Cross River State)
  - **`1` Deep-Sea Multipurpose & Transshipment Port (`deep-sea-port`):**
    7. `/ports/lekki-deep-sea-port` — Lekki Deep Sea Port (`NGLKK`, Lagos State)
  - **`5` Major Crude Oil, GTL & LNG Marine Export Terminals (`energy-terminal`):**
    8. `/ports/bonny-island-terminal` — Bonny Island Oil & LNG Marine Terminal (`NGBON`, Rivers State)
    9. `/ports/qua-iboe-terminal` — Qua Iboe Terminal, Ibeno (`NGOBO`, Akwa Ibom State)
    10. `/ports/forcados-terminal` — Forcados Marine Oil Terminal (`NGFOR`, Delta State)
    11. `/ports/escravos-terminal` — Escravos Marine Terminal (`NGESC`, Delta State)
    12. `/ports/brass-oil-terminal` — Brass Marine Oil Terminal (`NGBRA`, Bayelsa State)

## 2. Zero Invented Codes, Operators, or Cargo Types

- **UN/LOCODE verification (`12 / 12` = 100%):** Every `unLocode` (`NGAPP`, `NGTIN`, `NGLKK`, `NGONN`, `NGPHC`, `NGWAR`, `NGCBQ`, `NGBON`, `NGOBO`, `NGFOR`, `NGESC`, `NGBRA`) and every sub-port code (`NGLOS`, `NGKIK`, `NGOKR`, `NGKOK`, `NGSPL`, `NGBUR`) was verified directly against the official UNECE UN/LOCODE Nigeria registry (`https://service.unece.org/trade/locode/ng.htm`).
- **Operator & cargo verification:** Every landlord authority, concessioned terminal operator (APMT Apapa, ENL Consortium, ABTL, GDNL, Lilypond, Josepdam, TICT, Ports & Cargo, Five Star Logistics, PTML, LPLEL / Lekki Freeport Terminal, WACT, INTELS, Brawal, Atlas Cement, PTOL, BUA Ports, Julius Berger Services, AMS, ECM Terminals, Shoreline Logistics, NLNG, Renaissance Africa Energy, SEPNU, Chevron Nigeria, Oando Energy Resources), and cargo type was verified against official NPA pages (`https://nigerianports.gov.ng/`, `https://nigerianports.gov.ng/terminals/`), `https://lekkiport.com/`, and cited operator/regulatory disclosures.
- **Unbuilt greenfield exclusions:** Proposed/unbuilt projects (`Ibom Deep Sea Port`, `Badagry Deep Sea Port`, `Ondo Multi-Purpose Deep Sea Port`, `Bakassi Deep Sea Port`) are explicitly excluded from active port entries and explained honestly in the hub FAQ.
- **Zero live-tracking or commercial claims:** Zero AIS vessel tracking claims, freight quotes, or cargo booking CTAs.

## 3. Discovery, Cross-Linking & Verification Metrics

- **Explore grid (`/`):** Added `Seaports in Nigeria` tile (`12 ports · UN/LOCODE`).
- **Category bubble bar (`/`):** Kept strictly **6 main bubbles** (`Money`, `Codes`, `Places`, `Guides`, `Street`, `Tools`); added `places-ports` (`Seaports in Nigeria`, `13` verified links) inside `Places` (`317` total verified bubble links, `0` missing routes).
- **Bidirectional cross-links:**
  - `/ports/[slug]` -> `/geo/[state]`, `/geo/[state]/[lga]`, `/codes/postal/...`, `/airports/[slug]`, and `/oil-gas/[slug]`.
  - Coastal/corridor `/airports/[slug]` (`LOS`, `PHC`, `QRW`, `CBQ`, `QUO`, `ABB`, `BNI`) -> linked `/ports/[slug]` (inland airports such as `ABV` untouched).
  - Coastal/export `/oil-gas/[slug]` (`nigeria-lng`, `renaissance-africa-energy`, `seplat-energy`, `chevron-nigeria`, `oando`, `dangote-refinery`, `ardova`, `conoil`, `nnpc-limited`, etc.) -> linked `/ports/[slug]`.
- **Search:** `1,134` search-index entries (`22` shallow dropdown hubs, `1,275` unique search tips); `"Apapa"` ranks `/ports/lagos-apapa-port` #1 and `"Onne"` ranks `/ports/onne-port` #1 on `/search` while surfacing `/ports` in the shallow header dropdown.
- **Static & content audits:**
  - `npm run typecheck` — PASS (`0` errors)
  - `npm run lint` — PASS (`0` errors)
  - `npm test` (including `ports:test`, `airlines:test`, `oilgas:test`, `airports:test`, `banks:test`, `search:test`, `bubblebar:test`, `push:test`) — PASS
  - `npm run build` — PASS (`1,138` static HTML routes)
  - `npm run audit:static` — PASS (`1,138` HTML routes, `1,102` sitemap URLs, `0` broken internal links, `0` duplicate titles/descriptions, `0` invalid JSON-LD, `1,135/1,135` valid share controls)
  - `npm run audit:content` — PASS (`0` findings on `/ports` or `/ports/[slug]`)
