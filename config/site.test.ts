/**
 * Committed-config durability test.
 *
 * Regression guard for the class of bug where a public value lived only in a
 * Cloudflare dashboard/build variable and silently disappeared after a build or
 * deploy: the "Get alerts on Telegram" link vanished because
 * `NEXT_PUBLIC_TELEGRAM_CHANNEL_URL` was not committed anywhere.
 *
 * The public Telegram channel URL is now committed in `config/site.ts`, so this test
 * must pass with **no** environment variables set at all. Run with `npm run site:test`.
 */
import assert from "node:assert/strict";
import {
  parseTelegramChannelUrl,
  SITE_CONFIG,
  TELEGRAM_CHANNEL_URL,
  TELEGRAM_CHANNEL_URL_DEFAULT,
} from "./site";

const COMMITTED = "https://t.me/naijacheck_alerts";

function run(): void {
  // ---- the value is committed, not dashboard-only ------------------------
  assert.equal(TELEGRAM_CHANNEL_URL_DEFAULT, COMMITTED, "the committed channel URL is the public NaijaCheck alerts channel");
  assert.equal(SITE_CONFIG.telegramChannelUrl, TELEGRAM_CHANNEL_URL, "the footer and /status read one source of truth");

  const override = (process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL_URL ?? "").trim();
  if (!override) {
    assert.equal(
      TELEGRAM_CHANNEL_URL,
      COMMITTED,
      "with no dashboard variable set at all, the link still resolves to the committed channel",
    );
  } else {
    // A set variable may only override with a real Telegram URL; never with anything else.
    assert.equal(TELEGRAM_CHANNEL_URL, parseTelegramChannelUrl(override), "a set override goes through the same validation");
  }

  // Never empty and always an outbound https Telegram link: the footer/status link can only be
  // removed deliberately, never by a missing dashboard variable.
  assert.notEqual(TELEGRAM_CHANNEL_URL, "", "the channel URL can never be blank by accident");
  const resolved = new URL(TELEGRAM_CHANNEL_URL);
  assert.equal(resolved.protocol, "https:", "the channel link is https only");
  assert.equal(resolved.hostname, "t.me", "the channel link stays on t.me");
  assert.equal(SITE_CONFIG.telegramChannelUrl, TELEGRAM_CHANNEL_URL);

  // ---- an override cannot blank or hijack the link -----------------------
  assert.equal(parseTelegramChannelUrl(undefined), COMMITTED, "unset override keeps the committed channel");
  assert.equal(parseTelegramChannelUrl(""), COMMITTED, "empty override keeps the committed channel");
  assert.equal(parseTelegramChannelUrl("   "), COMMITTED, "whitespace-only override keeps the committed channel");
  assert.equal(parseTelegramChannelUrl("not a url"), COMMITTED, "garbage override keeps the committed channel");
  assert.equal(parseTelegramChannelUrl("http://t.me/naijacheck_alerts"), COMMITTED, "plain-http override is rejected");
  assert.equal(parseTelegramChannelUrl("https://evil.example/naijacheck"), COMMITTED, "non-Telegram host override is rejected");
  assert.equal(parseTelegramChannelUrl("https://t.me.evil.example/x"), COMMITTED, "lookalike host override is rejected");
  assert.equal(
    parseTelegramChannelUrl("https://t.me/naijacheck_alerts_2"),
    "https://t.me/naijacheck_alerts_2",
    "a genuine Telegram URL can still override the committed channel",
  );

  // ---- no secret can leak through this module ----------------------------
  const serialised = JSON.stringify(SITE_CONFIG);
  assert.ok(!/TELEGRAM_BOT_TOKEN|TELEGRAM_CHAT_ID|PUSH_ADMIN_TOKEN|VAPID_PRIVATE/i.test(serialised), "site config carries no secret names");

  console.log("Site config tests passed (committed Telegram channel URL survives builds; no dashboard variable required).");
}

run();
