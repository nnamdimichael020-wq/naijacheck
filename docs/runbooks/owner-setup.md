# Owner setup

The canonical zero-cost Web Push setup procedure is [`web-push-owner-setup.md`](./web-push-owner-setup.md). It covers Cloudflare KV, VAPID/admin secrets, deployment, physical-phone testing, privacy fields and quota exhaustion.

The canonical zero-cost Telegram alert channel setup is [`telegram-owner-setup.md`](./telegram-owner-setup.md). It covers BotFather, the public channel, the `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` secrets, one-message testing and the complete off switch. Telegram shares the same genuine-change gate and six-hour cooldown as Web Push.

The canonical zero-cost Google Search Console setup is [`google-search-console-owner-setup.md`](./google-search-console-owner-setup.md). It covers adding the free Search Console property for the live host (and later the `.ng` domain), verifying ownership with a committed file, submitting the sitemap, and requesting indexing for the priority pages — with no ranking claims and no DNS change.

Do not paste secrets into chat, source files, issues, logs or client-side variables. Domain/DNS, canonical host and production routing remain separate owner decisions. Ads, affiliates, newsletter, analytics, real payment and community publishing remain disabled until separately approved and securely configured.
