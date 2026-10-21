# Phase D — 774 LGAs reference archive (/geo)

Date: 2026-10-21 (Africa/Lagos) — branch `arena/3c88f25e-naijacheck` (from `3572a78`).
Owner: NaijaCheck.

## Goal
Factual, mobile-first 774-LGA reference — citable, near-static, interlinked with postal where data exists, zero invented admin facts.

## Decision: URL scheme `/geo` (not `/codes/lga`)

- Chosen `/geo` because `/codes` already hosts two unrelated families: `/codes/banks` (sort/USSD, 3-digit + *USSD#) and `/codes/postal` (6-digit NIPOST). Adding a third tree there would dilute the hub and risk crawler confusion.
- LGAs are *geography* — an `AdministrativeArea` hierarchy (country → state → LGA) — distinct from *codes*. Keeping them under `/geo` makes the information architecture honest and prevents duplicate trees.
- One canonical tree only: `/geo` (national hub) → `/geo/[state]` (state list) → `/geo/[state]/[lga-slug]` (per-LGA). No `/codes/lga`, no `/geo/lga` duplicate, no `/lga` alias. Documented here and in sitemap notes.
- State slug namespace is shared with `/codes/postal/[state]` so cross-links stay trivial: `fct-abuja`, `akwa-ibom`, `cross-river`, etc. (37 entries: 36 states + FCT).

## Data source of truth
`data/lgas.json` — the single SSOT for this archive.

Structure:
```json
{
  "updatedAt": "2026-10-21",
  "datasetNotes": "774 LGAs (768 LGAs + 6 FCT Area Councils) — alphabetical within state...",
  "sources": [ {label,url}, ... ],
  "states": [
    { "slug":"abia", "name":"Abia", "count":17, "lastVerified":"2026-10-21", "verification":"manual", "notes":"...", "lgas":[
      { "slug":"aba-north", "name":"Aba North", "sources":[ {label,url}, ... ] }
    ]}
  ]
}
```

- Source for LGA *names*: Wikipedia gazette list + NBS/NPC references, cross-checked against open dataset `xosasx/nigerian-local-government-areas` (774 records with Wikidata IDs, verified `len 774` via `gh api` 2026-10-21). Recorded as `lga.sources[]` and on each page.
- No headquarters stored in this build — field omitted entirely (never shown as `—` guess). Population, coordinates omitted (no dated NBS/NPC figure in build). NDAPS note is editorial only.
- Lagos LCDAs (37) acknowledged in prose but *not* counted as LGAs — 20 LGAs only (774 total: 768 + 6 FCT Area Councils).
- Cross-links to postal are best-effort: `data/postal-codes.json` (77 places) linked *only* via `lib/postal-geo.ts` leaf allowlist (12 high-intent leaves: `lagos/{ikeja,victoria-island,lekki,surulere,ikorodu}`, `fct-abuja/{garki,wuse,maitama,asokoro,gwarinpa}`, `rivers/port-harcourt`, `kano/kano-municipal`). States whose only place is a head-office not in the leaf set render a dashed pill `(via hub)` and link only to the state postal hub.

## Counts & coverage (2026-10-21 build)

- States/FCT: **37** — Abia through Zamfara + `fct-abuja`.
- LGAs: **774** — verified `data/lgas.json` + audit `getAllLgaParams().length === 774`.
- Per-state counts match NBS/gazette:
  Abia 17, Adamawa 21, Akwa Ibom 31, Anambra 21, Bauchi 20, Bayelsa 8, Benue 23, Borno 27, Cross River 18, Delta 25, Ebonyi 13, Edo 18, Ekiti 16, Enugu 17, FCT 6, Gombe 11, Imo 27, Jigawa 27, Kaduna 23, Kano 44, Katsina 34, Kebbi 21, Kogi 21, Kwara 16, Lagos 20, Nasarawa 13, Niger 25, Ogun 20, Ondo 18, Osun 30, Oyo 33, Plateau 17, Rivers 23, Sokoto 23, Taraba 16, Yobe 17, Zamfara 14 — sums to 774.
- Generated HTML routes: 1058 (post-build `out/`), sitemap URLs: **1023** (`fixed + charts(1+?) + bankSitemap(1+1+12) + postalSitemap(1+37+12) + geoSitemap(1+37+774) + generated articles(≈ 134)`). 35-route delta is the intentional `hustle-combo` noindex exclusion — never a missing page.
- Postal cross-link rate: every LGA/state page shows the state's postal places; where a place has no leaf page, no internal broken link is emitted (dashed span). Audit confirms **0 brokenInternalLinks** after `lib/postal-geo.ts` fix.

## Pages

| Route | Purpose |
|---|---|
| `/geo` | National hub — “What is an LGA?” (774 description), search (client-side filter over 774 names + state), per-state cards with 3-name preview, sources, share. |
| `/geo/[state]` | Per-state list — filterable table (name → HQ or `—`, link), postal pill row, notes about LCDAs/FCT, lastVerified. |
| `/geo/[state]/[lga]` | Per-LGA — `H1: <name> LGA (State)`, unique `title: "<name> LGA (State) — HQ, postal links | NaijaCheck"` and `description` including HQ status, intro via `lgaIntroVariant()` (state context + HQ note + postal count + Lagos LCDA caveat — not a swapped template), “At a glance” (state, count, official name, HQ), copy buttons (real names only), postal chips (never invented codes), sibling chips + prev/next, FAQ (state + count + postal always, HQ only when true), sources + lastVerified, share, JSON-LD (WebPage + FAQPage + BreadcrumbList). |

All pages are static (`generateStaticParams` from the SSOT, `dynamicParams=false`); sitemap `lastModified` comes from `data/*` dates, never build clock.

## How to verify / smoke
```sh
npm run typecheck    # tsc --noEmit must be 0
npm run lint         # eslint 0 errors (2 pre-existing warnings in rates/sitemap ok)
npm run test         # all suites pass
npm run build        # 1058 HTML, includes 771 geo leaf previews in log
npm run audit:static # 0 brokenInternalLinks, 0 duplicateTitles/Descriptions, 0 invalidJsonLd, 1055/1055 share
ls out/geo.html out/geo/lagos/ikeja.html out/geo/kano/kano-municipal.html out/geo/fct-abuja/bwari.html
```
Cross-link smoke: Ikeja (Lagos) → posts 5 Lagos leaves (Ikeja 100001, VI 101241, Surulere 101241, etc.); Bungudu (Zamfara) renders a dashed Gusau pill + state hub link — no broken link.

## Reproducing the dataset

```sh
gh api repos/xosasx/nigerian-local-government-areas/contents/lgas.json --jq .content | base64 -d > /tmp/lgas_raw.json
python3 /tmp/build_lgas.py  # uses /tmp/lgas_raw.json → writes data/lgas.json, prints counts vs expected
```

Raw snapshot saved as `/tmp/lgas_raw.json` on build machine (not committed) — 774 records, shape `{id, name, state_name, state_code, lat, long, wikiDataId}`. Transform script slugifies LGA names, sorts alphabetically within state, stamps `updatedAt/lastVerified = 2026-10-21`, attaches citable sources, and drops `headquarters` where not verified.

## What we intentionally did NOT do
- No headquarters invented — field omitted with explicit “HQ not verified — omitted” badge and meta note.
- No population/coordinates/fake postal codes — FAQ explains why NIPOST 6-digit codes are per-delivery-area, not per-LGA.
- No exam PDFs, no `/codes/lga` alias, no push/Telegram/chart/nav/audit regressions, no merge/DNS.

## Follow-ups
- Add verified headquarters from state government gazettes (one state at a time, each with `headquarters` + source URL).
- When NDAPS 5-digit building codes become pervasive, add a complementary postal layer (new data file; old 6-digit codes remain, never silently replaced — same “conflict note” discipline as `postal-codes.json`).
