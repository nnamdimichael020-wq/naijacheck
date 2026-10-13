import assert from "node:assert/strict";
import { webcrypto, randomBytes } from "node:crypto";
import { criticalChange } from "./alerts";
import { buildTelegramMessage, handleTelegramRequest, sendTelegramAlert, telegramConfiguration } from "./telegram";
import { runAlertMonitor, type PushKv } from "./push";

const VALID_TOKEN = "123456789:AAHtest-token-not-a-real-secret-000000";
const VALID_CHAT = "@naijacheck_alerts";

class MemoryKv implements PushKv {
  values = new Map<string, { value: string; metadata?: unknown }>();
  async get(key: string): Promise<unknown> {
    const found = this.values.get(key);
    return found ? JSON.parse(found.value) : null;
  }
  async put(key: string, value: string, options?: { metadata?: unknown }): Promise<void> {
    this.values.set(key, { value, metadata: options?.metadata });
  }
  async delete(key: string): Promise<void> { this.values.delete(key); }
  async list<T>({ prefix, limit = 1000, cursor }: { prefix: string; limit?: number; cursor?: string }): Promise<{ keys: Array<{ name: string; metadata?: T }>; list_complete: boolean; cursor?: string }> {
    const all = [...this.values].filter(([key]) => key.startsWith(prefix)).map(([name, entry]) => ({ name, metadata: entry.metadata as T }));
    const start = cursor ? Number(cursor) : 0;
    const page = all.slice(start, start + limit);
    const next = start + limit;
    return next < all.length ? { keys: page, list_complete: false, cursor: String(next) } : { keys: page, list_complete: true };
  }
}

/** Telegram bodies are JSON text; Web Push bodies are encrypted binary, so `json` stays null there. */
type Call = { url: string; text: string; json: any };

function toBytes(body: RequestInit["body"]): Uint8Array | null {
  if (typeof body === "string") return new TextEncoder().encode(body);
  if (body instanceof Uint8Array) return body;
  if (body instanceof ArrayBuffer) return new Uint8Array(body);
  return null;
}

function parseBody(body: RequestInit["body"]): { text: string; json: any } {
  const bytes = toBytes(body);
  if (!bytes) return { text: "", json: null };
  const text = new TextDecoder().decode(bytes);
  try {
    return { text, json: JSON.parse(text) };
  } catch {
    return { text, json: null };
  }
}

/** Counts and captures outbound requests so a test can prove nothing was sent. */
function recorder(responder: (url: string) => Response = () => new Response(JSON.stringify({ ok: true }), { status: 200 })) {
  const calls: Call[] = [];
  const fetchImpl = async (input: string, init?: RequestInit): Promise<Response> => {
    calls.push({ url: String(input), ...parseBody(init?.body) });
    return responder(String(input));
  };
  return { calls, fetchImpl };
}

const snapshots = (fx: unknown, fuel: unknown, health: unknown) => (url: string): Response => {
  if (url.endsWith("/fx.json")) return new Response(JSON.stringify(fx), { status: 200 });
  if (url.endsWith("/fuel.json")) return new Response(JSON.stringify(fuel), { status: 200 });
  if (url.endsWith("/health.json")) return new Response(JSON.stringify(health), { status: 200 });
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};

function githubFetch(
  fx: unknown,
  fuel: unknown,
  health: unknown,
  telegram = true,
): { calls: Call[]; fetchImpl: (input: string, init?: RequestInit) => Promise<Response> } {
  const calls: Call[] = [];
  const fetchImpl = async (input: string, init?: RequestInit): Promise<Response> => {
    const url = String(input);
    calls.push({ url, ...parseBody(init?.body) });
    if (url.startsWith("https://api.telegram.org/")) {
      return telegram ? new Response(JSON.stringify({ ok: true }), { status: 200 }) : new Response(JSON.stringify({ ok: false }), { status: 403 });
    }
    return snapshots(fx, fuel, health)(url);
  };
  return { calls, fetchImpl };
}

