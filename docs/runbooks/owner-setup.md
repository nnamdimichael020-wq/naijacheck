# Owner setup

The canonical zero-cost Web Push setup procedure is [`web-push-owner-setup.md`](./web-push-owner-setup.md). It covers Cloudflare KV, VAPID/admin secrets, deployment, physical-phone testing, privacy fields and quota exhaustion.

The canonical zero-cost Telegram alert channel setup is [`telegram-owner-setup.md`](./telegram-owner-setup.md). It covers BotFather, the public channel, the `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` secrets, one-message testing and the complete off switch. Telegram shares the same genuine-change gate and six-hour cooldown as Web Push.

Do not paste secrets into chat, source files, issues, logs or client-side variables. Domain/DNS, canonical host and production routing remain separate owner decisions. Ads, affiliates, newsletter, analytics, real payment and community publishing remain disabled until separately approved and securely configured.
