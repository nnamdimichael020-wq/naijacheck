import assert from "node:assert/strict";
import { criticalChange, handlePushRequest, parseSubscription, type PushKv } from "./push";

const validSubscription = {
  endpoint: "https://fcm.googleapis.com/wp/test-browser-endpoint",
  keys: {
    p256dh: "A".repeat(87),
    auth: "B".repeat(22),
  },
};

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
  async list<T>({ prefix }: { prefix: string }): Promise<{ keys: Array<{ name: string; metadata?: T }>; list_complete: boolean }> {
    return {
      keys: [...this.values].filter(([key]) => key.startsWith(prefix)).map(([name, entry]) => ({ name, metadata: entry.metadata as T })),
      list_complete: true,
    };
  }
}

async function run() {
  assert.deepEqual(parseSubscription(validSubscription), validSubscription);
  assert.equal(parseSubscription({ ...validSubscription, endpoint: "http://127.0.0.1/push" }), null, "rejects non-HTTPS/private endpoint");
  assert.equal(parseSubscription({ ...validSubscription, endpoint: "https://example.com/push" }), null, "rejects unrecognised endpoint to prevent SSRF");

  const baseline = criticalChange({}, {
    blackMarket: { USD: { buy: 1_370 } }, blackMarketAsOf: "2026-10-10T07:06:00Z", blackMarketSource: { label: "Aboki" },
  }, {
    medians: { petrol: 1_342.5 }, asOf: "2026-10-09T23:21:00Z", source: { label: "Awajis" },
  }, { aboki: { ok: true }, awajis: { ok: true } });
  assert.equal(baseline.payload, null, "first observation establishes a baseline without alerting");

  const belowThreshold = criticalChange(baseline.state, {
    blackMarket: { USD: { buy: 1_374 } }, blackMarketAsOf: "2026-10-10T10:06:00Z", blackMarketSource: { label: "Aboki" },
  }, {}, { aboki: { ok: true } });
  assert.equal(belowThreshold.payload, null, "parallel USD movement below N5 does not alert");

  const dollarChange = criticalChange(baseline.state, {
    blackMarket: { USD: { buy: 1_375 } }, blackMarketAsOf: "2026-10-10T10:06:00Z", blackMarketSource: { label: "Aboki" },
  }, {}, { aboki: { ok: true } });
  assert.match(dollarChange.payload?.body ?? "", /₦1,370 to ₦1,375/);
  assert.equal(dollarChange.payload?.source, "Aboki");
  assert.equal(dollarChange.payload?.asOf, "2026-10-10T10:06:00Z");

  const unhealthy = criticalChange(baseline.state, {
    blackMarket: { USD: { buy: 2_000 } }, blackMarketAsOf: "2026-10-10T10:06:00Z", blackMarketSource: { label: "Aboki" },
  }, { medians: { petrol: 1_400 }, asOf: "2026-10-10T10:06:00Z" }, { aboki: { ok: false }, awajis: { ok: false } });
  assert.equal(unhealthy.payload, null, "failed monitors cannot fabricate change alerts");

  const fuelChange = criticalChange(baseline.state, {}, {
    medians: { petrol: 1_343 }, asOf: "2026-10-10T10:06:00Z", source: { label: "Awajis" },
  }, { awajis: { ok: true } });
  assert.match(fuelChange.payload?.body ?? "", /Depot petrol median moved/);

  const kv = new MemoryKv();
  const env = { PUSH_SUBSCRIPTIONS: kv, VAPID_PUBLIC_KEY: "public", VAPID_PRIVATE_JWK: "private" };
  const missingOrigin = await handlePushRequest(new Request("https://example.test/api/push/subscribe", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(validSubscription),
  }), env);
  assert.equal(missingOrigin?.status, 403);

  const subscribe = await handlePushRequest(new Request("https://example.test/api/push/subscribe", {
    method: "POST", headers: { origin: "https://example.test", "content-type": "application/json" }, body: JSON.stringify(validSubscription),
  }), env);
  assert.equal(subscribe?.status, 201);
  assert.equal(kv.values.size, 1);
  const stored = [...kv.values.values()][0];
  assert.deepEqual(Object.keys(JSON.parse(stored.value)).sort(), ["endpoint", "keys"], "KV stores no subscriber profile fields");

  const unauthorisedTest = await handlePushRequest(new Request("https://example.test/api/push/test", { method: "POST" }), env);
  assert.equal(unauthorisedTest?.status, 401, "test delivery is not a public send endpoint");

  const unsubscribeResponse = await handlePushRequest(new Request("https://example.test/api/push/unsubscribe", {
    method: "DELETE", headers: { origin: "https://example.test", "content-type": "application/json" }, body: JSON.stringify(validSubscription),
  }), env);
  assert.equal(unsubscribeResponse?.status, 200);
  assert.equal(kv.values.size, 0);

  console.log("Web Push tests passed (validation, genuine-change gates, API storage and auth).");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
