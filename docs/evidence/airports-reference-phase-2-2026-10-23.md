# Phase 2 Evidence — Nigerian Airports Reference (`/airports` + `/airports/[slug]`)

**Date:** `2026-10-23`  
**Branch:** `arena/ab359e9f-naijacheck`  
**Cost / External APIs:** `₦0` (100% static archive from `data/airports.json` SSOT; zero paid aviation APIs; no DNS changes)

## 1. Information architecture & route prefix decision

- **Chosen routes:** **`/airports`** (1 hub) + **`/airports/[slug]`** (24 static per-airport pages) = **25 new indexable routes**.
- **Why `/airports` over `/travel` or `/codes/airports`:**
  1. NaijaCheck explicitly excludes flight status, ticket booking, airfare search, and hotel content — `/travel` would imply an unfulfilled travel-booking vertical.
  2. Each airport entry combines aviation identifiers (`IATA`, `ICAO`) with physical state/LGA geography, runway specifications, operator concessions, and scheduled passenger status, making `/airports` broader than numeric/dialing `/codes`.
  3. As a clean 1-segment top-level hub, `/airports` integrates directly into `DROPDOWN_TOP_LEVEL_ALLOWLIST` (`19` total shallow dropdown hubs), `ExploreGrid` on `/`, and the `Places` category bubble (`places-airports`) while preserving strictly **6** top-level category bubbles.

## 2. Dataset counts & field coverage (`data/airports.json`)

