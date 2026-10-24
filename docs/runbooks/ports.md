# Nigerian Seaports & Marine Terminals Reference Runbook (`/ports`)

## 1. Purpose & URL Prefix Choice

`/ports` and `/ports/[slug]` form NaijaCheck’s static public reference for major operational seaports and maritime export terminals in Nigeria.

- **Why `/ports` instead of `/seaports`:** `/ports` keeps the route prefix short, mirrors `/airports` and `/airlines`, and accurately covers ocean-going river-estuary harbours (`Warri`, `Port Harcourt`, `Onne`, `Calabar`) alongside coastal deep-sea (`Lekki`) and hydrocarbon export terminals (`Bonny`, `Qua Iboe`, `Forcados`, `Escravos`, `Brass`), while page `<title>` and `<h1>` tags directly answer `"seaports in Nigeria"` and `"ports in Nigeria"` search intent.
- **Cost & runtime model:** ₦0 / $0 static build (`next build` -> `out/`). No paid AIS or maritime APIs.

## 2. Scope & Anti-Guesswork Rules

### Included (`12` verified entries as of `2026-10-24`)
1. **All `7` Nigerian Ports Authority (NPA) commercial & deep-sea port complexes:**
   - `lagos-apapa-port` (`NGAPP` — Lagos Port Complex, Apapa)
   - `tin-can-island-port` (`NGTIN` — Tin Can Island Port Complex, including Kirikiri Lighter Terminal `NGKIK` context)
   - `lekki-deep-sea-port` (`NGLKK` — Lekki Deep Sea Port, Ibeju-Lekki)
   - `onne-port` (`NGONN` — Onne Port Complex: Federal Ocean Terminal & Federal Lighter Terminal)
   - `rivers-port-port-harcourt` (`NGPHC` — Rivers Port Complex / Port of Port Harcourt, including Okrika Jetty `NGOKR` oversight)
   - `delta-warri-port` (`NGWAR` — Delta Ports Complex: Warri, Koko `NGKOK`, Sapele `NGSPL` & Burutu `NGBUR`)
   - `calabar-port` (`NGCBQ` — Calabar Port Complex: Old Port, New Port & Dockyard)
2. **All `5` major coastal crude oil, gas-to-liquids & LNG marine export terminals carrying official UNECE Function-1 seaport UN/LOCODEs within NPA pilotage districts:**
   - `bonny-island-terminal` (`NGBON` — Bonny Oil & Gas Terminal + Nigeria LNG Finima marine jetties)
   - `qua-iboe-terminal` (`NGOBO` — Qua Iboe Terminal, Ibeno, Akwa Ibom State)
   - `forcados-terminal` (`NGFOR` — Forcados Oil Terminal, Delta State)
   - `escravos-terminal` (`NGESC` — Escravos Marine Terminal & EGTL, Delta State)
   - `brass-oil-terminal` (`NGBRA` — Brass Marine Oil Terminal, Bayelsa State)

### Explicitly Excluded
- **Unbuilt or pre-commissioning greenfield port proposals:** e.g., Ibom Deep Sea Port (Akwa Ibom), Badagry Deep Sea Port (Lagos), Ondo Multi-Purpose Deep Sea Port (Ilaje, Ondo), Bakassi Deep Sea Port (Cross River), and Olokola. Do **not** promote a greenfield project into `data/ports.json` until NPA and the concessionaire confirm commercial vessel operations.
- **Minor fishing jetties, private tank-farm piers, and every private terminal brand** as standalone thin doorway pages.
- **Real-time AIS vessel tracking, arrival boards, freight rate quotes, customs tariff calculators, or cargo booking.**

### Zero-Invention Invariants
1. **UN/LOCODEs (`unLocode`):** Must come strictly from the official UNECE UN/LOCODE Nigeria list (`https://service.unece.org/trade/locode/ng.htm`) in 5-character `NGXXX` format (`^NG[A-Z]{3}$`). If a new port has not yet been assigned an official UNECE code, **omit `unLocode` completely** rather than guessing.
2. **Operators & cargo types:** Must be cited to NPA (`https://nigerianports.gov.ng/`, `https://nigerianports.gov.ng/terminals/`), the official concessionaire website (e.g. `https://lekkiport.com/`), or official NUPRC/NMDPRA/JV operator disclosures.
3. **Anti-thin-doorway guard:** `lib/ports.ts` drops any entry whose `operationsSummary` is shorter than 80 characters or that lacks valid HTTPS `sources` or ISO `lastVerified`.

## 3. Single Source of Truth & Wiring

- **SSOT data:** `data/ports.json`
- **Typed loader & validators:** `lib/ports.ts`
- **Routes:** `app/ports/page.tsx` (`/ports`) + `app/ports/[slug]/page.tsx` (`/ports/[slug]`)
- **Client filter table:** `components/ports/ports-search.tsx`
- **Cross-links:**
  - `/ports/[slug]` -> `/geo/[state]`, `/geo/[state]/[lga]`, `/codes/postal/...`, `/airports/[slug]`, `/oil-gas/[slug]`
  - `/airports/[slug]` -> `corridorPorts` (coastal/corridor airports only)
  - `/oil-gas/[slug]` -> `linkedPorts` (linked energy/coastal operators only)
- **Discovery & search:**
  - `components/home/explore-grid.tsx` (`Seaports in Nigeria` tile on `/`)
  - `lib/category-bubbles.ts` (`places-ports` under `Places`, preserving strictly 6 main bubbles)
  - `lib/search.ts`, `lib/search-tips.ts`, `scripts/generate-content.ts` (`npm run generate`)
  - `app/sitemap.ts` + `lib/seo.ts`

## 4. Verification Checklist When Updating `data/ports.json`

1. Verify primary sources (NPA, UNECE UN/LOCODE, LPLEL, NUPRC/NMDPRA) and update `lastVerified` (`YYYY-MM-DD`) and `updatedAt`.
2. Regenerate search index and tips seed:
   ```bash
   npm run generate
   ```
3. Run typecheck, lint, unit tests, static build, and audits:
   ```bash
   npm run typecheck
   npm run lint
   npm run ports:test
   npm test
   npm run build
   npm run audit:static
   npm run audit:content
   ```
