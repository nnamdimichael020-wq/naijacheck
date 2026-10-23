# Nigerian airports reference — IATA/ICAO codes, cities & operational profiles

Owner runbook for `data/airports.json`, `lib/airports.ts`, `/airports`, and `/airports/[slug]`. Every airport profile is one fast, manually verified static reference page — zero invented codes, zero guessed international designations, zero thin doorway clones, and zero live-flight promises.

## Why `/airports` (and not `/travel` or `/codes/airports`)

1. **Why not `/travel`:** NaijaCheck does not sell flight tickets, compare airfares, display departure boards, or list hotels. Putting airports under `/travel` would imply a general travel/booking vertical that violates Phase 2 non-goals.
2. **Why not `/codes/airports`:** While IATA (`LOS`, `ABV`) and ICAO (`DNMM`, `DNAA`) codes are core lookup keys, each airport record also carries physical geography (`stateSlug`, `lgaSlug`, locality), runway dimensions, federal vs state/concession operator context, and scheduled passenger status. `/codes` stays sharply focused on numeric/dialing identifiers (`/codes/banks`, `/codes/postal`).
3. **Clean 1-segment hub:** `/airports` fits naturally into `DROPDOWN_TOP_LEVEL_ALLOWLIST` (shallow header search dropdown), `ExploreGrid` on `/`, and the `Places` bubble (`places-airports`) in the 6-bubble category bar without adding a 7th top-level bubble.

## Inclusion scope (explicit dataset boundary)

Phase 2 covers **24 major public commercial airports in Nigeria** across **23 states and FCT**:
- **7 federally designated scheduled international passenger gateways (`type: "international"`)**:
  - Lagos (`LOS` / `DNMM`), Abuja (`ABV` / `DNAA`), Kano (`KAN` / `DNKN`), Port Harcourt (`PHC` / `DNPO`), Enugu (`ENU` / `DNEN`), Uyo (`QUO` / `DNAI`), and Maiduguri (`MIU` / `DNMA`).
- **17 major domestic commercial airports (`type: "domestic"`)**:
  - Owerri (`QOW` / `DNIM`), Benin (`BNI` / `DNBE`), Calabar (`CBQ` / `DNCA`), Ilorin (`ILR` / `DNIL`), Sokoto (`SKO` / `DNSO`), Kaduna (`KAD` / `DNKA`), Yola (`YOL` / `DNYO`), Jos (`JOS` / `DNJO`), Ibadan (`IBA` / `DNIB`), Akure (`AKR` / `DNAK`), Asaba (`ABB` / `DNAS`), Umueri/Anambra (`DNAN`, global IATA omitted), Osubi/Warri (`QRW` / `DNSU`), Katsina (`DKA` / `DNKT`), Minna (`MXJ` / `DNMN`), Makurdi (`MDI` / `DNMK`), and Gombe (`GMO` / `DNGO`).

Explicitly out of scope (stated transparently in `data/airports.json` `scope` and on `/airports`):
- Military-only airbases, private oil/gas helipads, and unscheduled bush airstrips (never claim `"every airstrip in Nigeria"`).
- Live flight status, arrivals/departures boards, ticket booking, or fare comparisons.

## Data store: `data/airports.json` (SSOT)

Top-level fields:
- `updatedAt`: ISO `YYYY-MM-DD` of the latest manual verification pass.
- `scope`: Human-readable boundary rendered on `/airports#sources`.
- `notes`: Classification methodology and non-booking disclaimer.
- `hubSources`: Array of `{ label, url, kind: "primary" | "secondary" }`.

Per-airport structure:

