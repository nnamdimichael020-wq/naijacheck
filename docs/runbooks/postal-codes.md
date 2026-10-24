# Postal codes — NIPOST 6-digit codes (Phase C + Phase 6)

Owner runbook for `data/postal-codes.json` and the `/codes/postal` archive.

## Data store: `data/postal-codes.json`

SSOT — one entry per state + FCT (`37` entries):

```json
{
  "slug": "lagos",
  "name": "Lagos",
  "capital": "Ikeja",
  "zoneCode": "100",
  "headOfficeCode": "100001",
  "range": "100001–106104",
  "intro": "Unique one-paragraph intro for Lagos (not swapped template)",
  "description": "Short SEO description",
  "places": [
    {
      "name": "Ikeja — Head office / GPO",
      "code": "100001",
      "slug": "ikeja-gpo",
      "label": "Head office/GPO",
      "sources": [{ "label": "...", "url": "https://..." }],
      "notes": "Alternative code note if needed"
    }
  ],
  "sources": [{ "label": "NigeriaZipCode — Lagos State full LGA & district postal codes", "url": "https://nigeriazipcode.com/lagos/" }],
  "lastVerified": "2026-10-24",
  "verification": "manual",
  "notes": "Head office codes end 001..."
}
```

## Editorial & verification rules

1. **Zero invented codes**: Every `code` must match `/^\d{6}$/` (`1`–`9` opening digit, never `000000`) and cite at least one public source URL (`https://`) in `place.sources` (`lib/postal.ts` rejects any place missing `sources`, and `lib/postal.test.ts` asserts `postalPlaceCount() === rawJsonTotal`).
2. **Unique `slug` within each state**: Keep GPO rows distinct (`ikeja-gpo`, `port-harcourt-gpo`) when a city also has a district leaf (`ikeja` `100271`, `port-harcourt` `500272`). Keep core place names before ` — ` or ` (` concise (<= 28 chars) so `scripts/generate-content.ts` -> `lib/search-tips.ts` generates clean mobile search tips under 56 characters.
3. **Source quality & synthetic-range trap**:
   - Anchor non-Lagos/Abuja state and LGA codes to `https://nigeriazipcode.com/<state>/` (compiled from NIPOST delivery-district ranges) and cross-check secondary guides (`apartments.ng`, `nigeriahousingmarket.com/postal-codes/<state>`, `businessconnect.com.ng`, `ebills.africa`).
   - **Watch out for synthetic `x01–x99` blog tables**: Some third-party blog pages (e.g. `businessconnect.com.ng/oyo-state-postal-codes/`) publish fabricated sequential ranges (`200101–219999`) that contradict NIPOST’s real delivery districts (`200001–212104`, `Ogbomoso 210211`, `Oyo Town 211211`). Never import sequential `x01–x99` filler tables; verify against `nigeriazipcode.com/<state>/` or multi-source consensus.
4. **Conflict transparency**: When reputable compilations disagree (e.g. `Ajah 105101 vs 101245`, `Apapa 102272 vs 101251–101254`, `Ebonyi 480001–491110 vs 840001`, `Bayelsa 560001 vs 561001`, `Lafia 961001 vs 962001`, `Eleme 504101 vs 501101`, `Suleja 900105 vs 910101`), record the conflict in `notes` and link both sources — or omit the row if unverified.
5. **On-page `#sources` completeness**: `getAggregatedStateSources(state)` deduplicates `state.sources` + every `place.sources` by URL so **100%** of distinct public source URLs appear on `/codes/postal/[state]` (never truncate with `.slice(0, 5)`).
6. **Honest coverage notice**: Always state plainly that NaijaCheck covers verified GPOs, major urban districts, LGA seats and commercial cities — **not every street or village in Nigeria**.
7. **Curated leaf discipline (`/codes/postal/[state]/[area]`)**:
   - Allowlisted in `CURATED_POSTAL_LEAVES` (`lib/postal.ts`) and backed 1:1 by bespoke `POSTAL_AREA_EXTRAS` (`lib/postal-area-extras.ts`) — never village-level placeholder leaves.
   - Current allowlist (`20` leaves):
     - **Lagos (`9`)**: `ikeja` (`100271`), `victoria-island` (`101241`), `lekki` (`105102`), `surulere` (`101283`), `ikorodu` (`104101`), `yaba` (`101212`), `apapa` (`102272`), `ikoyi` (`101233`), `ajah` (`105101`).
     - **FCT Abuja (`7`)**: `garki` (`900241`), `wuse` (`900281`), `maitama` (`900271`), `asokoro` (`900231`), `gwarinpa` (`900108`), `central-business-district` (`900211`), `kubwa` (`901101`).
     - **Regional commercial hubs (`4`)**: `rivers/port-harcourt` (`500272`), `kano/kano-municipal` (`700101`), `abia/aba` (`450101`), `anambra/onitsha` (`430001`).

## Coverage snapshot (2026-10-24 — Phase 6)

- **States / FCT**: `37` (`0` single-GPO-only states; every state has `5`–`28` verified places)
- **Verified places**: `262` (expanded from `77` in Phase C: Lagos `28`, FCT Abuja `21`, Rivers `11`, Kano `9`, Anambra `8`, Delta `8`, Ogun `8`, Oyo `8`, Edo `7`, Enugu `7`, Kaduna `7`, plus `5`–`6` verified places across every remaining state)
- **Curated `/codes/postal/[state]/[area]` leaves**: `20` (`20/20` with unique `areaExtras` + verified `/geo`, `/ports`, `/airports`, `/oil-gas` and `/codes/banks` cross-links)

## Adding / fixing a code

1. Edit `data/postal-codes.json`:
   - Add/update the `places[]` entry with its 6-digit code, unique `slug`, `label`, `sources` (`https://` URL checked that day), optional conflict `notes`, and set `lastVerified` + top-level `updatedAt` to today (`YYYY-MM-DD`).
   - If promoting a high-intent commercial hub to a leaf route, add `{ state, area }` to `CURATED_POSTAL_LEAVES` in `lib/postal.ts` AND add unique `intro`, `bullets`, `faqExtra`, and verified `crossLinks` in `lib/postal-area-extras.ts` (update leaf count assertion in `lib/postal.test.ts` and `lib/search.test.ts`).
2. Regenerate search index & search tips from SSOT:
   ```bash
   npm run generate
   ```
3. Run full verification before opening PR:
   ```bash
   npm run typecheck
   npm run lint
   npm run postal:test
   npm test
   npm run build
   npm run audit:static
   npm run audit:content
   ```
4. Open an **unmerged** PR with before/after place counts and source audit notes.

## Evidence files

- Phase C baseline (`2026-10-21`): `docs/evidence/postal-codes-phase-c-2026-10-21.md` (`77` places, `12` leaves)
- Phase 6 expansion (`2026-10-24`): `docs/evidence/postal-codes-phase-6-2026-10-24.md` (`262` places, `20` leaves, `0` single-row states, `0` invented codes)
