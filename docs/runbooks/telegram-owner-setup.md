# Telegram alerts owner setup (₦0 plan)

Owner-only, **after** an approved merge. This procedure uses the free Telegram Bot API only — no paid bot, no SaaS, no WhatsApp Business API. It does not change DNS, the custom domain, the canonical URL, the Worker route, `wrangler.jsonc` public variables or the existing KV binding names.

Never paste a bot token, chat id, admin token or any other secret into chat, Git, an issue, a screenshot, a pull request comment or a client-side `NEXT_PUBLIC_*` variable. Secret values belong only in the owner's password manager and in the Cloudflare dashboard.

Verification evidence for this phase (commands, scheduled-path phases and what is owner-only) is recorded in [`../evidence/telegram-alerts-2026-10-13.md`](../evidence/telegram-alerts-2026-10-13.md).

**Implementation status right now: `needs owner secrets`.** Code, shared genuine-change gate, cooldown, delivery, tests, the site link and this runbook exist; Telegram is a silent no-op until the owner adds the two secrets below. Production is unchanged and nothing is merged.

## 0. What Telegram does and does not share with Web Push

Telegram is **not** a second alert system. Both channels run from one decision inside the Worker cron:

| Guarantee | How it is enforced |
|---|---|
| Only genuine changes | `worker/alerts.ts` → `criticalChange()` is the single gate used by both channels |
| Healthy source required | `health.aboki.ok` / `health.awajis.ok` from `data/live/health.json` |
| Newer source time required | the stored reading's `asOf` must differ from the new one |
| Thresholds | parallel USD buy ≥ ₦5 move; any change in the depot petrol median |
| First observation | establishes the baseline and sends **nothing** |
| No spam | one shared six-hour cooldown (`push:critical-state.lastEventSentAt`) for the whole alert burst, Telegram included |
| One message per burst | the pending burst is marked `telegramSent` once Telegram accepts it, so a burst that spans several push-delivery pages cannot post twice |
| Stale/seeded data | never alerted: the gate ignores unparsable or non-positive values and unhealthy monitors |

Every Telegram message contains what changed, the new value, the delta, the source name, the source time in WAT **and** UTC, and a link back to the live site path (`/status`).

## 1. Create the bot (Telegram app, ~2 minutes)

1. Open Telegram and search for **@BotFather** (the verified one with the blue tick).
2. Send `/newbot`.
3. Give it a name, e.g. `NaijaCheck Alerts`.
4. Give it a username ending in `bot`, e.g. `naijacheck_alerts_bot`. The username must be unique worldwide.
5. BotFather replies with a token that looks like `123456789:AAH...`. **This is `TELEGRAM_BOT_TOKEN`.** Copy it once into your password manager. Anyone with this token can post as your bot; treat it like a password.
6. Do not run `/revoke`, `/setprivacy` or webhook commands — not needed here.

## 2. Create the public channel

1. In Telegram: **New Channel** → name it e.g. `NaijaCheck Alerts` → description: "Verified change alerts for the NaijaCheck status page."
2. Choose **Public** and set a link, e.g. `https://t.me/naijacheck_alerts`. Make a note of the exact `@username` (for example `@naijacheck_alerts`).
3. Open the channel → **Administrators** → **Add Admin** → search your bot's username → add it.
4. Leave the post permission **on** ("Post messages") and remove the ones you do not want (do not give the bot delete-user or invite permissions).
5. Send any message in the channel once yourself (or skip: the owner test in step 5 proves posting works).

## 3. Get the chat id for `TELEGRAM_CHAT_ID`

Use whichever is easiest:

- **Public channel (simplest):** the `@username` itself is the chat id, e.g. `@naijacheck_alerts`.
- **Numeric id (works for any channel):** forward a channel post to Telegram's `@userinfobot`, or add `@RawDataBot` to the channel temporarily, read the chat id (it starts with `-100`), then remove that temporary admin. Never leave a foreign bot as a channel admin.

The Worker accepts `@username` or a numeric id such as `-1001234567890`.

## 4. Where to put the two secrets (Cloudflare — required for sending)

In the Cloudflare dashboard: **Workers & Pages → naijacheck → Settings → Variables and Secrets**.

| Name | Type | Value |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | **encrypted secret** | the BotFather token from step 1 |
| `TELEGRAM_CHAT_ID` | **encrypted secret** | `@naijacheck_alerts` or the numeric `-100…` id |
| `PUSH_ADMIN_TOKEN` | encrypted secret | already required by Web Push; also protects the Telegram test endpoint. If you are not enabling Web Push, create one random value with `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"` |
| `ALERT_SITE_URL` | plain text variable (optional) | the host your readers can actually open today, e.g. `https://naijacheck.nnamdimichael020.workers.dev/status`. Leave it unset to keep the default canonical `https://naijacheck.ng/status` |

Save and deploy. No KV change is required here — Telegram reuses the existing `PUSH_SUBSCRIPTIONS` binding for the alert state and cooldown. **Do not** rename that binding, the VAPID variables or the cron trigger.

