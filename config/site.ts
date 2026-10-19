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
  /**
   * X (Twitter) handle used **only** in share intents, without the leading @.
   *
   * Intentionally empty: no X account has been verified for NaijaCheck. `SOCIAL_HANDLE`
   * below is a general contact string, not proof that an X account exists, so the
   * WhatsApp/X prefill omits every @mention until a real handle is set here.
   * `normalizeXHandle()` in `lib/share.ts` accepts 1–15 letters, digits or underscores
   * and ignores anything malformed, so a bad value can never produce a fake mention.
   */
  xHandle: "",
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

/* ------------------------------------------------------------------ */
/* Hero motion policy ("subtle" Ken Burns allowlist)                    */
/* ------------------------------------------------------------------ */

/** Motion setting for a hero image. `"static"` is the site-wide default. */
export type HeroMotion = "static" | "subtle";

/**
 * The **only** routes whose hero image may carry the subtle CSS Ken Burns drift
 * (`.article-hero-motion` in `app/globals.css`). Everything else is `"static"`.
 *
 * Rules (see docs/image-credits.md):
 * - Motion is opt-in per **exact path**, capped at 3–5 flagship routes.
 * - CSS-only, on the hero image only — no JS animation libraries, no autoplay
 *   MP4/WebM loops, no sound, and never on the whole page body.
 * - Fully disabled for `prefers-reduced-motion: reduce` (no animation, no transform).
 * - Never list `/status`, `/tools/*`, pure price-table pages, hustle-combo pages,
 *   or guides that render no hero image.
 */
export const HERO_MOTION_ALLOWLIST = [
  "/",
  "/howto/drivers-licence-frsc",
  "/howto/prepaid-electricity-bands",
  "/howto/lasrra-lagos-residency",
  "/howto/nbs-food-price-watch",
] as const;

/**
 * Route trees where hero motion is policy-forbidden even if mistakenly allowlisted:
 * `/status`, `/tools/*`, pure price tables (`/prices` and everything under it, which
 * includes the pure price-table pages) and `/hustle` (where the no-motion
 * hustle-combo pages live). Deliberately conservative: motion belongs only to the
 * small flagship allowlist above, never to data/tool/status surfaces.
 */
export function isHeroMotionForbiddenRoute(routePath: string): boolean {
  if (!routePath.startsWith("/")) return true;
  return (
    routePath === "/status" ||
    routePath.startsWith("/status/") ||
    routePath === "/tools" ||
    routePath.startsWith("/tools/") ||
    routePath === "/prices" ||
    routePath.startsWith("/prices/") ||
    routePath === "/hustle" ||
    routePath.startsWith("/hustle/")
  );
}

/**
 * The single policy function every hero (article + home) reads. Returns `"subtle"`
 * only for exact paths on `HERO_MOTION_ALLOWLIST` outside the forbidden route
 * trees; every other path — including guides without a hero — stays `"static"`.
 */
export function heroMotionForPath(routePath: string): HeroMotion {
  if (isHeroMotionForbiddenRoute(routePath)) return "static";
  return (HERO_MOTION_ALLOWLIST as readonly string[]).includes(routePath) ? "subtle" : "static";
}
