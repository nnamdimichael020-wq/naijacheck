/**
 * Single source of truth for brand + domain.
 * To migrate from Cloudflare Pages (*.pages.dev) to the real domain, change `domain` and `url` here.
 */
export const SITE_CONFIG = {
  name: "NaijaCheck",
  domain: "naijacheck.ng",
  url: "https://naijacheck.ng",
  description:
    "Daily Naija prices, trending slang decoder, hustle blueprints, how-to guides and calculators.",
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
