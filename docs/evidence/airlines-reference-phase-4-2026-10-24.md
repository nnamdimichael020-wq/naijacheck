# Evidence Report — Phase 4 Static Archive: Nigerian Airlines Reference (`/airlines` + `/airlines/[slug]`)

- **Date verified:** `2026-10-24` (Africa/Lagos)
- **Branch:** `arena/81528c00-naijacheck`
- **Cost / external paid APIs:** `₦0 / $0` (100% static Next.js export from committed `data/airlines.json` SSOT)
- **DNS / domain changes:** None

---

## 1. Route Prefix Decision

Chosen URL scheme: **`/airlines`** (hub) + **`/airlines/[slug]`** (`23` per-airline profiles), rather than `/travel/airlines`:
1. **Symmetric civil-aviation cluster with Phase 2 (`/airports` <-> `/airlines`):** Every airline profile links directly to its verified Nigerian base airport(s) (`/airports/[slug]`), and `/airports/[slug]` lists carriers with a verified hub or historical base at that aerodrome.
2. **No travel-booking implication:** NaijaCheck does not sell tickets, quote airfares, or publish flight timetables; `/travel` would imply booking/fare features outside scope.
3. **Shallow 1-segment hub compatibility:** `/airlines` integrates directly into `DROPDOWN_TOP_LEVEL_ALLOWLIST` (`21` shallow dropdown hubs), `ExploreGrid` on `/`, and the `Places` bubble (`places-airlines`, beside `places-airports`) while preserving **strictly 6** main category bubbles (`Money`, `Codes`, `Places`, `Guides`, `Street`, `Tools`).

---

## 2. Dataset Breakdown by Status & Code Coverage (`23` Airlines — Zero Invented Claims or Codes)

| Status | Count | Airlines (`IATA` / `ICAO`) |
| --- | ---: | --- |
| **`operating`** | **11** | `Air Peace` (`P4` / `APK`), `Ibom Air` (`QI` / `IAN`), `United Nigeria Airlines` (`U5` / `UNA`), `ValueJet` (`VK` / `FVJ`), `Overland Airways` (`OF` / `OLA`), `Green Africa Airways` (`Q9` / `GWG`), `Arik Air` (`W3` / `ARA`), `Aero Contractors` (`N2` / `NIG`), `Max Air` (`VM` / `NGL`), `Rano Air` (`R4` / `RAN`), `XEJet` (`4U` / `XEJ`) |
| **`suspended`** | **2** | `Dana Air` (`9J` / `DAN` — NCAA AOC suspension 24 Apr 2024), `Azman Air` (`ICAO: AZM`, active IATA omitted — domestic suspension Aug 2024) |
| **`ceased`** (historical) | **10** | `Nigeria Airways` (`WT` / `NGA`, `1958–2003`), `Air Nigeria` / `Virgin Nigeria` / `Nigerian Eagle` (`VK` / `ANP`, `2005–2012`), `Bellview Airlines` (`B3` / `BLV`, `1992–2009`), `ADC Airlines` (`Z7` / `ADK`, `1991–2007`), `Okada Air` (`9H` / `OKJ`, `1983–1997`), `Sosoliso Airlines` (`SO` / `OSL`, `2000–2007`), `Chanchangi Airlines` (`5B` / `NCH`, `1997–2012`), `IRS Airlines` (`IS` / `LVB`, `2002–2013`), `Med-View Airline` (`VL` / `MEV`, `2007–2019`), `First Nation Airways` (`ICAO: FRN`, IATA omitted, `2011–2018`) |
| **Total** | **23** | **21/23** verified 2-character IATA designators · **23/23** verified 3-letter ICAO designators · **13** linked Nigerian hub airports across **7** states/FCT |

### Primary-Source Verification Highlights (Errors Caught in Secondary Blogs/Tables)
- **Max Air (`VM` / `NGL`):** Verified official NCAA press release (`17 March 2025`) clearing Max Air to resume domestic operations after safety and economic audits (overriding stale `"grounded"` notes on secondary tables), plus August 2026 NCAA domestic flight activity.
- **Dana Air (`9J` / `DAN`) & Azman Air (`AZM`):** Marked **`suspended`** (never `"operating"`) with exact April 2024 NCAA suspension and August 2024 fleet-maintenance suspension records.
- **Green Africa Airways (`Q9` / `GWG`):** Corrected transposed IATA/ICAO columns found on Wikipedia (`Q9` is the 2-char IATA code; `GWG` is the 3-letter ICAO code).
- **XEJet (`4U` / `XEJ`):** Verified `4U` / `XEJ` (`RED TAIL`) directly against `xejet.com` and `avcodes.co.uk` (rejecting conflicting `U0` / `VBR` secondary claims).
- **Historical IATA code recycling (`VK`, `B3`, etc.):** Documented `iataHistoricalNote` on ceased carriers whose 2-character IATA codes were later reassigned globally (notably `VK`, held by Virgin Nigeria / Air Nigeria `2005–2012` and reassigned to active Nigerian carrier ValueJet `VK` / `FVJ`).
- **Omitted unassigned IATA codes (`Azman Air`, `First Nation Airways`):** Omitted rather than guessed.

---

## 3. Verification Gates & Build Audit Summary

All checks executed on `arena/81528c00-naijacheck`:

1. `npm run generate` — `166` generated articles (`0` duplicate meta titles/paths), `public/search-index.json` (`1,121` entries including `24` `airlines` entries: `/airlines` + `23` leaves), `search-tips-seed.json` (`1,262` deduplicated SSOT tips).
2. `npm run typecheck` (`tsc --noEmit`) — `0` errors.
3. `npm run lint` (`eslint .`) — `0` errors (`0` new warnings).
4. `npm test` — All `20` unit test suites passed (`site`, `share`, `quiz`, `govhowto`, `images`, `hero`, `headline`, `monitor`, `chart`, `chartui`, `navfeedback`, `push`, `telegram`, `nbs`, `watclock`, `search`, `bubblebar`, `banks`, `airports`, `oilgas`, `airlines`).
5. `npm run build` — `1,130` static pages generated cleanly (`+24` routes: `/airlines` + `23` `/airlines/[slug]`).
6. `npm run audit:static` —
   - `generatedHtmlRoutes`: `1,125` (`+24` from `1,101`)
   - `sitemapUrls`: `1,089` (`+24` from `1,065`)
   - `sitemapMissing`: `[]`, `indexedNotInSitemap`: `[]`, `noindexInSitemap`: `[]`
   - `brokenInternalLinks`: `[]`, `duplicateTitles`: `[]`, `duplicateDescriptions`: `[]`, `invalidJsonLd`: `[]`
   - `share`: `1,122 / 1,122` valid WhatsApp + X pairs (`malformedWhatsApp: []`, `malformedX: []`)
7. `npm run audit:content` — `0` findings on `/airlines` or `/airlines/[slug]` (`findingsCount: 6` unchanged pre-existing baseline).
8. End-to-end smoke checks — verified `/airlines` status filters (`All (23)`, `Operating (11)`, `Suspended (2)`, `Ceased or historical (10)`), copy buttons (`Copy P4`, `Copy APK`), 3 profile types (`air-peace`, `dana-air`, `air-nigeria`), search by code/name/former name (`P4`, `QI`, `Air Peace`, `Virgin Nigeria`), and two-way `/airports` <-> `/airlines` cross-links (`LOS`, `QUO`).