```json
{
  "slug": "lagos-murtala-muhammed",
  "name": "Murtala Muhammed International Airport",
  "alternateNames": ["Lagos Airport", "MMIA Lagos", "MMA2 Ikeja"],
  "city": "Ikeja, Lagos",
  "locality": "Ikeja, Lagos mainland",
  "stateSlug": "lagos",
  "stateName": "Lagos",
  "lgaSlug": "ikeja",
  "lgaName": "Ikeja",
  "postalHref": "/codes/postal/lagos/ikeja",
  "postalLabel": "Ikeja postal code (100271)",
  "type": "international",
  "iata": "LOS",
  "icao": "DNMM",
  "operator": "Federal Airports Authority of Nigeria (FAAN); Domestic Terminal 2 (MMA2) operated under PPP concession by Bi-Courtney Aviation Services Limited (BASL)",
  "runwayNote": "Dual parallel asphalt runways — 18R/36L (3,900 m × 60 m) and 18L/36R (2,743 m × 45 m).",
  "operationsNote": "Nigeria's busiest international and domestic aviation hub...",
  "sources": [
    {
      "label": "FAAN — Murtala Muhammed International Airport Lagos (official)",
      "url": "https://faan.gov.ng/mmia-lagos/",
      "kind": "primary"
    }
  ],
  "lastVerified": "2026-10-23",
  "verification": "manual",
  "notes": "International and domestic terminals sit on opposite sides of the Ikeja airfield..."
}
```

### Strict code & classification rules

1. **Zero invented IATA/ICAO codes:**
   - Every `icao` must be a verified 4-letter Nigerian civil location indicator (`DNxx`).
   - `iata` is optional (`iata?: string`). If international aeronautical registries do not assign a global 3-letter IATA code — or if a domestic booking code collides with another airport globally (e.g. `ANA` belongs to Anaa Airport, French Polynesia in IATA's global registry while `DNAN` Umueri uses `ANA` only inside local Nigerian booking engines) — **omit `iata`** and explain the distinction in `notes`.
2. **Scheduled passenger `type` honesty:**
   - Use `"international"` strictly for airports designated by the Federal Government / NCAA / FAAN for regular scheduled cross-border passenger operations.
   - Airports carrying `"International"` in a ceremonial or cargo title while operating regular scheduled domestic passenger routes (with seasonal Hajj charters or cargo) remain `"domestic"`, with Hajj/cargo capabilities explained in `operationsNote` and `notes`.
3. **Ceremonial renamings (`alternateNames`):**
   - Keep both the widely recognised operational name and federal ceremonial renaming in `name` / `alternateNames` so searchers find the right page regardless of which name appears on their ticket or federal circular.
4. **Verified internal geo/postal cross-links:**
   - `stateSlug` and `lgaSlug` must match `data/lgas.json`; `postalHref` must match an existing static route in `data/postal-codes.json` (`lib/airports.test.ts` and `audit:static` fail on any broken route).

## Updating when an airport is renamed, upgraded, or assigned a new code

1. Confirm the change from a primary public source (`faan.gov.ng`, `ncaa.gov.ng`, Federal Ministry of Aviation / `fmino.gov.ng`, official state government release, or official IATA/ICAO publication).
2. If an IATA code is formally assigned or reassigned (for example, if IATA acts on the August 2026 Federal Ministry of Aviation request regarding Osubi Airport's `QRW` code):
   - Update `iata`, keep the prior code mentioned in `notes` for transition clarity, add the primary citation to `sources`, and update `lastVerified`.
3. If a state-built airport begins regular NCAA-cleared scheduled commercial passenger operations and has at least one verified aeronautical code (`DNxx` ICAO or IATA) plus substantive runway/operator facts:
   - Append the entry to `data/airports.json`, update counts in `lib/airports.test.ts` and `docs/runbooks/airports.md`, and run `npm run generate` so `public/search-index.json`, the `Places` bubble, `ExploreGrid`, and `sitemap.xml` stay in lockstep.

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

- `npm run airports:test` (part of `npm test`) enforces dataset scope honesty, primary FAAN/NCAA hub sources, unique slugs/IATA/ICAO codes, non-duplicate `operationsNote` copy, and valid `/geo/...` + `/codes/postal/...` cross-links.
- Never put `"live"` or `@` inside `<ShareControls title=... summary=... />`, and never put outdated past years (`2020`–`2025` in `2026`) in `<title>` or `<h1>`.
