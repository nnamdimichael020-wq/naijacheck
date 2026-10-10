# Web Push owner setup (₦0 plan)

This procedure is owner-only and must be performed **after an approved merge**. It does not change the custom domain, DNS, canonical URL, or production route. Never paste a VAPID private key, admin token, subscription endpoint, Cloudflare credential, or other secret into chat, Git, an issue, a screenshot, or a client-side `NEXT_PUBLIC_*` variable.

Implementation status before these steps: the code, APIs, service-worker handlers, genuine-change gates and tests exist, but Web Push is unavailable because this branch has no production KV binding or secrets. A dry run cannot prove delivery.

## 1. Recheck the zero-cost limits

Before every enablement, read Cloudflare's current official [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), [KV pricing](https://developers.cloudflare.com/kv/platform/pricing/) and [KV limits](https://developers.cloudflare.com/kv/platform/limits/). On 10 October 2026 the Free plan documents:

- Workers: 100,000 requests/day and 10 ms CPU per HTTP request;
- KV: 100,000 reads/day, 1,000 writes/day, 1,000 deletes/day, 1,000 list operations/day and 1 GB stored data;
- quotas reset at 00:00 UTC, and an exhausted KV operation type fails rather than silently becoming paid.

These are limits, not an unlimited or permanent guarantee. Stop if the account dashboard proposes a paid plan.

## 2. Generate VAPID and admin values locally, once

Use Node 20 in a private local terminal:

```bash
node --version
npx @pushforge/builder@2.0.5 vapid
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

The first command produces a **Public Key** and a **Private Key (JWK)**. The last command produces a random admin token. Save them in the owner's password manager. Do not run them in CI and do not commit their output.

## 3. Create and bind KV in the Cloudflare dashboard

1. Sign in to Cloudflare and open **Storage & Databases → KV**.
2. Select **Create** and name the namespace `naijacheck-push-subscriptions`.
3. Open **Workers & Pages → naijacheck → Settings → Bindings**.
4. Select **Add → KV Namespace**.
5. Enter the variable name **exactly** `PUSH_SUBSCRIPTIONS`.
6. Select `naijacheck-push-subscriptions`, then **Deploy**.

Cloudflare's official binding procedure is documented at [KV namespaces](https://developers.cloudflare.com/kv/concepts/kv-namespaces/). Do not put an account-specific namespace ID in this repository. Local Wrangler uses local KV by default; never add `remote: true` merely to make a test pass.

## 4. Add Worker variables and encrypted secrets

In **Workers & Pages → naijacheck → Settings → Variables and Secrets**, add:

| Name | Type | Value source |
|---|---|---|
| `VAPID_PUBLIC_KEY` | plain text variable | the generated Public Key |
| `VAPID_PRIVATE_JWK` | **encrypted secret** | the entire one-line private JWK JSON |
| `PUSH_ADMIN_TOKEN` | **encrypted secret** | the generated random admin token |
| `VAPID_SUBJECT` | plain text variable | `https://naijacheck.ng` |

Save/deploy. The public key is designed for browsers; the private JWK and admin token are not. An equivalent CLI operation is possible with `wrangler secret put`, but the dashboard is preferred here so secret values never enter shell history or repository files.

## 5. Deploy only after approval

Follow `release-after-approval.md`. The committed cron is `47 */3 * * *`, eight checks per day. After deployment, open **Worker → Triggers** and confirm that schedule. The scheduled handler reads only the default branch's committed `fx.json`, `fuel.json`, and `health.json`; a first successful read establishes a baseline and sends nothing.

The Worker can create an alert only when:

- the Aboki monitor is healthy and a newer parallel USD buy reading differs by at least ₦5; or
- the Awajis monitor is healthy and a newer wholesale depot petrol median differs at all.

It includes source, source as-of time and `/status`; a global six-hour cooldown means no subscriber can receive more than one real change alert in six hours. A protected owner test is the only non-change message. The Worker removes endpoints when a push service returns HTTP 404 or 410.

## 6. Phone test—do not skip

1. Use the production HTTPS site on a physical phone. On iPhone/iPad, add the site to the Home Screen first and launch that installed web app; test current supported Safari/iOS behavior rather than assuming desktop behavior.
2. Open `/status`. Under **Notification settings**, tap **Enable alerts**. The browser permission request must appear only after this tap.
3. Confirm Cloudflare KV now has one `push:subscription:*` key. Its JSON must contain only `endpoint`, `keys.p256dh`, and `keys.auth`.
4. In that phone's DevTools, privately obtain the endpoint (do not share it):

   ```js
   (await (await navigator.serviceWorker.ready).pushManager.getSubscription()).endpoint
   ```

5. In a private local terminal, assign the production Worker URL, endpoint and admin token without saving shell history. Call:

   ```bash
   curl -i "$WORKER_URL/api/push/test" \
     -H "Authorization: Bearer $PUSH_ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     --data "$(node -e 'console.log(JSON.stringify({endpoint:process.env.PUSH_ENDPOINT}))')"
   ```

6. A JSON result with `deliveredToPushService: true` means the browser vendor accepted the encrypted push; it does **not** prove the phone displayed it. Lock/background the app and visually confirm the notification, text, icon and tap-through to `/status`.
7. Tap **Unsubscribe and clear**, confirm the KV key disappears, and confirm no further test can target it.
8. Repeat denial, seven-day “Not now”, Android Chromium, desktop Chromium/Firefox, and installed iOS PWA cases in `browser-qa-checklist.md`.

Do not mark real delivery complete until a physical backgrounded phone displays and opens the alert.

## 7. Quota and failure response

Expected small-site operations are bounded: each new subscription is one KV write; unsubscribe/dead cleanup is one delete; each three-hour check reads state and snapshots and normally makes one state write; an actual event uses paginated list operations and at most 20 push-service requests per scheduled invocation. This is a design bound, not a traffic promise.

If a free quota is exhausted, Cloudflare documents that operations of that type fail until the 00:00 UTC reset. Do not add billing. Instead:

1. Disable the cron or remove the push binding if necessary; keep the page-open local watchlist available.
2. Inspect Worker logs for the operation that failed—read, write, delete, list, CPU, request or outbound subrequest.
3. Record counts and UTC reset time without exposing endpoint values or secrets.
4. Investigate abuse and subscription growth. Rotate `PUSH_ADMIN_TOKEN` if test-endpoint access is suspected.
5. Do not delete all subscriptions as a first response and do not claim delivery while KV is failing.
6. Re-enable only after the reset and a successful owner test. If normal demand cannot stay within current free limits, leave Web Push disabled pending a separately approved architecture; the cash budget remains ₦0.

## Stored fields and deletion

Per subscriber, KV stores only the browser-provided endpoint and the required `p256dh` and `auth` encryption keys. The SHA-256 endpoint hash appears in the KV key only for deduplication; no reverse lookup table is stored. Global non-subscriber keys retain the last critical readings, source times, cooldown time and any pending public alert payload. No name, phone, email, precise location, custom threshold or browsing profile is attached.
