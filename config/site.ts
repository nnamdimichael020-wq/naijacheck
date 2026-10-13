/**
 * Public Telegram channel that mirrors the same verified change alerts as Web Push.
 * Not a secret: it is rendered in the footer and on /status.
 * Leave empty until the owner has created the channel — the UI hides every Telegram link when empty.
 * Can also be set at build time with `NEXT_PUBLIC_TELEGRAM_CHANNEL_URL` (e.g. https://t.me/naijacheck).
 */
function publicTelegramChannelUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL_URL ?? "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (url.protocol !== "https:") return "";
    if (host !== "t.me" && host !== "telegram.me" && host !== "telegram.dog") return "";
    return url.toString();
  } catch {
    return "";
  }
}

export const TELEGRAM_CHANNEL_URL = publicTelegramChannelUrl();

/**
 * Single source of truth for brand + domain.
 * To migrate from a Cloudflare-managed hostname to the real domain, change `domain` and `url` here.
 */
export const SITE_CONFIG = {
  name: "NaijaCheck",
  domain: "naijacheck.ng",
  url: "https://naijacheck.ng",
  description:
    "Daily Naija prices, trending slang decoder, hustle blueprints, how-to guides and calculators.",
  /** Public alert channel. Empty = no channel created yet, so every Telegram link is hidden. */
  telegramChannelUrl: TELEGRAM_CHANNEL_URL,
} as const;

export const SITE_TAGLINE = "Real Prices. Real Slang. Real Hustle.";

/** Shown in <meta name="author"> and the footer. */
export const SITE_LOCALE = "en_NG";
export const SITE_CURRENCY = "NGN";

/** Google AdSense publisher id (ca-pub-XXXXXXXXXXXXXXXX). Leave empty until approved. */
export const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "";

/** Premium mock price (₦). Real payment provider goes here later. */
export const PREMIUM_PRICE_NGN = 2500;

export const SOCIAL_HANDLE = "@naijacheck";
