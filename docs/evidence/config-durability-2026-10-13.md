# Config durability fix — evidence log

Date: 13 October 2026 (UTC). Branch: `arena/b57c3fd1-naijacheck` (branched from `main` at `7268e35`). No merge, no DNS/domain change, no production deploy, no Worker route change.

## Problem

Two **public** (non-secret) values lived only in the Cloudflare dashboard and disappeared after a build/deploy:

| Value | Where it lived | Effect when it disappeared |
|---|---|---|
| `NEXT_PUBLIC_TELEGRAM_CHANNEL_URL` | Cloudflare build variable | the "Get alerts on Telegram" footer link and the `/status` "Alerts on Telegram" section silently vanished |
| `ALERT_SITE_URL` | Cloudflare plain Worker variable | alert links (Telegram message link and Web Push tap-through) fell back to `https://naijacheck.ng/status` instead of the host readers can open today |

Same class of failure as the VAPID public vars before they were committed to `wrangler.jsonc` (PR #5).

## Fix

| Change | File |
|---|---|
| Public channel URL committed as `TELEGRAM_CHANNEL_URL_DEFAULT = "https://t.me/naijacheck_alerts"`; `NEXT_PUBLIC_TELEGRAM_CHANNEL_URL` kept only as a validated override | `config/site.ts` |
| `ALERT_SITE_URL = https://naijacheck.nnamdimichael020.workers.dev/status` added to the committed public `vars` | `wrangler.jsonc` |
| Regression test: the link must resolve with **no** environment variable set, and a bad override can never blank or hijack it | `config/site.test.ts` (`npm run site:test`, wired into `npm test`) |
| Build-time guard: `/` and `/status` must render the committed channel URL, or `npm run audit:static` fails | `scripts/audit-static.mjs` |
| Runbooks/README updated so nobody re-enters these values by hand | `README.md`, `docs/runbooks/*` |

Nothing secret was added. `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `PUSH_ADMIN_TOKEN` and `VAPID_PRIVATE_JWK` remain dashboard-only; the only values in Git are the public channel URL, the public VAPID key, the VAPID contact subject and the public alert link host.

## Commands run and results

| Command | Result |
|---|---|
| `npm ci` | installed from the committed lockfile |
| `npm run typecheck` (`tsc --noEmit`) | pass, 0 errors |
| `npm run lint` (`eslint .`) | pass, 0 findings |
| `npm test` | pass — `site:test`, `monitor:test`, `chart:test`, `push:test`, `telegram:test`, `nbs:test` |
| `npm run site:test` (no env vars) | pass — link resolves to the committed channel |
| `NEXT_PUBLIC_TELEGRAM_CHANNEL_URL=""` / `=https://evil.example/x` / `=https://t.me/naijacheck_alerts` | pass in all three cases (empty and non-Telegram overrides fall back to the committed URL) |
| `npm run build` (`next build`, static export) | pass, 172 HTML routes exported |
| `npm run audit:static` | pass — 0 broken internal links, 0 wrong canonicals, 0 invalid JSON-LD, `pagesMissingCommittedTelegramLink: []` |
| negative control: channel URL textually removed from a built page | `audit:static` exits **1** and reports `pagesMissingCommittedTelegramLink: ["/status"]`; restored build exits 0 |
| `npx wrangler deploy --dry-run` | pass; bindings show `PUSH_SUBSCRIPTIONS` KV + `ASSETS` + `VAPID_PUBLIC_KEY` + `VAPID_SUBJECT` + **`ALERT_SITE_URL`** |

## Durability check on the built output (no dashboard variables set)

- `env | grep -i "TELEGRAM|ALERT_SITE"` → empty; the build ran with no Telegram/alert variables present.
- `grep -rl "https://t.me/naijacheck_alerts" out --include="*.html" | wc -l` → **171** of 172 exported HTML routes. The one exception is `out/offline.html`, a standalone no-footer offline fallback (pre-existing, unchanged by this fix).
- Footer link markup in `out/index.html`: `<a ... href="https://t.me/naijacheck_alerts" target="_blank" rel="noopener noreferrer">` with the label "Get alerts on Telegram".
- `out/status.html` contains the "Alerts on Telegram" section.
- The committed URL is present in the client JS chunks (`out/_next/static/chunks/app/**`), so the link is not dependent on any runtime value.

## What this does not claim

- No live Telegram delivery, no production deploy and no DNS/domain change: alert links simply stop depending on dashboard-only values.
- A successful build is not proof of display on a device; the phone checks in `web-push-owner-setup.md` and `browser-qa-checklist.md` remain owner-only.
- `DEFAULT_ALERT_SITE_URL` stays `https://naijacheck.ng/status` as the documented fallback when `ALERT_SITE_URL` is missing or invalid; the committed `wrangler.jsonc` value now ships with every deploy.
