# Evidence — Nigerian Commercial Banks Reference Upgrade (Phase 1)

- **Date:** `2026-10-23` (WAT)
- **Branch:** `arena/81d1f1bf-naijacheck`
- **Cost:** `₦0 / $0` (static JSON SSOT + manual verification against official public CBN & bank pages; zero paid APIs, zero scraping daemons, zero DNS changes)
- **Zero invented values:** Confirmed — every corporate headquarters address, registered legal entity name, holding company, CBN commercial banking licence tier, sort code, and USSD shortcut is backed by cited public URLs in `data/banks.json` and rendered on-page with explicit `[Official / primary]` vs `[Secondary compilation]` labels.

---

## 1. Dataset Scope & Honesty Boundary

Rather than claiming `"complete list of every bank in Nigeria ever"` or generating thin doorway clones, `data/banks.json` (`scope`) and `/codes/banks` state the exact inclusion boundary:

- **12 major retail Deposit Money Banks operating in Nigeria**:
  - **7 Commercial Banks — International Authorization** (all 7 Nigerian commercial banks holding CBN International Authorization): `access-bank`, `fidelity-bank`, `fcmb`, `first-bank`, `gtbank`, `uba`, `zenith-bank`.
  - **5 Commercial Banks — National Authorization** (nationwide retail commercial banks): `ecobank`, `stanbic-ibtc`, `sterling-bank`, `union-bank`, `wema-bank`.
- Explicitly excluded from Phase 1: regional commercial banks, merchant banks, non-interest banks, microfinance banks, defunct/revoked-licence bank farms, street-level branch pages, CAC RC mirrors, and fake `FinancialProduct` offers.
- Explicit non-endorsement notice on `/codes/banks` and every `/codes/banks/[slug]` page.

---

## 2. Field Coverage Summary Across All 12 Banks

| Field in `data/banks.json` | Populated count | Notes |
| --- | --- | --- |
| `slug` & `name` | **12 / 12** | Existing permanent slugs preserved |
| `fullLegalName` | **12 / 12** | Verified from CBN DMB register & official bank legal/contact disclosures |
| `parentGroup` | **7 / 12** | Populated for the 7 banks operating under a Financial Holding Company / parent group (`Access Holdings Plc`, `GTCO`, `First HoldCo Plc`, `ETI`, `Sterling Financial Holdings Company Plc`, `Stanbic IBTC Holdings Plc`, `FCMB Group Plc`); omitted for the 5 standalone `Plc` banks (`Zenith`, `UBA`, `Fidelity`, `Union`, `Wema`) |
| `officialWebsite` | **12 / 12** | Official `https://` Nigerian banking domain |
| `headquarters` & `headquartersCity` | **12 / 12** | Verified street/building head office in Victoria Island (6) or Marina/Tinubu, Lagos Island (6) |
| `headquartersLinks` (`postalHref` + `geoHref`) | **12 / 12** | 6 VI banks → `/codes/postal/lagos/victoria-island` (`101241`) + `/geo/lagos/eti-osa`; 6 Marina/Tinubu banks → `/codes/postal/lagos` + `/geo/lagos/lagos-island` |
| `licenceType` | **12 / 12** | 7 `Commercial Bank — International Authorization`, 5 `Commercial Bank — National Authorization` |
| `statusNote` | **12 / 12** | Unique, non-boilerplate corporate/regulatory context per bank (HoldCo, HQ move, or CBN-approved merger) |
| `sortCodes` (3-digit NIP + 9-digit HQ example) | **12 / 12** | 12 × 3-digit NIP codes + 12 × 9-digit head-office cheque-clearing examples |
| `ussd` (primary + verified shortcuts) | **12 / 12** | Upgraded against official bank USSD pages across all 12 banks |
| `sources` with `"kind": "primary"` | **12 / 12** | Every bank now cites official bank domain pages + official `cbn.gov.ng` DMB list (previously 8 of 12 banks cited secondary compilations only) |
| `lastVerified` | **12 / 12** | `2026-10-23` (`verification: "manual"`) |

---

## 3. Per-Bank Verification Inventory (`2026-10-23`)

