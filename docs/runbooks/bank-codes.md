# Bank codes — sort codes & USSD codes (Phase B)

Owner-runbook for `data/banks.json` and the `/codes` hub. Every bank page is one honest, manually verified reference. Keep the bar high — never invent a code.

## Data store: `data/banks.json`

Structure (SSOT) — one entry per bank:

```
{
  "slug": "gtbank",
  "name": "GTBank",
  "fullName": "Guaranty Trust Bank (GTBank) Ltd",
  "sortCodes": [{ "code": "058", "label": "NIP / CBN bank code", "type": "nip" }, { "code": "058152052", "label": "Head-office sort code", "type": "head-office" }],
  "ussd": [{ "code": "*737#", "label": "Main USSD menu (Bank 737)", "purpose": "Entry point for GTBank USSD banking" }],
  "sources": [{ "label": "GTBank — Bank 737 official page", "url": "https://www.gtbank.com/..." }],
  "lastVerified": "2026-10-21",
  "verification": "manual",
  "notes": "Dial from number linked to account. Verify in app/branch."
}
```

Rules:
- `slug` is URL-safe lower-kebab (`access-bank`), unique, never reused.
- `sortCodes` at least one NIP 3-digit code (primary). Head-office 9-digit optional — mark as example where first 3 digits match NIP.
- `ussd` at least one main code (`*901#`). Add shortcuts only when you have a source line that lists the same string. If a bank changes a shortcut, keep only the new one you can cite; omit unverifiable.
- `sources` at least one per code family; official bank page preferred for USSD, public CBN/NIBSS compilation OK for sort codes. Every `url` must be `https://` and reachable.
- `lastVerified` ISO `YYYY-MM-DD` (WAT calendar day you opened the source page). `verification` is always `"manual"`.
- `notes` says what to verify and that NaijaCheck is not a CBN endorsement.

Current 12 banks (verified 2026-10-21):
- Access Bank 044 `*901#`, GTBank 058 `*737#`, Zenith 057 `*966#`, First Bank 011 `*894#`, UBA 033 `*919#`, Fidelity 070 `*770#`, Ecobank 050 `*326#`, Union Bank 032 `*826#`, Sterling 232 `*822#`, Wema 035 `*945#`, Stanbic IBTC 221 `*909#`, FCMB 214 `*329#`. See `docs/evidence/bank-codes-phase-b-2026-10-21.md` for sources approach.

## When a bank changes a code

1. Open a branch from `main`, edit `data/banks.json`:
   - Find the bank entry, update `code` + add/replace `sources` + set `lastVerified` to today (UTC).
   - If the bank dropped a code, delete it and leave a short `notes` line explaining omission (e.g., “Old *XYZ# removed per bank page Oct 2026”).
2. Commit with message `bank-codes: update <slug> <code> per <source-host> YYYY-MM-DD`.
3. Run locally before PR:
   ```
   npm run typecheck
   npm run lint
   npm test
   npm run build
   npm run audit:static
   ```
   `audit:static` fails the build if a bank page drops out of `sitemap.xml`, if titles/descriptions duplicate, if share buttons regress, or if a source link 404s.
4. Open PR (do not merge); attach evidence file listing changed bank + source URL.

## Adding a new bank

- Add entry after verifying both sort code + main USSD against at least one citable source (bank official page wins). Do not add branches, streets, or per-LGA sort pages — one page per bank only.
- Provide unique `title`/`description` intention: title targets "`<Bank> sort code`" + "`<Bank> USSD code`" (see `app/codes/banks/[slug]/page.tsx` `generateMetadata`).
- Copy button is per-code (`components/codes/copy-button.tsx`), FAQ is true-only, JSON-LD is `WebPage` + `FAQPage` only when accurate.

## Removal / marking unverified

If a source disappears and no replacement can be cited, change that row to include `unverified` in `label` (e.g., `"*999# (unverified — source withdrawn)"`) and link to the last archive snapshot, or omit it and explain in `notes`. Never invent a replacement.

## SEO rules

- One hub (`/codes`), one browsable index (`/codes/banks`), one page per bank. No mass junk URLs (no “sort code for every street/branch”).
- Every indexable page must ship with unique `title`, `description`, `canonical`, `h1`, internal links, external source `rel=nofollow` and both WhatsApp + X share links (audit guards this).
- Do not claim CBN endorsement, do not start postal/LGA/exam archives in this PR.

## Homepage & sitemap

- Homepage entry: FX & fuel history card + new Bank Codes card (mobile-friendly, same pattern). See `app/page.tsx` `#codes-h`.
- Sitemap: hub + index + per-bank pages. `lastModified` comes from `banks.json` `updatedAt` and per-bank `lastVerified` — never `new Date()`. See `app/sitemap.ts`.

## Evidence & release

- Evidence lives in `docs/evidence/bank-codes-phase-b-2026-10-21.md`: every new route + bank slug, sources approach, verify commands, zero invented codes confirmation.
- Release follows `docs/runbooks/release-after-approval.md`: PR unmerged, DNS unchanged, ₦0/$0.
