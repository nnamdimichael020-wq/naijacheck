# Nigerian airlines reference — operating status, IATA/ICAO designators & hub airports

Owner runbook for `data/airlines.json`, `lib/airlines.ts`, `/airlines`, and `/airlines/[slug]`. Every airline profile is a manually verified static reference page — zero invented codes, zero guessed `"still flying"` claims, zero thin doorway clones, and zero booking, fare, or timetable promises.

## Why `/airlines` (and not `/travel/airlines` or `/codes/airlines`)

1. **Why not `/travel/airlines`:** NaijaCheck does not sell flight tickets, compare airfares, display departure boards, or earn travel affiliate commissions. Placing airlines under `/travel` would imply booking or fare-comparison features outside our static reference scope.
2. **Symmetric Nigerian civil aviation cluster (`/airports` <-> `/airlines`):** Pairing `/airlines` directly alongside `/airports` (Phase 2) forms a two-way civil aviation cluster where every airline profile links to its verified Nigerian base airport(s) (`/airports/[slug]`) and each airport profile lists carriers with a verified hub or historical base at that aerodrome.
3. **Clean 1-segment hub:** `/airlines` slots into `DROPDOWN_TOP_LEVEL_ALLOWLIST` (shallow header dropdown), `ExploreGrid` on `/`, and the `Places` bubble (`places-airlines`, right beside `places-airports`) while preserving **strictly 6** main category bubbles.

## Inclusion scope (explicit dataset boundary)

Phase 4 covers **23 verified major scheduled passenger airlines in Nigeria (past and present)**:
- **11 Operating scheduled passenger carriers (`status: "operating"`)**:
  - `Air Peace` (`P4` / `APK`), `Ibom Air` (`QI` / `IAN`), `United Nigeria Airlines` (`U5` / `UNA`), `ValueJet` (`VK` / `FVJ`), `Overland Airways` (`OF` / `OLA`), `Green Africa Airways` (`Q9` / `GWG`), `Arik Air` (`W3` / `ARA`), `Aero Contractors` (`N2` / `NIG`), `Max Air` (`VM` / `NGL`), `Rano Air` (`R4` / `RAN`), and `XEJet` (`4U` / `XEJ`).
- **2 Suspended scheduled passenger carriers (`status: "suspended"`)**:
  - `Dana Air` (`9J` / `DAN` — AOC suspended by NCAA on 24 April 2024 pending safety and financial audit) and `Azman Air` (`AZM`, active IATA omitted — scheduled domestic operations indefinitely halted in August 2024 amid fleet C-check delays).
- **10 Ceased / historical scheduled passenger carriers (`status: "ceased"`)**:
  - `Nigeria Airways` (`WT` / `NGA`, `1958–2003`), `Air Nigeria` / `Virgin Nigeria` / `Nigerian Eagle` (`VK` / `ANP`, `2005–2012`), `Bellview Airlines` (`B3` / `BLV`, `1992–2009`), `ADC Airlines` (`Z7` / `ADK`, `1991–2007`), `Okada Air` (`9H` / `OKJ`, `1983–1997`), `Sosoliso Airlines` (`SO` / `OSL`, `2000–2007`), `Chanchangi Airlines` (`5B` / `NCH`, `1997–2012`), `IRS Airlines` (`IS` / `LVB`, `2002–2013`), `Med-View Airline` (`VL` / `MEV`, `2007–2019`), and `First Nation Airways` (`FRN`, `2011–2018`).

Explicitly out of scope (stated transparently in `data/airlines.json` `scope` and on `/airlines`):
- Private business-jet charter-only operators, offshore helicopter-only contractors, cargo-only fleets, virtual paper brands that never launched scheduled passenger flights, and unverified single-aircraft operators.
- Flight booking, airfares, live flight tracking, or timetable schedules.

## Data store: `data/airlines.json` (SSOT)