| Metric | Count | Notes |
| --- | ---: | --- |
| Total airports listed | **24** | Major FAAN-operated and state/concessioned public commercial airports (never claims `"every airstrip in Nigeria"`) |
| `international` gateways | **7** | Lagos (`LOS`), Abuja (`ABV`), Kano (`KAN`), Port Harcourt (`PHC`), Enugu (`ENU`), Uyo (`QUO`), Maiduguri (`MIU`) |
| `domestic` commercial airports | **17** | Includes domestic passenger terminals with seasonal Hajj or cargo capability (honestly explained per airport) |
| With verified 3-letter `IATA` | **23 / 24** (`95.8%`) | `anambra-chinua-achebe` (`DNAN`) omits global `IATA` rather than guessing (`ANA` belongs to Anaa, French Polynesia in IATA's global registry) |
| With verified 4-letter `ICAO` | **24 / 24** (`100%`) | All 24 carry verified Nigerian civil `DNxx` location indicators |
| With verified `operator` & `runwayNote` | **24 / 24** (`100%`) | Unique non-boilerplate runway, operator, and operational notes |
| With verified `/geo/[stateSlug]` + `/geo/[stateSlug]/[lgaSlug]` + `/codes/postal/...` cross-links | **24 / 24** (`100%`) | Spanning **23 states + FCT** (`delta` hosts both Asaba `ABB` and Osubi `QRW`) |
| Invented IATA / ICAO codes | **0** | Enforced by `lib/airports.test.ts` |

## 3. Complete route & code inventory (25 routes)

1. `/airports` — Nigerian airports hub (`All (24) / International (7) / Domestic (17)` filter + search + copy buttons)
2. `/airports/abuja-nnamdi-azikiwe` — Nnamdi Azikiwe International Airport (`ABV` / `DNAA`, International, FCT — Abuja)
3. `/airports/akure-airport` — Akure Airport (`AKR` / `DNAK`, Domestic, Ondo)
4. `/airports/anambra-chinua-achebe` — Chinua Achebe International Cargo and Passenger Airport (`ICAO: DNAN`, `IATA` omitted, Domestic, Anambra)
5. `/airports/asaba-airport` — Asaba International Airport (`ABB` / `DNAS`, Domestic, Delta)
6. `/airports/benin-airport` — Benin Airport (`BNI` / `DNBE`, Domestic, Edo)
7. `/airports/calabar-margaret-ekpo` — Margaret Ekpo International Airport (`CBQ` / `DNCA`, Domestic, Cross River)
8. `/airports/enugu-akanu-ibiam` — Akanu Ibiam International Airport (`ENU` / `DNEN`, International, Enugu)
9. `/airports/gombe-zakari-maimalari` — Brigadier Zakari Maimalari Airport (`GMO` / `DNGO`, Domestic, Gombe)
10. `/airports/ibadan-airport` — Ibadan Airport (`IBA` / `DNIB`, Domestic, Oyo)
11. `/airports/ilorin-tunde-idiagbon` — General Tunde Idiagbon International Airport (`ILR` / `DNIL`, Domestic, Kwara)
12. `/airports/jos-yakubu-gowon` — Yakubu Gowon Airport (`JOS` / `DNJO`, Domestic, Plateau)
13. `/airports/kaduna-airport` — Kaduna Airport (`KAD` / `DNKA`, Domestic, Kaduna)
14. `/airports/kano-mallam-aminu-kano` — Mallam Aminu Kano International Airport (`KAN` / `DNKN`, International, Kano)
15. `/airports/katsina-umaru-musa-yaradua` — Umaru Musa Yar'Adua Airport (`DKA` / `DNKT`, Domestic, Katsina)
16. `/airports/lagos-murtala-muhammed` — Murtala Muhammed International Airport (`LOS` / `DNMM`, International, Lagos)
17. `/airports/maiduguri-muhammadu-buhari` — General Muhammadu Buhari International Airport (`MIU` / `DNMA`, International, Borno)
18. `/airports/makurdi-airport` — Makurdi Airport (`MDI` / `DNMK`, Domestic, Benue)
19. `/airports/minna-bola-ahmed-tinubu` — Bola Ahmed Tinubu International Airport (`MXJ` / `DNMN`, Domestic, Niger)
20. `/airports/owerri-sam-mbakwe` — Sam Mbakwe International Cargo Airport (`QOW` / `DNIM`, Domestic, Imo)
21. `/airports/port-harcourt-international` — Port Harcourt International Airport (`PHC` / `DNPO`, International, Rivers)
22. `/airports/sokoto-sultan-abubakar` — Sultan Abubakar III International Airport (`SKO` / `DNSO`, Domestic, Sokoto)
23. `/airports/uyo-victor-attah` — Victor Attah International Airport (`QUO` / `DNAI`, International, Akwa Ibom)
24. `/airports/warri-osubi` — Osubi Airport (`QRW` / `DNSU`, Domestic, Delta)
25. `/airports/yola-airport` — Yola Airport (`YOL` / `DNYO`, Domestic, Adamawa)

## 4. Sources approach

- **Primary official sources (`kind: "primary"`):** Federal Airports Authority of Nigeria (`faan.gov.ng/international-airports/`, `faan.gov.ng/local-airports/`, dedicated MMIA/NAIA/MAKIA/PHIA/AIIA airport pages), Nigeria Civil Aviation Authority (`ncaa.gov.ng` Part 12 aerodrome certifications), Federal Ministry of Information (`fmino.gov.ng` federal upgrade announcements), Akwa Ibom State Government (`akwaibomstate.gov.ng` November 2025 federal international designation for Uyo), and Chinua Achebe International Cargo Airport Anambra (`caica.anambrastate.gov.ng`).
- **Secondary aeronautical & institutional cross-checks (`kind: "secondary"`):** US FAA International Flight Information Manual (`faa.gov/.../NG.pdf`), UN Logistics Cluster Nigeria Aviation assessment (`lca.logcluster.org/22-nigeria-aviation`), SKYbrary (`skybrary.aero/airports/dnim`), OurAirports (`ourairports.com`), and cited Nigerian aviation reporting on PPP concessions and the August 2026 Federal Ministry of Aviation IATA review letter for Osubi (`QRW`).

## 5. Verification gate results

- `npm run typecheck` — **PASS** (`0` TypeScript errors)
- `npm run lint` — **PASS** (`0` ESLint errors)
- `npm test` — **PASS** (all 18 test suites green, including `airports:test`, `banks:test`, `search:test`, and `bubblebar:test`)
- `npm run build` — **PASS** (`1,089` static pages built cleanly)
- `npm run audit:static` — **PASS** (`generatedHtmlRoutes: 1084`, `sitemapUrls: 1048`, `sitemapMissing: []`, `indexedNotInSitemap: []`, `brokenInternalLinks: []`, `duplicateTitles: []`, `duplicateDescriptions: []`, `invalidJsonLd: []`, `malformedWhatsApp: []`, `malformedX: []`)
- `npm run audit:content` — **PASS** (`0` findings on `/airports` or `/airports/*`)
- Smoke checks — **PASS** (`All/International/Domestic` filters, `CopyButton` on codes, 4 sample airport pages `LOS`/`ABV`/`QUO`/`DNAN`, shallow & deep search for `"LOS"` and `"Abuja airport"`, homepage `Places` bubble + `ExploreGrid` tile, and bidirectional `/geo/[state]` cross-links)
