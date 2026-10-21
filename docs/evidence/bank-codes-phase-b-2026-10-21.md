# Phase B evidence — bank sort codes + USSD/short codes (2026-10-21)

## Branch & release
- Branch: `arena/369742e0-naijacheck` (from `8d4ecbb` main, includes Phase A PR #23 merged 2026-10-21T22:12:05Z).
- Do NOT merge; no DNS/domain change; no paid API; PR stays unmerged.
- Verify commands all passed at 2026-10-21 UTC (see tail).

## IA delivered — one hub + one page per bank, no junk URLs

New indexable routes (14 URLs, 1:1 with sitemap):
- `/codes` — category hub: sort vs USSD explainer, links to banks, honest “planned” line for postal/LGA/exam (no empty routes).
- `/codes/banks` — searchable index of all banks (client filter by name/code/USSD, A–Z).
- `/codes/banks/[slug]` ×12 per-bank pages:
  - `access-bank` — Access Bank Plc (044, *901#)
  - `gtbank` — GTBank Ltd (058, *737#)
  - `zenith-bank` — Zenith Bank Plc (057, *966#)
  - `first-bank` — First Bank of Nigeria Ltd (011, *894#)
  - `uba` — United Bank for Africa 033 *919#
  - `fidelity-bank` — Fidelity Bank 070 *770#
  - `ecobank` — Ecobank Nigeria 050 *326#
  - `union-bank` — Union Bank 032 *826#
  - `sterling-bank` — Sterling Bank 232 *822#
  - `wema-bank` — Wema Bank (ALAT) 035 *945#
  - `stanbic-ibtc` — Stanbic IBTC Bank 221 *909#
  - `fcmb` — First City Monument Bank 214 *329#

Existing Phase A hubs untouched and re-verified:
- `/rates`, `/rates/history`, `/prices/fuel`, `/charts`, `/charts/[slug]` ×5, `/status`, push/telegram/share/quizzes/nav-feedback/Phase A SEO still pass (audit row-count proves 0 regressions).

## Data: `data/banks.json` SSOT

Schema: `slug`, `name`, `fullName?`, `sortCodes[]` ({code,label,type}), `ussd[]` ({code,label,purpose}), `sources[]` ({label,url}), `lastVerified` ISO `YYYY-MM-DD`, `verification:"manual"`, `notes`, plus top-level `updatedAt` + `notes`.

Rows: 12 (quality over “all”). Head-office 9-digit codes are shown only where a secondary compilation provided an example — marked “head-office / example”, first 3 digits always match the 3-digit NIP code so the reader can spot the relationship. No street/branch mass pages.

Files:
- `data/banks.json` — 741 lines, single source of truth (this file only).
- `lib/banks.ts` — typed loader + slug validation, sorts A–Z, exposes `getAllBanks()`, `getBankBySlug()`, `BANKS_FILE_UPDATED_AT`.
- `components/codes/copy-button.tsx` — per-code copy-to-clipboard (fallback textarea, aria-label).
- `components/codes/banks-search.tsx` — client filter (name, fullName, slug, sort code, USSD).

## Every code is sourced — zero invented codes

Rule enforced everywhere: every sort code and every USSD string cites a documented source that was open on 2026-10-21 and is linked both in `data/banks.json` → `sources[]` and on the bank page → “Sources”.

Source tiers used:
- **Official bank pages (primary)** where available: Access Bank `/help/frequently-asked-questions/ussd-banking` + `/ways-to-bank/901`; GTBank `/personal-banking/services/e-banking/bank-737`; Zenith Bank `/966/` + news release `*966*911#`; FirstBank `/personal/ways-to-bank/ussd/`. These list `*901#`, `*737#`, `*966#`, `*894#` verbatim plus key shortcuts.
- **Public NIP/CBN compilations (secondary, industry-wide)**: `mansaapi.com/banks/nigeria`, `youverify.co/.../list-of-nigerian-bank-codes-and-sort-codes`, `currentaffairs.com.ng/bank-codes/` (all list 3-digit CBN codes + USSD strings and are widely cited; treated as secondary compilations, not official CBN endorsement — page notes say “Do not claim CBN endorsement”).
- No scraping, no guessing, no interpolation. If a shortcut was not in a cited source it was omitted. Marking rule: unknown → omit/`unverified`, never guess. Audit of `data/banks.json` confirms every code appears verbatim on at least one cited URL the day of capture.

Approach confirmed by web fetches 2026-10-21:
- Zenith `https://www.zenithbank.com/966/` — official *966# list.
- Access `https://www.accessbankplc.com/help/frequently-asked-questions/ussd-banking` — official *901# list.
- GTBank `https://www.gtbank.com/personal-banking/services/e-banking/bank-737` — official *737# list.
- FirstBank `https://www.firstbanknigeria.com/personal/ways-to-bank/ussd/` — official *894# list.
- Mansa/YouVerify tables confirm NIP codes: 044 Access, 058 GTB, 057 Zenith, 011 FirstBank, 033 UBA, 070 Fidelity, 050 Ecobank, 032 Union, 232 Sterling, 035 Wema, 221 Stanbic, 214 FCMB and USSD mappings.

If a bank changes a code tomorrow, owner edits `data/banks.json` per `docs/runbooks/bank-codes.md` (update code + source + `lastVerified` ISO day) and PRs.

## Homepage

`app/page.tsx` new section `#codes-h` (mobile-friendly, same card+rounded pill pattern as FX hub):
- Title “Bank codes — sort codes & USSD codes”, one-line blurb, badge “12 banks · verified 2026-10-21”.
- Two buttons: `/codes` (outline) + `/codes/banks` (primary CTA).
- Popular pills: Access/GTB/Zenith/FirstBank/UBA/Fidelity links + “how we verify (/status)”.

No layout regress: desktop grid identical, mobile `flex-wrap gap-2 min-h-11` on every pill/button (44px touch).

## Per-bank page UX (meets spec)

- Name + fullName, sort code(s) with label/type, copy button per code.
- USSD table with label + purpose + copy button (only sourced rows).
- Notes, lastVerified ISO day, Sources (external `target=_blank rel=noopener noreferrer nofollow`), Related links (6 other banks + index/hub).
- Unique `title` + `metaDescription` per slug targeting “<Bank> sort code / USSD code” intent — audit `duplicateTitles: []`, `duplicateDescriptions: []`.
- FAQ: 4 true-only questions (what is sort code / USSD / why differ / can I trust) derived only from stored data + lastVerified date — no speculation.
- JSON-LD: `BreadcrumbList` + `WebPage` (dateModified = lastVerified) + `FAQPage` — only accurate types, no fake FinancialProduct/claim.
- Share: `ShareControls` (WhatsApp + X) on hub, index and every bank page — audit `share.pagesMissingWhatsApp: []`, `share.pagesMissingX: []`, `malformed*: []`, `anchorMissingTargetRelOrLabel: []`, `anchorBelow44px: []`.
- Copy: client `CopyButton` with “Copied ✓” flash + fallback.
- `generateStaticParams` from data/banks.json → 12 SSG HTML exports, `dynamicParams=false` so unknown slug → 404.

## Sitemap & SEO

`app/sitemap.ts` extended: `BANKS_FILE_UPDATED_AT` + `getAllBanks()` → adds:
- `/codes` (lastModified = banks.json `updatedAt` 2026-10-21),
- `/codes/banks` (same),
- `/codes/banks/${slug}` ×12 (lastModified = per-bank `lastVerified`).

Verified in `out/sitemap.xml`:
```
https://naijacheck.ng/codes (2026-10-21)
https://naijacheck.ng/codes/banks (2026-10-21)
https://naijacheck.ng/codes/banks/<slug> ×12 (2026-10-21 each)
```
Counts: sitemap 147 → 161 (+14), routes 181 → 196 (+15 inc. new HTML wrappers), audit `sitemapMissing: []`, `indexedNotInSitemap: []`, `noindexInSitemap: []`.

No postal/LGA/exam ZIP/archive started in this PR (hub notes say “planned, not yet live” with no empty routes). No AdSense, no CBN endorsement claim anywhere.

## Verify evidence — exit 0

```
npm run typecheck  # (npx tsc --noEmit) — 0 errors (2 pre-existing warnings: fuelHubLastmod + ChartPointsTable)
npm run lint       # eslint — 0 errors, 2 warnings (same pre-existing, new codes pages clean)
npm test           # 27 chart-interaction + 30 nav-feedback + push/telegram/NBS — all ok
npm run build      # Next 15.5.27 compiled, 201 static pages, export ok (routes listed below)
npm run audit:static # audit passed — 196 HTML routes, 161 sitemap URLs, 0 missing/duplicate/broken share/nav/hero-motion/robots violations
```

Representative build route list:
```
/, /about, /status, /privacy, /tools/quiz, /rates, /rates/history, /charts, /charts/[slug] ×5,
/codes, /codes/banks, /codes/banks/access-bank .. /codes/banks/fcmb (12), plus 166 article pages
```

Smoke (from `build` + `audit:static`):
- `/codes` → 200, h1 “Nigeria bank codes — sort codes & USSD codes”, share present.
- `/codes/banks` → 200, shows “Showing 12 of 12 banks. Sorted A–Z.”, searchable input.
- `/codes/banks/gtbank` → 200, CBN code 058, *737# rows with Copy, Sources links, lastVerified 2026-10-21.
- `/codes/banks/zenith-bank` → 200, 057 *966#.
- `/codes/banks/access-bank` → 200, 044 *901#.
- `/rates` → 200, FX archive table intact (Phase A untouched).
- `/api/push/config` → route exists (no secret; public config — same as before).

## Deliverable checklist

- [x] Every new route listed above is public, indexable, in sitemap, with unique title/description.
- [x] Every code has a documented source link in data + on page; zero invented codes.
- [x] No mass junk URLs (one hub + one page per bank only).
- [x] No postal/LGA/exam archive shipped in this PR.
- [x] No Phase A SEO / rates / history / charts / push / telegram / share / quizzes / nav-feedback regression (audit proves).
- [x] Homepage entry to `/codes` / `/codes/banks` mobile-friendly & consistent.
- [x] Copy-to-clipboard on every bank page.
- [x] JSON-LD only accurate.
- [x] `audit:static` exit 0, unique titles/descriptions, 0 broken links.
- [x] Runbook `docs/runbooks/bank-codes.md` documents update process.
- [x] PR stays unmerged, DNS unchanged, ₦0/$0.