Top-level fields:
- `updatedAt`: ISO `YYYY-MM-DD` of the latest manual verification pass.
- `scope`: Human-readable boundary rendered on `/airlines#sources`.
- `notes`: Verification methodology and non-booking disclaimer.
- `hubSources`: Array of `{ label, url, kind: "primary" | "secondary" }`.

Per-airline fields:
- `slug`: Lowercase URL slug (`[a-z0-9-]+`).
- `name`, `fullLegalName?`, `formerNames?`: Common display name, corporate registration name, and former names / historical designator notes (indexed in omni-search so queries like `"Virgin Nigeria"` or `"WAAC"` resolve immediately).
- `status`: `"operating" | "suspended" | "ceased" | "merged" | "rebranded" | "unknown"`.
- `iata?`: Verified 2-character uppercase ASCII alphanumeric IATA airline designator (`^[A-Z0-9]{2}$`). Omit when unassigned or unconfirmed post-suspension.
- `iataHistoricalNote?`: Required whenever a ceased carrier's historical 2-character IATA designator was later reassigned by IATA (for example, `VK` held by Virgin Nigeria / Air Nigeria in `2005–2012` and later assigned to active Nigerian carrier ValueJet).
- `icao?`: Verified 3-letter uppercase ASCII ICAO airline designator (`^[A-Z]{3}$`).
- `callsign?`: Verified ICAO radiotelephony callsign where sourced.
- `yearsActive?`, `foundedYear?`, `ceasedYear?`: Sourced operating window.
- `headquartersCity?`, `stateSlug`, `stateName`, `lgaSlug?`, `lgaName?`, `postalHref?`, `postalLabel?`: Corporate headquarters location linked to `data/lgas.json` and `data/postal-codes.json`.
- `hubAirportSlugs`: Non-empty array of verified airport slugs in `data/airports.json`.
- `serviceScope` & `statusContext`: Concise, sourced operational and regulatory history.
- `website?`: Official carrier website **only** for active/verified domains — omit on ceased carriers so visitors are never sent to expired or parked spam domains.
- `sources`: At least 2 `{ label, url, kind }` citations per airline (`ncaa.gov.ng`, `iata.org`, `faan.gov.ng`, official carrier domain, or reputable aviation registries).
- `lastVerified`: ISO `YYYY-MM-DD`; `verification: "manual"`.

## Updating when an airline's operating status changes

1. **Suspension (`operating` -> `suspended`):**
   - When the Nigeria Civil Aviation Authority (NCAA) suspends an AOC or an airline halts all scheduled passenger flights indefinitely (e.g. fleet maintenance grounding), change `status` to `"suspended"`, record the exact suspension date and reason in `statusContext` and `notes`, cite the NCAA release or official announcement in `sources`, and bump `lastVerified` + top-level `updatedAt`.
2. **Resumption (`suspended` -> `operating`):**
   - Only mark `"operating"` again **after** verifying an official NCAA clearance notice or active scheduled passenger resumption (such as the 17 March 2025 NCAA press release clearing Max Air after its safety and economic audit). Never rely on unverified social posts or "plans to resume next month" announcements.
3. **Permanent closure, merger, or rebrand (`suspended` / `operating` -> `ceased` / `merged` / `rebranded`):**
   - Update `status`, set `ceasedYear` + `yearsActive`, remove `website` if the domain lapses, add prior brand names to `formerNames`, and add `iataHistoricalNote` if IATA withdraws or reassigns the 2-character designator.
4. **Adding a newly certified scheduled passenger carrier:**
   - Only add a new Nigerian carrier once it holds a verified NCAA scheduled passenger AOC, has commenced commercial passenger flights, and has at least one verified aviation designator (`IATA` or `ICAO`) plus primary citations.

## Content audit guardrails

- Never place past years (`2020`–`2025` in `2026`) inside `<title>` or `<h1>` (`scripts/audit-content.mjs` `outdated-year-headline`). Keep `yearsActive` in badges and `<dl>` summary rows.
- Never place `"live"` or `@` in `<ShareControls>` `title` or `summary` (`scripts/audit-static.mjs`), and never use `"live"` in manual airline prose.

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
