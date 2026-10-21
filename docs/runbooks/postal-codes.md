# Postal codes — NIPOST 6-digit codes (Phase C)

Owner runbook for `data/postal-codes.json` and `/codes/postal` archive.

## Data store: `data/postal-codes.json`

SSOT — one entry per state + FCT:

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
    { "name": "Ikeja — Head office / GPO", "code": "100001", "slug": "ikeja", "label": "Head office/GPO", "sources": [{"label":"...","url":"https://..."}], "notes": "Alternative code note if needed" }
  ],
  "sources": [{"label":"eBills Africa — state table","url":"https://..."}],
  "lastVerified": "2026-10-21",
  "verification": "manual",
  "notes": "Head office codes end 001..."
}
```

Rules:
- `slug` URL-safe lower-kebab, unique, never reused.
- Every `code` is 6-digit `/^\d{6}$/` and cites at least one public source URL (`https://`) that shows same code on capture day.
- Prefer NIPOST-related public lists / reputable compilations (nipost.gov.ng corporate page, eBills, NigeriaZipCode, BusinessConnect, Apartments.ng for Lagos detail, GeeClassic/TravoNG for FCT districts, Wikipedia six-digit system explainer for NDAPS note). Record all in `sources`.
- Conflicting listings: document conflict in `notes` + pick best-sourced value with note, or omit code and say “not verified yet” (never invent).
- `intro` must be unique per state — no copy-paste swap.
- Leaf pages (`/codes/postal/[state]/[area]`) only for high-intent districts where we have distinct verified rows + distinct body text. Current allowlist (12): Lagos ikeja/victoria-island/lekki/surulere/ikorodu, FCT garki/wuse/maitama/asokoro/gwarinpa, Rivers port-harcourt, Kano kano-municipal. Do not add village-level leaves with thin text.

Current coverage (2026-10-21): 37 states/FCT hubs, 77 places (Lagos 13 + FCT 13 + Rivers 5 + Kano 4 + others 1–3). Every code below cites its source; see evidence file.

## Adding / fixing a code

1. Branch from `main`, edit `data/postal-codes.json`:
   - Add/fix `places[]` entry with 6-digit code + source URL you opened that day + set `lastVerified` to today.
   - If source withdrawn, move code to `notes` as unverified/omitted — never guess.
   - Keep `intro` unique (write one new sentence about that state's routing).

2. Commit: `postal-codes: update <slug> <code> per <host> YYYY-MM-DD`

3. Local verify before PR:
```
npm run typecheck
npm run lint
npm test
npm run build
npm run audit:static
```
Audit fails if a postal page drops from sitemap, titles/descriptions duplicate, share regresses, or internal link 404s.

4. Open PR (do not merge), attach evidence listing changed state + code + source.

## Removal / unverified

If no public source lists a hamlet, leave it out and add honest note: “Not in our sources yet — ask NIPOST counter (Post Office Finder) or use head-office code + full address.” Mark alternative value with note if compilations conflict.

## SEO rules

- One hub `/codes/postal`, one page per state (37), curated leaves only (12). No mass junk URLs.
- Every indexable page has unique title/meta, honest intro, primary code in large type + Copy, structured table, lastVerified, Sources (nofollow), FAQ true-only, Related, WebPage+FAQ JSON-LD, ShareControls.
- Sitemap lastModified from `postal-codes.json` `updatedAt` / per-state `lastVerified` — never `new Date()`.
- Anti-spam: no identical body swapped city name only, no empty shells in sitemap, no claim of NIPOST endorsement, no street-level complete coverage claim, no AdSense.

## Homepage & sitemap

- Homepage entry: Codes section beside Bank Codes (same card/pill pattern, 37 states badge).
- Sitemap: hub + 37 states + 12 leaves. `lastModified` from file/per-state.

## Evidence & release

- Evidence: `docs/evidence/postal-codes-phase-c-2026-10-21.md` — counts, sources approach, zero invented confirmation.
- Release: PR unmerged, DNS unchanged, ₦0/$0.
