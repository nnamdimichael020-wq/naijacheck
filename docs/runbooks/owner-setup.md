# Owner setup (zero-cash boundary)

The current build needs no paid API, custom-domain change, analytics, ads, payment, email, or push provider. Do not paste secrets into chat, source files, issues, logs, or client-side environment variables.

## Current notifications

There is no push service. `/status` provides an explicitly labelled page-open local watchlist. Rules stay in browser `localStorage`, make no subscription, request no notification permission, and run only when that page is open.

## If the owner later enables real push

Do not implement this until the owner has independently verified current official Cloudflare Workers/D1 limits and confirms the feature remains within the ₦0 budget. Free tiers have limits and are not guaranteed forever.

Required design before launch:

1. Generate VAPID keys locally; place private material only in Cloudflare encrypted secrets, never `NEXT_PUBLIC_*`.
2. Bind a dedicated D1 database in Wrangler/dashboard. Store minimized endpoint, encrypted subscription keys, rule, consent time, and random deletion token; never store precise location unless essential and explicitly consented.
3. Implement same-origin subscribe, unsubscribe/delete, rate limiting, CSRF/origin checks, schema validation, endpoint deduplication, expiry cleanup, and abuse quotas in the Worker.
4. Publish privacy purpose/retention/deletion text and test opt-in, denial, unsubscribe, endpoint expiry, and secret rotation.
5. Make failures visible and bounded. Polling while a page is closed is not push and must never be labelled push.

Document dashboard and `wrangler secret put` steps without recording secret values. Obtain owner approval and qualified privacy/legal review before collection.

## Community submissions

Keep submissions closed until a server-side moderation queue has authentication/authorization, validation, anti-spam/rate limits, data minimization, retention/deletion rules, audit logs, and manual approval. Never auto-publish and never use a client-side admin password.

## Monetization and legal identity

Ads, affiliates, newsletter, analytics, and real payment remain disabled until approved accounts and legal/privacy review exist. Do not invent controller name, contact address, commission terms, tax claims, revenue projections, or policy consent. Domain/DNS, canonical host, and production Worker routing are separate owner decisions and are unchanged.