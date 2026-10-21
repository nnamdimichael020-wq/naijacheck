# Phase C evidence — postal / ZIP codes (2026-10-21)

## Branch & release
- Branch: `arena/dc9047d2-naijacheck` (from `d2a99fb` main which includes Phase A #23 + Phase B #24).
- Do NOT merge; no DNS/domain change; no paid API; PR stays unmerged.
- Verify commands passed at 2026-10-21 UTC (below).

## IA delivered — one hub + 37 states + curated leaves, no junk URLs

New indexable routes (50 URLs, 1:1 with sitemap):
- `/codes` — updated category hub: banks + postal sections + what-else lives (no empty routes).
- `/codes/postal` — national hub: what Nigerian ZIP is for (foreign forms/NDAPS note 1 Oct 2026), how 6-digit works (1st digit region, first-three dispatch, last-three delivery, 001 = GPO), instant client search/filter, links to all 37 states.
- `/codes/postal/[state]` ×37 — one per state + FCT:
  abia, adamawa, akwa-ibom, anambra, bauchi, bayelsa, benue, borno, cross-river, delta, ebonyi, edo, ekiti, enugu, fct-abuja, gombe, imo, jigawa, kaduna, kano, katsina, kebbi, kogi, kwara, lagos, nasarawa, niger, ogun, ondo, osun, oyo, plateau, rivers, sokoto, taraba, yobe, zamfara
- `/codes/postal/[state]/[area]` ×12 curated high-intent leaves only:
  - lagos/ikeja (100271), lagos/victoria-island (101241), lagos/lekki (105102), lagos/surulere (101283), lagos/ikorodu (104101),
  - fct-abuja/garki (900241), fct-abuja/wuse (900281), fct-abuja/maitama (900271), fct-abuja/asokoro (900231), fct-abuja/gwarinpa (900108),
  - rivers/port-harcourt (500272), kano/kano-municipal (700101)

Sitemap before → after: 161 → 211 (+50). Build pages: 201 → 251 (+50). Audit sitemapMissing 0, indexedNotInSitemap 0.

Homepage: Codes section now “Codes — bank sort/USSD & postal/ZIP codes” with badges “12 banks · 37 states · verified 2026-10-21”, CTAs Search bank codes + Search postal codes, popular pills Lagos/FCT/Rivers/Kano.

## Data: `data/postal-codes.json` SSOT

- **37 states/FCT** each with unique `intro` (not swapped template) — satisfies anti-spam “no identical body swapped name”.
- **77 places** total:
  - Lagos 13 (Ikeja 100001 + GRA 100271 + Surulere 101283 + VI 101241 + Ikoyi 101233 + Lekki 105102 + Yaba 101212 + Apapa 102272 + Ikorodu 104101 + Badagry 103101 + Epe 106101 + Ibeju-Lekki 105101 + Alimosho 100275)
  - FCT 13 (Garki HQ 900001 + CBD 900211 + Asokoro 900231 + Maitama 900271 + Wuse 900281 + Garki Area1 900241 + Gwarinpa 900108 + Lugbe 900107 + Kubwa 901101 + Nyanya/Karu 900110 + Bwari 901001 + Gwagwalada 902001 + Kuje 903101)
  - Rivers 5, Kano 4 (Kano Municipal 700101 + Gwale 700103 + Nassarawa 700104 + head office 700001), Oyo 3, Kaduna 3, Anambra 3, Delta 2, Enugu 2, Plateau 2, plus 27 states with 1 head-office code (capital GPO).
- Schema: `slug,name,capital,zoneCode,headOfficeCode,range,intro,description,places[{name,code,slug,label,sources[],notes?}],sources[],lastVerified,verification:manual,notes` + top `updatedAt` + `notes` (explains 6-digit vs NDAPS 11-char launch 1 Oct 2026).

Files:
- `data/postal-codes.json` — 2379 lines, single source of truth.
- `lib/postal.ts` — typed loader, slug validation, unique intros, `getAllPostalStates()`, `getPostalState()`, `getPostalPlace()`, curated `getAllPostalAreaParams()` (12 leaves only).
- `components/codes/postal-search.tsx` — client filter by state/capital/place/code.
- Per-page `CopyButton` reused, `PostalSearch` for hub.

## Every code is sourced — zero invented codes

Rule everywhere: every 6-digit line in table appears verbatim on a public source open 2026-10-21, linked in data + on-page Sources (rel=nofollow).

Source tiers:
- **Public NIPOST-style compilations (secondary, industry-wide)** — eBills Africa state capital table (37 caps), BusinessConnect state list, NigeriaZipCode full list, Wikipedia Postal codes in Nigeria (six-digit system + NDAPS 1 Oct 2026), plus NIPOST corporate HQ page at nipost.gov.ng/contact (900001) for corporate address proof. Treat as secondary, not official NIPOST endorsement — page says “Do not claim NIPOST official”.
- **District-level detail (Lagos/FCT)** — Apartments.ng Lagos area guide (100271,101241,105102), NigeriaHousingMarket Lagos LGA list (103101,106101,100275), BusinessConnect Lagos postal codes (full Lagos table), Service.Travo/ GeeClassic/ NHM Abuja district lists (900211,900231,900271,900281,900108 etc.), BusinessConnect Rivers state list, NigeriaZipCode Kano/Lagos/Rivers ranges.

Where compilations conflict we documented choice:
- Bayelsa 561001 vs 560001 — use 561001 with note.
- Ebonyi 840001 vs Sokoto 840001 same prefix 84 in one compilation — keep commonly cited 840001 for both with note (regional split).
- Kogi 260001 vs 270001 — use 260001 note alternative.
- Nasarawa 962001 vs 950001 — use 962001 note.
- FCT districts where one source merges zones — pick most consistently cited and note unverified variant (e.g. Wuse Zones 2–4).

If a hamlet not in sources, omit route or show honest “not verified yet” — never fake 6-digit.

Approach confirmed by web fetches 2026-10-21: see search hits for 100001 Ikeja, 900001 Garki, 500001 PH, 700001 Kano, 101241 VI, 105102 Lekki, 900211 CBD, 900271 Maitama etc.

If a code changes, owner edits `data/postal-codes.json` per `docs/runbooks/postal-codes.md` (code + source + lastVerified ISO day) and PRs.

## Each postal page has (spec)

- Unique title/meta targeting “<State> postal code / ZIP” + “Lagos ZIP 100001” intent — audit duplicateTitles 0, duplicateDescriptions 0.
- Short honest intro per state (unique, not swapped).
- Primary code in large mono type + CopyButton.
- Structured table: place name | postal code | Copy | type/notes/label.
- lastVerified (2026-10-21) + Sources (external nofollow) + notes on 001/GPO.
- FAQ true-only (e.g. can I use one code for all of Lagos? — honest “No, districts differ”).
- Related: other states, /codes/postal, /codes/banks, soft /rates, /codes hub.
- JSON-LD WebPage+FAQPage only accurate, no claim of being NIPOST official.
- ShareControls WhatsApp+X on hub + every state + every leaf — audit share pagesMissing 0.

## Anti-spam enforced

- No identical body swapped name only — each state has bespoke intro describing its routing quirk.
- No empty-shell routes in sitemap — every sitemap URL has matching HTML (211 sitemap = 211 generated indexed routes, audit proves).
- Sitemap lastmod from `postal-codes.json` `updatedAt` / per-state `lastVerified` — not build clock.
- No paid data purchase, no claim complete every street, no AdSense, no exam content.

## Verify — exit 0

```
npm run typecheck   # npx tsc --noEmit — 0 errors (2 pre-existing warnings: ChartPointsTable + fuelHubLastmod)
npm run lint        # 0 errors, 2 warnings (same pre-existing)
npm test            # 27 chart-interaction + 30 nav-feedback + push/telegram/NBS — all ok
npm run build       # Next 15.5.27 compiled, 251 static pages (201→251)
npm run audit:static # audit passed — 246 HTML routes, 211 sitemap URLs, 0 missing/duplicate/brokenImage/wrongCanonical/invalidJsonLd, share 243/243, heroMotion/navFeedback/robots/telegram ok, wrongCanonical 0, missing 0, duplicate 0, brokenInternalLinks 0 (was 12 before fix)
```

Smoke:
- /codes — 200, h1 “Nigerian codes — bank sort/USSD & postal/ZIP codes”, both banks + postal cards, share ok.
- /codes/postal — 200, h1 “Nigeria postal codes (ZIP) — 6-digit …”, search input, 37 states grid.
- /codes/postal/lagos — 200, head office 100001, 13 places table with copy, sources, FAQ, related.
- /codes/postal/fct-abuja — 200, 900001 + 13 districts, Gwarinpa 900108 etc.
- /codes/postal/rivers — 200, 500001 + 4 LGAs.
- /codes/postal/lagos/ikeja — 200 (leaf), unique body “Ikeja is Lagos capital and airport district…”, code 100271 + neighbours, FAQ “Is Ikeja 100001 or 100271?”, copy.
- /codes/postal/fct-abuja/maitama — 200 leaf, 900271.
- /codes/banks — 200 still ok (no regress).
- /rates — 200 (FX history untouched).
- /api/push/config — route exists (public config).

## Deliverable checklist

- [x] 37 states + 77 places with 6-digit codes, every one sourced, zero fabricated 6-digit codes.
- [x] Honest intros per state, leaf curated only where justified (12 high-intent leaves with distinct extra copy).
- [x] No mass junk URLs (one hub + one per state + curated leaves), no postal street-level complete claim.
- [x] No LGA demographics or exam PDFs in this PR.
- [x] No Phase A/B regression (rates/history, banks, charts, push, telegram, share, quizzes, nav-feedback still pass).
- [x] Homepage entry beside Bank Codes, mobile-friendly same pattern.
- [x] Copy buttons, JSON-LD accurate, share on all new pages, unique titles/descriptions, sitemap coverage per lastVerified.
- [x] Runbook `docs/runbooks/postal-codes.md` + evidence (this file).
- [x] PR unmerged, DNS unchanged, ₦0/$0.
