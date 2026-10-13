/**
 * Public Telegram channel that mirrors the same verified change alerts as Web Push.
 *
 * This is committed here **on purpose**. It is a public fact about the site, not a
 * secret, and dashboard/build variables are not durable: `NEXT_PUBLIC_*` plain
 * variables are re-entered by hand and disappear on some build/deploy paths, which
 * silently removed the "Get alerts on Telegram" link (same class of failure as the
 * VAPID public vars before `wrangler.jsonc`). Committing the URL means it survives
 * every build and every deploy without any dashboard step.
 */
export const TELEGRAM_CHANNEL_URL_DEFAULT = "https://t.me/naijacheck_alerts";

/**
 * `NEXT_PUBLIC_TELEGRAM_CHANNEL_URL` stays available as an optional override for a
 * renamed or replacement channel, but it can never blank or hijack the link: an empty,
 * malformed or non-Telegram value falls back to the committed URL above. Every
 * Telegram link stays hidden only if the committed default is cleared in code.
 */
export function parseTelegramChannelUrl(raw: string | undefined): string {
  const value = (raw ?? "").trim();
  if (!value) return TELEGRAM_CHANNEL_URL_DEFAULT;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (url.protocol !== "https:") return TELEGRAM_CHANNEL_URL_DEFAULT;
    if (host !== "t.me" && host !== "telegram.me" && host !== "telegram.dog") return TELEGRAM_CHANNEL_URL_DEFAULT;
    return url.toString();
  } catch {
    return TELEGRAM_CHANNEL_URL_DEFAULT;
  }
}

export const TELEGRAM_CHANNEL_URL = parseTelegramChannelUrl(process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL_URL);

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
  /**
   * Public alert channel, rendered in the footer and on /status.
   * Committed (see `TELEGRAM_CHANNEL_URL_DEFAULT`); only clear it in code to hide every Telegram link.
   */
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