Optional (only if you ever run the monitor from GitHub Actions instead of the Worker cron): add repository secrets named exactly `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` under **Settings → Secrets and variables → Actions**. The shipped workflows do not read them; only add them if a future change wires them in. Never put either value in `wrangler.jsonc`, `.env` or any committed file.

### 4b. Show the "Get alerts on Telegram" link on the site (public, not a secret)

The site hides every Telegram link until it knows the channel URL. Choose one:

- **Cloudflare build variable (no commit needed):** **Workers & Pages → naijacheck → Settings → Build → Variables and secrets** → add `NEXT_PUBLIC_TELEGRAM_CHANNEL_URL = https://t.me/naijacheck_alerts`, then redeploy.
- **Or ask for a one-line code change** to `config/site.ts` (`TELEGRAM_CHANNEL_URL`) in a separately approved PR.

Only `https://t.me/…`, `https://telegram.me/…` or `https://telegram.dog/…` URLs are accepted; anything else (or an empty value) hides the link. This value is public and safe to show — it is not a second secret.

## 5. Test exactly one message (never spam the channel)

1. In a private terminal, set the Worker URL and the admin token **without saving shell history**:

   ```bash
   export WORKER_URL="https://naijacheck.nnamdimichael020.workers.dev"
   export PUSH_ADMIN_TOKEN="<the same token you stored in step 4>"
   ```

2. Send one message:

   ```bash
   curl -i "$WORKER_URL/api/telegram/test" -X POST -H "Authorization: Bearer $PUSH_ADMIN_TOKEN"
   ```

   Expected: `HTTP 200` and `{"delivered":true,"status":200}`. `503 telegram_not_configured` means a secret name is missing or its format is wrong; `401` means the admin token header is missing or different. Neither case ever sends anything.

3. Open the channel on a phone and confirm exactly one clearly labelled "NaijaCheck test alert" message with the status link. A successful HTTP reply proves Telegram accepted the message; only the channel view proves it appeared.

4. Clear the variables from the shell: `unset TELEGRAM_BOT_TOKEN TELEGRAM_CHAT_ID PUSH_ADMIN_TOKEN`.

5. Nothing else is sent automatically until a real reading genuinely moves. Do not force one: the first cron run after deployment only records a baseline.

6. If you want to prove a real alert end-to-end without touching production data, the unit tests already assert it (`npm run telegram:test`): baseline sends nothing, a ₦3 movement sends nothing, a ₦6 movement sends one message, a second event inside six hours is coalesced, and an unconfigured Worker never calls Telegram at all.

## 6. Confirm Web Push still works (no regression)

1. `GET /api/push/config` must still return `available`/`publicKey` exactly as before (the Telegram status appears as the extra `telegramAvailable` field).
2. Re-run the phone test in `web-push-owner-setup.md` step 6 with one browser and confirm the notification still arrives.
3. Both channels share the six-hour cooldown: when both are enabled, one genuine change produces one burst **per channel**, not two bursts.

## 7. Disable Telegram (instant, no code change)

1. Cloudflare → **Workers & Pages → naijacheck → Settings → Variables and Secrets**.
2. Delete `TELEGRAM_BOT_TOKEN` (or set it to an empty value) and, if you also want the links gone, remove `NEXT_PUBLIC_TELEGRAM_CHANNEL_URL` from the build variables.
3. Deploy. The Worker logs `telegram not configured (…)` and no-ops; every other feature, Web Push included, keeps working.
4. If the token may have leaked, use BotFather `/revoke` to invalidate it, then create/set a new token. Revoking must be reported without ever reprinting the token.

## 8. Troubleshooting

| Symptom | Meaning | Action |
|---|---|---|
| Worker log `telegram not configured (missing_bot_token)` | secret absent or empty | re-add `TELEGRAM_BOT_TOKEN` |
| Worker log `telegram not configured (invalid_bot_token)` | value is not a BotFather token (no `123456789:` prefix) | copy the token again; do not paste surrounding quotes |
| Worker log `telegram not configured (invalid_chat_id)` | chat id has spaces/emoji, or misses `@` | use `@channelusername` or `-100…` |
| `HTTP 403` from Telegram on send | the bot is not an admin of the channel, or cannot post | redo step 2.3–2.4 |
| `HTTP 400 chat not found` | wrong chat id, or the bot was removed | re-add the bot as admin |
| `telegram not configured` but secrets look set | you edited a different Worker/environment, or forgot to deploy | check the deployment name and redeploy |
| No message ever, log says `no change` | correct behaviour when nothing genuinely moved | leave it alone; never trigger a fake alert |

## 9. Cost and secret handling rules

- Telegram Bot API is free; the Worker cron, KV and static assets stay inside the documented Cloudflare free plan in `zero-cost-operations-2026-10-09.md`. If any dashboard proposes a paid plan, stop.
- Outbound requests are bounded: at most one `sendMessage` per genuine change (and one per manual owner test), always inside the shared six-hour cooldown.
- The token is sent only in the Telegram API request path; it is never logged, never returned by an endpoint and never written to KV. Logs contain only status codes and short reason strings such as `telegram not configured (missing_bot_token)`.
- Deleting the two secrets is the complete off switch. No subscriber data, no chat history and no Telegram user data is stored by this site.
