# Nigerian commercial banks reference — HQ, CBN licence, sort & USSD codes

Owner runbook for `data/banks.json`, `lib/banks.ts`, `/codes/banks`, and `/codes/banks/[slug]`. Every bank profile is one fast, manually verified static reference page — zero invented codes, zero guessed addresses, zero thin doorway clones.

## Inclusion scope (explicit dataset boundary)

Phase 1 covers **12 major retail Deposit Money Banks operating in Nigeria**:
- **All 7 commercial banks holding CBN International Authorization**: Access Bank (`044`), Fidelity Bank (`070`), FCMB (`214`), First Bank (`011`), GTBank (`058`), UBA (`033`), and Zenith Bank (`057`).
- **5 nationwide retail commercial banks holding CBN National Authorization**: Ecobank Nigeria (`050`), Stanbic IBTC (`221`), Sterling Bank (`232`), Union Bank (`032`), and Wema Bank (`035`).

Out of scope in Phase 1 (documented transparently in `data/banks.json` `scope` and on `/codes/banks`):
- Regional commercial banks, merchant banks, non-interest banks, and microfinance banks (MFBs).
- Defunct/revoked-licence bank farms, street-level branch doorway pages, CAC RC scraping, or fake `FinancialProduct` offers.
- Never claim `"complete list of every bank ever"` and never claim CBN or bank endorsement.

## Data store: `data/banks.json` (SSOT)

Top-level metadata:
- `updatedAt`: ISO `YYYY-MM-DD` of the latest manual verification pass.
- `scope`: Explicit human-readable boundary rendered on `/codes/banks`.
- `notes`: Dataset-wide verification and non-endorsement notice.
- `hubSources`: Array of `{ label, url, kind: "primary" | "secondary" }` rendered on `/codes/banks#sources`.

Per-bank structure:

```json
{
  "slug": "gtbank",
  "name": "GTBank",
  "fullName": "Guaranty Trust Bank Limited (GTBank)",
  "fullLegalName": "Guaranty Trust Bank Limited",
  "parentGroup": "Guaranty Trust Holding Company Plc (GTCO)",
  "officialWebsite": "https://www.gtbank.com",
  "headquarters": "Plot 635, Akin Adesola Street, Victoria Island, Lagos",
  "headquartersCity": "Victoria Island, Lagos",
  "headquartersLinks": {
    "postalHref": "/codes/postal/lagos/victoria-island",
    "postalLabel": "Victoria Island postal code (101241)",
    "geoHref": "/geo/lagos/eti-osa",
    "geoLabel": "Eti-Osa LGA, Lagos"
  },
  "licenceType": "Commercial Bank — International Authorization",
  "statusNote": "Flagship Nigerian commercial banking subsidiary (Guaranty Trust Bank Limited, RC 152321) under Guaranty Trust Holding Company Plc (GTCO)...",
  "sortCodes": [
    { "code": "058", "label": "NIP / CBN bank code", "type": "nip" },
    { "code": "058152052", "label": "Head-office / common sort code (cheque clearing example)", "type": "head-office" }
  ],
  "ussd": [
    { "code": "*737#", "label": "Main USSD menu (Bank 737)", "purpose": "Entry point for GTBank USSD banking" }
  ],
  "sources": [
    {
      "label": "GTBank — Corporate Head Office Contact Page (official)",
      "url": "https://www.gtbank.com/help-centre/contact-us",
      "kind": "primary"
    }
  ],
  "lastVerified": "2026-10-23",
  "verification": "manual",
  "notes": "Dial from the phone number linked to your GTBank account..."
}
```

### Field & source rules

1. **`slug`**: URL-safe lower-kebab (`access-bank`), unique, permanent.
2. **Primary sources first (`kind: "primary"`)**: Every bank entry must cite at least:
   - The bank’s own official domain (`officialWebsite`, contact/privacy/annual-report page for HQ/legal entity, and official USSD page), and
   - Official Central Bank of Nigeria (`cbn.gov.ng`) published Deposit Money Banks lists / circulars for `licenceType` and registered head office.