| Slug | Legal Entity (`fullLegalName`) | NIP / HQ Sort | Primary USSD | Corporate Headquarters | CBN Licence Tier | Notable Primary Verification Detail |
| --- | --- | --- | --- | --- | --- | --- |
| `access-bank` | Access Bank Plc (`Access Holdings Plc`) | `044` / `044150149` | `*901#` | Access Tower, 14/15 Prince Alaba Oniru Road, Victoria Island, Lagos | International | Verified current Oniru Road HQ (`accessbankplc.com/contact-us/we-care` & `cbn.gov.ng`), replacing stale Danmole Street listings found on old blogs |
| `gtbank` | Guaranty Trust Bank Limited (`GTCO`) | `058` / `058152052` | `*737#` | Plot 635, Akin Adesola Street, Victoria Island, Lagos | International | Verified `Guaranty Trust Bank Limited` (RC 152321) under GTCO (`gtbank.com/help-centre/contact-us`) |
| `zenith-bank` | Zenith Bank Plc | `057` / `057150013` | `*966#` | Zenith Heights, Plot 84/87 Ajose Adeogun Street, Victoria Island, Lagos | International | Verified Plot 84/87 Zenith Heights campus (`zenithbank.com/customer-service/` & `cbn.gov.ng`) |
| `first-bank` | First Bank of Nigeria Limited (`First HoldCo Plc`) | `011` / `011151003` | `*894#` | Samuel Asabia House, 35 Marina, Lagos Island, Lagos | International | Verified 35 Marina HQ & individual SMS-alert eligibility rule (`firstbanknigeria.com/contact/`) |
| `uba` | United Bank for Africa Plc | `033` / `033154282` | `*919#` | UBA House, 57 Marina, Lagos Island, Lagos | International | Added official UBA `*919#` & self-service citations (`*919*00#` balance, `*919*911#` card block) |
| `fidelity-bank` | Fidelity Bank Plc | `070` / `070150003` | `*770#` | Fidelity Place, 2 Kofo Abayomi Street, Victoria Island, Lagos | International | Added official `fidelitybank.ng/contact-us/`, `my-770/`, and FAQ (`*770*01#`) primary sources |
| `ecobank` | Ecobank Nigeria Limited (`ETI`) | `050` / `050150010` | `*326#` | Plot 270B1 Ozumba Mbadiwe Avenue, VI, Lagos (CBN register also lists 21 Ahmadu Bello Way, VI) | National | Documented both Ecobank Nigeria’s official Ozumba Mbadiwe HQ and CBN’s April 2024 Ahmadu Bello Way entry |
| `union-bank` | Union Bank of Nigeria Plc | `032` / `032156825` | `*826#` | Stallion Plaza, 36 Marina, Lagos Island, Lagos | National | Added official `*826#` page (`*826*6#` block) + official 1 September 2025 completion of CBN-approved merger absorbing Titan Trust Bank Limited |
| `sterling-bank` | Sterling Bank Limited (`Sterling Financial Holdings Company Plc`) | `232` / `232150029` | `*822#` | Sterling Towers, 20 Marina, Lagos Island, Lagos | National | Upgraded USSD transfer/register/block strings (`*822*1#`, `*822*Amount*AccountNumber#`, `*822*911#`) from official `sterling.ng/personal/e-channels/` |
| `wema-bank` | Wema Bank Plc | `035` / `035150103` | `*945#` | Wema Towers, 54 Marina, Lagos Island, Lagos | National | Added official `wemabank.com/personal/e-banking/945-2/` (`*945*0#`, `*945*01#`, `*945*911#`) & 54 Marina HQ |
| `stanbic-ibtc` | Stanbic IBTC Bank Limited (`Stanbic IBTC Holdings Plc`) | `221` / `221159522` | `*909#` | IBTC Place (Stanbic IBTC Towers), Walter Carrington Crescent, Victoria Island, Lagos | National | Replaced secondary USSD guesses with official `stanbicibtcbank.com` shortcuts (`*909*11*...` intrabank, `*909*22*...` interbank, `*909*1*911#` block, `*909*37#` account opening) |
| `fcmb` | First City Monument Bank Limited (`FCMB Group Plc`) | `214` / `214150018` | `*329#` | Primrose Tower, 17A Tinubu Street, Marina, Lagos Island, Lagos | International | Corrected balance enquiry to `*329*00#` vs PIN/transaction code `*329*0#` per official `fcmb.com/personal-banking/USSD.php`; CBN International Authorization verified |

