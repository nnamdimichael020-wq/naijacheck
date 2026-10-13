# Phase D — Telegram change alerts: evidence log

Date: 13 October 2026 (UTC). Branch: `arena/77ae1403-naijacheck` (branched from `main` at `a59f34c`). No merge, no DNS/domain change, no production deploy.

## Status summary

| Item | Status |
|---|---|
| Shared genuine-change gate (`worker/alerts.ts`) used by Web Push and Telegram | complete |
| Telegram delivery + owner test endpoint (`worker/telegram.ts`, `/api/telegram/test`) | complete |
| Unit tests for both "no send without genuine change" and "no send when unconfigured" | complete |
| Site link (`footer`, `/status`) behind `SITE_CONFIG.telegramChannelUrl` | complete |
| Owner runbook `docs/runbooks/telegram-owner-setup.md` | complete |
| Real Telegram delivery to a live channel | **needs owner secrets** (bot token + chat id) |
| Post-merge channel/phone confirmation | **needs owner** (bot must be a channel admin) |
| Outbound HTTPS to `api.telegram.org` from this sandbox | **blocked** (sandbox network allowlist) |

## Commands run and results

| Command | Result |
|---|---|
| `npm ci` | installed from the committed lockfile |
| `npm run typecheck` (`tsc --noEmit`) | pass, 0 errors |
| `npm run lint` (`eslint .`) | pass, 0 findings |
| `npm test` | pass — `monitor:test`, `chart:test`, `push:test`, `telegram:test`, `nbs:test` |
| `npm run push:test` | pass — unchanged Web Push gate/API assertions |
| `npm run telegram:test` | pass — 20+ assertions listed below |
| `npm run build` (`next build`, static export) | pass, 172 HTML routes exported |
| `npm run audit:static` | 0 broken internal links, 0 wrong canonicals, 0 missing titles/descriptions/H1, 0 invalid JSON-LD |
| `npx wrangler deploy --dry-run` | pass; same KV binding `PUSH_SUBSCRIPTIONS`, same public vars (`VAPID_PUBLIC_KEY`, `VAPID_SUBJECT`), no new bindings |
| `npx wrangler dev --ip 0.0.0.0 --port 8787` local smoke | `/` 200, `/status` 200, `/api/push/config` 200 `{available:false, tele...:false}`, `POST /api/telegram/test` 401 without token, 503 `telegram_not_configured` with token and no secrets, `POST /api/push/subscribe` 503 unconfigured, unknown `/api/*` 404, missing page 404 |
| Local workerd scheduled runs (module bundle dispatched with Miniflare + local fixture snapshots) | see below |

Local `wrangler dev` cannot serve the `HTTP /cdn-cgi/handler/scheduled` test trigger in this sandbox (it returns 500 before the Worker is entered, and logs repeat `Unable to fetch the Request.cf object` because outbound access to Cloudflare is blocked). The scheduled handler was therefore exercised directly in the real workerd runtime with the dry-run bundle, a local fixture snapshot server and in-memory KV.

## Scheduled-path evidence (real workerd runtime, fixture snapshots)

Fixture: parallel USD buy `1370` at `2026-10-10T07:06:00Z`, depot petrol median `1342.5` at `2026-10-09T23:21:00Z`, Aboki and Awajis healthy.

| Phase | Environment | Observed |
|---|---|---|
| Unconfigured | no Telegram secrets, KV bound | scheduled status `200`, log `telegram not configured (missing_bot_token); skipping telegram delivery` + `web push not configured...`, **no KV write**, **no snapshot fetch**, no crash |
| Baseline | Telegram secrets present (fake token format), KV bound | status `200`, state stored as `{parallelUsd:{1370,…}, depotPetrol:{1342.5,…}}`, **0 Telegram requests** |
| Genuine change | same state, new reading `1390` at a newer source time (+₦20) | status `200`, exactly **1 Telegram attempt**, `lastEventSentAt` written (cooldown armed), pending slot cleared |
| Second change inside the window | new reading `1410` at a newer source time, 6 hours not elapsed | status `200`, **0 Telegram attempts**, burst stored in `push:pending-event` with `notBefore` exactly +6 h |

These four phases were re-run against the final bundle after the pagination guard was added, with identical results. The guard stores `telegramSent` on the pending burst so that a burst spanning more than one page of push subscribers (delivery batch = 20) can never post the same Telegram message twice; `npm run telegram:test` covers it with 21 stored subscriptions and asserts one Telegram message with all 21 push deliveries.

The single Telegram attempt in the third phase logged `telegram send failed (network error); no retry` because outbound HTTPS to `api.telegram.org` is not permitted from this sandbox. The request itself is asserted in `worker/telegram.test.ts` against a stub: correct Bot API URL, `chat_id`, `parse_mode: "HTML"`, HTML-escaped body, new value, delta, source, as-of time in WAT + UTC and the `/status` link, with the token never appearing in the message body or in any log/response.

## What remains owner-only

1. Create the bot and public channel, add the bot as admin (`telegram-owner-setup.md` steps 1–2).
2. Set the encrypted Worker secrets `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` (step 4). Nothing is sent before this.
3. Send one message with `curl -X POST "$WORKER_URL/api/telegram/test" -H "Authorization: Bearer $PUSH_ADMIN_TOKEN"` and confirm the single channel post on a phone (step 5).
4. Nothing to set for the site link: the public channel URL is committed in `config/site.ts`, so the footer and `/status` show "Get alerts on Telegram" on every build without a dashboard variable (see `config-durability-2026-10-13.md`). `NEXT_PUBLIC_TELEGRAM_CHANNEL_URL` remains an optional override for a replacement channel.
5. Re-run the Web Push phone test to confirm push is unchanged.