3. **Secondary compilations (`kind: "secondary"`)**: Public industry compilations (`Mansa API`, `YouVerify`) may be included only when explicitly tagged `"kind": "secondary"` and consistent with primary facts (e.g. cross-checking 3-digit NIP and 9-digit head-office cheque sort code prefixes).
4. **Never guess**: If `headquarters`, `fullLegalName`, `parentGroup`, or `licenceType` cannot be verified from a citable public source, omit the field (or render `unverified` on page) — never invent or infer.
5. **Natural internal links (`headquartersLinks`)**: Link only to existing static `/codes/postal/...` and `/geo/...` routes that genuinely cover the head-office location (`lib/banks.test.ts` and `audit:static` enforce zero broken links).
6. **Non-boilerplate `statusNote`**: Every bank’s `statusNote` must reflect real, sourced corporate/regulatory history (e.g. HoldCo structure, headquarters move, or completed merger) — `lib/banks.test.ts` rejects duplicate `statusNote` strings.

## Updating after mergers, rebrands, HQ moves, or code changes

### A) Merger or absorption (example: Union Bank absorbing Titan Trust Bank)
1. Confirm formal CBN approval and completion date from an official bank release or CBN circular.
2. If the surviving entity is already in `data/banks.json`:
   - Keep the surviving bank’s `slug` and `name`.
   - Record the completed merger, absorbed institution name, completion date, and account-continuity guidance in `statusNote` and `notes`.
   - Add the official merger press release / circular to `sources` with `"kind": "primary"`, and update `lastVerified` to the verification date (`YYYY-MM-DD`).
3. If an listed bank is absorbed into another bank and ceases standalone retail operations:
   - Do **not** delete the URL silently without a plan; update `statusNote`, `licenceType`, and `notes` to state clearly which surviving bank absorbed it, citing the CBN/official notice, until a deliberate redirect/archive PR is approved.

### B) Corporate HoldCo restructuring, rebrand, or head-office relocation
1. Check both the bank’s current official contact/investor filings and the latest CBN Deposit Money Banks register.
2. If the bank’s website and CBN’s older PDF show different addresses (e.g. after a headquarters move such as Access Bank to Oniru or Ecobank to Ozumba Mbadiwe Avenue), state the current official address and transparently note the CBN-registered street in `headquarters` or `statusNote`, citing both primary URLs.
3. Update `fullLegalName` (e.g. `Plc` vs `Limited` operating subsidiary under a `HoldCo`) and `parentGroup` from official filings.
4. Verify `headquartersLinks` still points to the matching static postal/LGA route.

### C) Sort code or USSD shortcut update
1. Verify on the bank’s official USSD/e-channels page.
2. Replace or remove any retired USSD shortcut (note removals briefly in `notes`), update `sources` + `lastVerified`, and re-run the full verification gate below.

## Pre-PR verification gate

Run all commands from repo root before opening a PR:

```bash
npm run generate
npm run typecheck
npm run lint
npm test
npm run build
npm run audit:static
```

- `npm run banks:test` (included in `npm test`) verifies all 12 banks, primary source rules, unique codes, non-duplicate `statusNote` copy, explicit dataset scope, and valid postal/LGA cross-links.
- `npm run audit:static` verifies unique titles/descriptions, canonical URLs, JSON-LD validity, zero broken internal links, `sitemap.xml` parity, and WhatsApp/X `ShareControls` safety (never put `"live"` or `@` in share `title`/`summary`).

## Evidence & release

- Phase B baseline evidence: `docs/evidence/bank-codes-phase-b-2026-10-21.md`
- Phase 1 commercial banks reference upgrade evidence: `docs/evidence/banks-reference-phase-1-2026-10-23.md`
- Release discipline: leave PR **unmerged**, no DNS changes, ₦0 / no paid APIs.