---

## 4. Information Architecture & UX Upgrades

1. **`/codes/banks` (`app/codes/banks/page.tsx` + `components/codes/banks-search.tsx`)**:
   - Clear H1 (`List of commercial banks in Nigeria — sort codes, USSD & headquarters`) + honest scoped intro and jump anchors (`#directory`, `#all-sort-codes`, `#sources`).
   - Answer-first filterable & searchable semantic table (`Bank | Sort code(s) | Primary USSD | HQ & CBN licence | Verified`) with 44px `CopyButton` controls and instant CBN licence-tier filter buttons (`All (12)` · `International (7)` · `National (5)`).
   - Single-URL `#all-sort-codes` comparison section contrasting 3-digit NIP codes, 9-digit head-office cheque clearing prefixes, and International (`₦500bn`) vs National (`₦200bn`) CBN commercial banking licences.
   - Hub `#sources` methodology block + Related links (`/codes`, `/codes/postal`, `/codes/postal/lagos/victoria-island`, `/geo/lagos`, `/rates`, `/status`) + `ShareControls` + `CollectionPage`/`ItemList` JSON-LD.
2. **`/codes/banks/[slug]` (`app/codes/banks/[slug]/page.tsx`)**:
   - Answer-first `Key reference facts` summary card in the first screen (3-digit NIP + copy, primary USSD + copy, official legal name + HoldCo, CBN licence category, corporate headquarters + natural postal/LGA internal links, unique `statusNote`, `lastVerified`, and official website link).
   - Preserved copyable sort code and USSD shortcut cards, upgraded Sources badges (`Official / primary` vs `Secondary compilation`), synchronised visible FAQ + `FAQPage` JSON-LD, accurate `WebPage.about` `Organization` JSON-LD (zero fake `FinancialProduct` offers), and fixed double `| NaijaCheck` title suffix.
3. **Search Index & Runbook (`scripts/generate-content.ts`, `lib/banks.test.ts`, `docs/runbooks/bank-codes.md`)**:
   - `public/search-index.json` indexes legal names, parent HoldCos, headquarters districts, and CBN licence tiers from `data/banks.json`.
   - Added `lib/banks.test.ts` (`npm run banks:test` wired into `npm test`).
   - Updated `docs/runbooks/bank-codes.md` with inclusion scope and step-by-step runbook for bank mergers, HoldCo restructurings, head-office moves, and code changes.

---

## 5. Verification Gate Results

All checks executed on `2026-10-23` and exited `0`:

- `npm run generate` — `166` article pages, `0` duplicate meta titles, `0` duplicate paths; `public/search-index.json` updated (`1,055` entries including `13` `banks` entries).
- `npm run typecheck` — `0` TypeScript errors.
- `npm run lint` — `0` ESLint errors.
- `npm test` — all `18` test suites passed (`site`, `share`, `quiz`, `govhowto`, `images`, `hero`, `headline`, `monitor`, `chart`, `chartui`, `navfeedback`, `push`, `telegram`, `nbs`, `watclock`, `search`, `bubblebar`, `banks`).
- `npm run build` — `1,064` static pages exported cleanly.
- `npm run audit:static` — `1,059` HTML routes, `1,023` sitemap URLs, `0` broken internal links, `0` duplicate titles, `0` duplicate descriptions, `0` invalid JSON-LD blocks, `1,056 / 1,056` valid WhatsApp + X share pairs.
- Smoke checks verified `/codes/banks` table + filters, 4 per-bank pages (`gtbank`, `union-bank`, `fcmb`, `ecobank`), `CopyButton` controls, source badges & `nofollow` links, deep search queries (`Guaranty Trust Bank Limited`, `221`, `*909#`), and `Codes` category bubble (`13` bank links).