/** Real P-256 keys so the push builder accepts the subscription (no fake crypto). */
async function vapid(): Promise<{ privateJwk: string }> {
  const { subtle } = webcrypto;
  const keys = await subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  return { privateJwk: JSON.stringify(await subtle.exportKey("jwk", keys.privateKey)) };
}

async function pushSubscription() {
  const { subtle } = webcrypto;
  const browser = await subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  return {
    endpoint: "https://fcm.googleapis.com/wp/telegram-test-endpoint",
    keys: {
      p256dh: Buffer.from(await subtle.exportKey("raw", browser.publicKey)).toString("base64url"),
      auth: Buffer.from(randomBytes(16)).toString("base64url"),
    },
  };
}

const HEALTHY = { aboki: { ok: true }, awajis: { ok: true } };
const BASELINE_FX = { blackMarket: { USD: { buy: 1_370 } }, blackMarketAsOf: "2026-10-10T07:06:00Z", blackMarketSource: { label: "Aboki Forex" } };

async function run() {
  // ---- Configuration gate -------------------------------------------------
  assert.equal(telegramConfiguration({}).configured, false, "no secrets means unconfigured");
  assert.equal(telegramConfiguration({}).reason, "missing_bot_token");
  assert.equal(telegramConfiguration({ TELEGRAM_BOT_TOKEN: VALID_TOKEN }).reason, "missing_chat_id");
  assert.equal(telegramConfiguration({ TELEGRAM_BOT_TOKEN: "not-a-token", TELEGRAM_CHAT_ID: VALID_CHAT }).configured, false, "malformed token is unconfigured");
  assert.equal(telegramConfiguration({ TELEGRAM_BOT_TOKEN: VALID_TOKEN, TELEGRAM_CHAT_ID: "has spaces" }).configured, false, "malformed chat id is unconfigured");
  assert.equal(telegramConfiguration({ TELEGRAM_BOT_TOKEN: VALID_TOKEN, TELEGRAM_CHAT_ID: VALID_CHAT }).configured, true);
  assert.equal(telegramConfiguration({ TELEGRAM_BOT_TOKEN: VALID_TOKEN, TELEGRAM_CHAT_ID: "-1001234567890" }).configured, true, "numeric channel id accepted");

  // ---- Unconfigured send is a silent no-op --------------------------------
  const unconfigured = recorder();
  const skipped = await sendTelegramAlert({}, { title: "", body: "", source: "", asOf: "", url: "", changes: [] }, { fetchImpl: unconfigured.fetchImpl });
  assert.equal(skipped.ok, false);
  assert.equal(skipped.skipped, true);
  assert.equal(unconfigured.calls.length, 0, "no Telegram request when unconfigured");

  // ---- Message content ----------------------------------------------------
  const baseline = criticalChange({}, BASELINE_FX, { medians: { petrol: 1_342.5 }, asOf: "2026-10-09T23:21:00Z", source: { label: "Awajis" } }, HEALTHY);
  assert.equal(baseline.payload, null, "first observation is a baseline and sends nothing");

  const change = criticalChange(baseline.state, {
    blackMarket: { USD: { buy: 1_375 } }, blackMarketAsOf: "2026-10-10T10:06:00Z", blackMarketSource: { label: "Aboki Forex" },
  }, { medians: { petrol: 1_343 }, asOf: "2026-10-10T09:21:00Z", source: { label: "Awajis fuel tables" } }, HEALTHY);
  assert.equal(change.payload?.changes.length, 2, "one genuine USD move plus one genuine petrol move");
  const message = buildTelegramMessage(change.payload!);
  assert.match(message, /Parallel USD buy/, "says what changed");
  assert.match(message, /₦1,375\/US\$/, "includes the new value and unit");
  assert.match(message, /\+₦5/, "includes the delta");
  assert.match(message, /10 Oct 2026, 11:06/, "includes the source as-of time in WAT");
  assert.match(message, /2026-10-10T10:06:00/, "includes the machine-readable source time");
  assert.match(message, /Aboki Forex/, "names the source");
  assert.match(message, /https:\/\/naijacheck\.ng\/status/, "links back to the live status path");
  assert.ok(message.length < 4096, "stays inside Telegram's message limit");

  // ---- Same source time is not a change, failure cannot fabricate one -----
  const sameSourceTime = criticalChange(baseline.state, {
    blackMarket: { USD: { buy: 1_375 } }, blackMarketAsOf: "2026-10-10T07:06:00Z", blackMarketSource: { label: "Aboki Forex" },
  }, {}, { aboki: { ok: true } });
  assert.equal(sameSourceTime.payload, null, "a newer source time is required; a re-read of the same time alerts nobody");

  const unhealthy = criticalChange(baseline.state, {
    blackMarket: { USD: { buy: 2_000 } }, blackMarketAsOf: "2026-10-10T10:06:00Z", blackMarketSource: { label: "Aboki Forex" },
  }, { medians: { petrol: 1_400 }, asOf: "2026-10-10T10:06:00Z" }, { aboki: { ok: false }, awajis: { ok: false } });
  assert.equal(unhealthy.payload, null, "a failed monitor never alerts");

  // ---- Monitor: nothing is sent without a genuine change ------------------
  const kv = new MemoryKv();
  const env = { PUSH_SUBSCRIPTIONS: kv, TELEGRAM_BOT_TOKEN: VALID_TOKEN, TELEGRAM_CHAT_ID: VALID_CHAT };

  const firstRun = githubFetch(BASELINE_FX, { medians: { petrol: 1_342.5 }, asOf: "2026-10-09T23:21:00Z", source: { label: "Awajis" } }, HEALTHY);
  const runOne = await runAlertMonitor(env, { fetchImpl: firstRun.fetchImpl });
  assert.equal(runOne.outcome, "no_change", "baseline run sends nothing");
  assert.equal(firstRun.calls.filter((call) => call.url.startsWith("https://api.telegram.org/")).length, 0, "no Telegram call on baseline");
  assert.equal(kv.values.has("push:pending-event"), false, "no pending event on baseline");

  const flatRun = githubFetch({ ...BASELINE_FX, blackMarket: { USD: { buy: 1_370 } } }, { medians: { petrol: 1_342.5 }, asOf: "2026-10-09T23:21:00Z" }, HEALTHY);
  const runFlat = await runAlertMonitor(env, { fetchImpl: flatRun.fetchImpl });
  assert.equal(runFlat.outcome, "no_change", "flat identical readings never send");
  assert.equal(flatRun.calls.filter((call) => call.url.startsWith("https://api.telegram.org/")).length, 0);

  const belowThreshold = githubFetch({ ...BASELINE_FX, blackMarket: { USD: { buy: 1_373 } }, blackMarketAsOf: "2026-10-10T10:06:00Z" }, {}, HEALTHY);
  const runBelow = await runAlertMonitor(env, { fetchImpl: belowThreshold.fetchImpl });
  assert.equal(runBelow.outcome, "no_change", "movement below ₦5 never sends");

  // ---- Monitor: genuine change delivers exactly one Telegram message ------
  const genuine = githubFetch({ ...BASELINE_FX, blackMarket: { USD: { buy: 1_379 } }, blackMarketAsOf: "2026-10-10T13:06:00Z" }, {}, HEALTHY);
  const runGenuine = await runAlertMonitor(env, { fetchImpl: genuine.fetchImpl });
  const telegramCalls = genuine.calls.filter((call) => call.url.startsWith("https://api.telegram.org/"));
  assert.equal(telegramCalls.length, 1, "a genuine change sends exactly one Telegram message");
  assert.equal(runGenuine.outcome, "delivered");
  assert.equal(runGenuine.sent.telegram, true);
  assert.equal(telegramCalls[0].json.chat_id, VALID_CHAT);
  assert.equal(telegramCalls[0].json.parse_mode, "HTML");
  assert.match(telegramCalls[0].json.text, /\+₦6/, "delta is reported");
  assert.match(telegramCalls[0].json.text, /https:\/\/naijacheck\.ng\/status/);

  // ---- Cooldown: the second genuine change in six hours is coalesced ------
  const soon = githubFetch({ ...BASELINE_FX, blackMarket: { USD: { buy: 1_390 } }, blackMarketAsOf: "2026-10-10T16:06:00Z" }, {}, HEALTHY);
  const runCooldown = await runAlertMonitor(env, { fetchImpl: soon.fetchImpl });
  assert.equal(runCooldown.outcome, "coalesced", "a burst inside the six-hour window is coalesced, not sent");
  assert.equal(soon.calls.filter((call) => call.url.startsWith("https://api.telegram.org/")).length, 0);
  assert.ok(kv.values.has("push:pending-event"), "the coalesced burst is stored for later");

  // ---- Coalesced event is delivered once the window passes ---------------
  const later = githubFetch(BASELINE_FX, {}, HEALTHY);
  const runLater = await runAlertMonitor(env, { fetchImpl: later.fetchImpl, now: () => Date.now() + 7 * 60 * 60 * 1000 });
  assert.equal(runLater.outcome, "delivered", "the deferred burst is delivered after the window");
  assert.equal(later.calls.filter((call) => call.url.startsWith("https://api.telegram.org/")).length, 1);
  assert.equal(kv.values.has("push:pending-event"), false, "the pending slot is cleared after delivery");

  // ---- Unconfigured Telegram stays silent even on a genuine change -------
  const silentKv = new MemoryKv();
  const silent = githubFetch({ ...BASELINE_FX, blackMarket: { USD: { buy: 1_500 } }, blackMarketAsOf: "2026-10-10T10:06:00Z" }, {}, HEALTHY);
  await runAlertMonitor({ PUSH_SUBSCRIPTIONS: silentKv }, { fetchImpl: silent.fetchImpl });
  const silentRun = await runAlertMonitor({ PUSH_SUBSCRIPTIONS: silentKv }, { fetchImpl: silent.fetchImpl });
  assert.equal(silentRun.reason, "no_channel_configured", "no channel configured means no alert work");
  assert.equal(silent.calls.filter((call) => call.url.startsWith("https://api.telegram.org/")).length, 0, "unconfigured Telegram never sends");

  const kvOnly = new MemoryKv();
  const kvOnlyRun = await runAlertMonitor({ PUSH_SUBSCRIPTIONS: kvOnly });
  assert.equal(kvOnlyRun.reason, "no_channel_configured");
  const noKvRun = await runAlertMonitor({ TELEGRAM_BOT_TOKEN: VALID_TOKEN, TELEGRAM_CHAT_ID: VALID_CHAT });
  assert.equal(noKvRun.reason, "no_state_store", "without KV the monitor no-ops instead of failing");
  assert.equal(noKvRun.ran, false);

  // ---- One decision fans out to both channels ----------------------------
  const bothKv = new MemoryKv();
  const vapidKey = await vapid();
  const bothEnv = {
    PUSH_SUBSCRIPTIONS: bothKv,
    VAPID_PRIVATE_JWK: vapidKey.privateJwk,
    VAPID_PUBLIC_KEY: "public-key-not-used-for-signing",
    TELEGRAM_BOT_TOKEN: VALID_TOKEN,
    TELEGRAM_CHAT_ID: VALID_CHAT,
  };
  const subscription = await pushSubscription();
  await handlePushRequestSubscribe(bothKv, subscription);
  await runAlertMonitor(bothEnv, { fetchImpl: githubFetch({ ...BASELINE_FX, blackMarketAsOf: "2026-10-11T10:06:00Z" }, {}, HEALTHY).fetchImpl });
  const both = githubFetch({ ...BASELINE_FX, blackMarket: { USD: { buy: 1_500 } }, blackMarketAsOf: "2026-10-12T10:06:00Z" }, {}, HEALTHY);
  const bothRun = await runAlertMonitor(bothEnv, { fetchImpl: both.fetchImpl });
  assert.equal(bothRun.outcome, "delivered");
  assert.equal(both.calls.filter((call) => call.url.startsWith("https://api.telegram.org/")).length, 1, "Telegram received the shared decision");
  assert.equal(both.calls.filter((call) => call.url.startsWith("https://fcm.googleapis.com/")).length, 1, "Web Push received the same decision");
  assert.equal(bothRun.sent.push, 1);
  assert.equal(bothRun.sent.telegram, true);
  const pushCall = both.calls.find((call) => call.url.startsWith("https://fcm.googleapis.com/"))!;
  const telegramCall = both.calls.find((call) => call.url.startsWith("https://api.telegram.org/"))!;
  assert.equal(pushCall.json, null, "push delivery is encrypted binary, never plain JSON");
  assert.ok(!pushCall.text.includes("1,370"), "push ciphertext never leaks the reading");
  assert.ok(pushCall.text.length > 0, "push encryption produced a body");
  assert.match(telegramCall.json.text, /₦1,370 to ₦1,500/, "both channels describe the same movement");
  assert.match(telegramCall.json.text, /\+₦130/, "both channels report the same delta");

  // ---- Push pagination never duplicates the Telegram message --------------
  const pagedKv = new MemoryKv();
  const pagedEnv = {
    PUSH_SUBSCRIPTIONS: pagedKv,
    VAPID_PRIVATE_JWK: vapidKey.privateJwk,
    VAPID_PUBLIC_KEY: "public-key-not-used-for-signing",
    TELEGRAM_BOT_TOKEN: VALID_TOKEN,
    TELEGRAM_CHAT_ID: VALID_CHAT,
  };
  for (let index = 0; index < 21; index += 1) {
    const entry = await pushSubscription();
    await handlePushRequestSubscribe(pagedKv, { ...entry, endpoint: `https://fcm.googleapis.com/wp/page-${index}` });
  }
  await runAlertMonitor(pagedEnv, { fetchImpl: githubFetch({ ...BASELINE_FX, blackMarketAsOf: "2026-10-11T10:06:00Z" }, {}, HEALTHY).fetchImpl });
  const paged = githubFetch({ ...BASELINE_FX, blackMarket: { USD: { buy: 1_500 } }, blackMarketAsOf: "2026-10-12T10:06:00Z" }, {}, HEALTHY);
  const pageOne = await runAlertMonitor(pagedEnv, { fetchImpl: paged.fetchImpl });
  assert.equal(pageOne.outcome, "coalesced", "more than one page of subscribers defers the rest of the push fan-out");
  const pageTwo = await runAlertMonitor(pagedEnv, { fetchImpl: paged.fetchImpl });
  assert.equal(pageTwo.outcome, "delivered");
  assert.equal(
    paged.calls.filter((call) => call.url.startsWith("https://api.telegram.org/")).length,
    1,
    "Telegram receives one message for the burst, even when push needs several pages",
  );
  assert.equal(paged.calls.filter((call) => call.url.startsWith("https://fcm.googleapis.com/")).length, 21, "every push subscriber is still reached");

  // ---- Owner test endpoint ------------------------------------------------
  const unauthorized = await handleTelegramRequest(new Request("https://example.test/api/telegram/test", { method: "POST" }), {
    TELEGRAM_BOT_TOKEN: VALID_TOKEN, TELEGRAM_CHAT_ID: VALID_CHAT, PUSH_ADMIN_TOKEN: "owner-token",
  });
  assert.equal(unauthorized?.status, 401, "test send is not a public endpoint");

  const notConfiguredFetch = recorder();
  const notConfigured = await handleTelegramRequest(
    new Request("https://example.test/api/telegram/test", { method: "POST", headers: { authorization: "Bearer owner-token" } }),
    { PUSH_ADMIN_TOKEN: "owner-token" },
    { fetchImpl: notConfiguredFetch.fetchImpl },
  );
  assert.equal(notConfigured?.status, 503, "unconfigured test send reports 503 instead of failing");
  assert.deepEqual(await notConfigured!.json(), { error: "telegram_not_configured", reason: "missing_bot_token" });
  assert.equal(notConfiguredFetch.calls.length, 0);

  const testSend = recorder(() => new Response(JSON.stringify({ ok: true, result: { message_id: 1 } }), { status: 200 }));
  const testResponse = await handleTelegramRequest(
    new Request("https://example.test/api/telegram/test", { method: "POST", headers: { authorization: "Bearer owner-token" } }),
    { TELEGRAM_BOT_TOKEN: VALID_TOKEN, TELEGRAM_CHAT_ID: VALID_CHAT, PUSH_ADMIN_TOKEN: "owner-token" },
    { fetchImpl: testSend.fetchImpl },
  );
  assert.equal(testResponse?.status, 200);
  assert.deepEqual(await testResponse!.json(), { delivered: true, status: 200 });
  assert.equal(testSend.calls.length, 1, "the owner test sends exactly one message");
  assert.match(testSend.calls[0].json.text, /test alert/i, "the test message is clearly labelled as a test");
  assert.ok(!testSend.calls[0].text.includes(VALID_TOKEN), "the bot token is never placed in a message body");

  const rejected = recorder(() => new Response(JSON.stringify({ ok: false, description: "chat not found" }), { status: 400 }));
  const rejectedResponse = await handleTelegramRequest(
    new Request("https://example.test/api/telegram/test", { method: "POST", headers: { authorization: "Bearer owner-token" } }),
    { TELEGRAM_BOT_TOKEN: VALID_TOKEN, TELEGRAM_CHAT_ID: VALID_CHAT, PUSH_ADMIN_TOKEN: "owner-token" },
    { fetchImpl: rejected.fetchImpl },
  );
  assert.equal(rejectedResponse?.status, 502, "a Telegram rejection is reported, not thrown");

  const otherPath = await handleTelegramRequest(new Request("https://example.test/api/telegram/other", { method: "POST" }), {});
  assert.equal(otherPath, null, "the handler only claims its own path");

  // ---- ALERT_SITE_URL override (no secrets involved) ---------------------
  const overrideKv = new MemoryKv();
  const overrideEnv = {
    PUSH_SUBSCRIPTIONS: overrideKv,
    TELEGRAM_BOT_TOKEN: VALID_TOKEN,
    TELEGRAM_CHAT_ID: VALID_CHAT,
    ALERT_SITE_URL: "https://naijacheck.nnamdimichael020.workers.dev/status",
  };
  await runAlertMonitor(overrideEnv, { fetchImpl: githubFetch(BASELINE_FX, {}, HEALTHY).fetchImpl });
  const override = githubFetch({ ...BASELINE_FX, blackMarket: { USD: { buy: 1_400 } }, blackMarketAsOf: "2026-10-12T10:06:00Z" }, {}, HEALTHY);
  await runAlertMonitor(overrideEnv, { fetchImpl: override.fetchImpl });
  const overrideText = override.calls.find((call) => call.url.startsWith("https://api.telegram.org/"))!.json.text;
  assert.match(overrideText, /workers\.dev\/status/, "alert links follow the configured production host");
  assert.ok(!overrideText.includes("@naijacheck_alerts"), "chat id is never echoed in a message");

  console.log("Telegram tests passed (shared genuine-change gate, cooldown, no-op when unconfigured, owner test auth, link override).");
}

async function handlePushRequestSubscribe(kv: PushKv, subscription: unknown): Promise<void> {
  const { handlePushRequest } = await import("./push");
  const response = await handlePushRequest(
    new Request("https://example.test/api/push/subscribe", {
      method: "POST",
      headers: { origin: "https://example.test", "content-type": "application/json" },
      body: JSON.stringify(subscription),
    }),
    { PUSH_SUBSCRIPTIONS: kv, VAPID_PUBLIC_KEY: "public", VAPID_PRIVATE_JWK: "private" },
  );
  assert.equal(response?.status, 201, "test setup stores one push subscription");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
