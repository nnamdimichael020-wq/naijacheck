import { buildPushHTTPRequest, type PushSubscription } from "@pushforge/builder";

const SUBSCRIPTION_PREFIX = "push:subscription:";
const STATE_KEY = "push:critical-state";
const PENDING_KEY = "push:pending-event";
const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
const DELIVERY_BATCH_SIZE = 20;
const DEFAULT_DATA_BASE = "https://raw.githubusercontent.com/nnamdimichael020-wq/naijacheck/main/data/live";
const SITE_URL = "https://naijacheck.ng/status";

export type KvListResult<T> = {
  keys: Array<{ name: string; metadata?: T }>;
  list_complete: boolean;
  cursor?: string;
};

export type PushKv = {
  get(key: string, options?: { type: "json" }): Promise<unknown>;
  put(key: string, value: string, options?: { metadata?: unknown }): Promise<void>;
  delete(key: string): Promise<void>;
  list<T>(options: { prefix: string; limit?: number; cursor?: string }): Promise<KvListResult<T>>;
};

export type PushEnv = {
  PUSH_SUBSCRIPTIONS?: PushKv;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_JWK?: string;
  VAPID_SUBJECT?: string;
  PUSH_ADMIN_TOKEN?: string;
  MONITOR_DATA_BASE_URL?: string;
};

type CriticalState = {
  parallelUsd?: { value: number; asOf: string };
  depotPetrol?: { value: number; asOf: string };
  lastEventSentAt?: string;
};

type PushPayload = {
  title: string;
  body: string;
  source: string;
  asOf: string;
  url: string;
};

type PendingEvent = { payload: PushPayload; cursor?: string; notBefore?: string };

type FxSnapshot = {
  blackMarket?: { USD?: { buy?: number } };
  blackMarketAsOf?: string;
  blackMarketSource?: { label?: string };
};

type FuelSnapshot = {
  medians?: { petrol?: number };
  asOf?: string;
  source?: { label?: string };
};

type HealthSnapshot = {
  aboki?: { ok?: boolean };
  awajis?: { ok?: boolean };
};

function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...extraHeaders,
    },
  });
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return Boolean(origin && origin === new URL(request.url).origin);
}

function validBase64Url(value: string, min: number, max: number): boolean {
  return value.length >= min && value.length <= max && /^[A-Za-z0-9_-]+={0,2}$/.test(value);
}

const PUSH_HOSTS = new Set([
  "fcm.googleapis.com",
  "updates.push.services.mozilla.com",
  "web.push.apple.com",
]);

export function parseSubscription(input: unknown): PushSubscription | null {
  if (!input || typeof input !== "object") return null;
  const candidate = input as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  if (typeof candidate.endpoint !== "string" || candidate.endpoint.length > 2048) return null;
  if (typeof candidate.keys?.p256dh !== "string" || typeof candidate.keys.auth !== "string") return null;
  if (!validBase64Url(candidate.keys.p256dh, 80, 120) || !validBase64Url(candidate.keys.auth, 20, 32)) return null;
  try {
    const endpoint = new URL(candidate.endpoint);
    if (endpoint.protocol !== "https:" || !PUSH_HOSTS.has(endpoint.hostname) || endpoint.username || endpoint.password) return null;
  } catch {
    return null;
  }
  return { endpoint: candidate.endpoint, keys: { p256dh: candidate.keys.p256dh, auth: candidate.keys.auth } };
}

async function subscriptionKey(endpoint: string): Promise<string> {
  const bytes = new TextEncoder().encode(endpoint);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hex = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${SUBSCRIPTION_PREFIX}${hex}`;
}

async function readJsonBody(request: Request): Promise<unknown> {
  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > 8192) throw new Error("request_too_large");
  const text = await request.text();
  if (text.length > 8192) throw new Error("request_too_large");
  return JSON.parse(text);
}

export async function handlePushRequest(request: Request, env: PushEnv): Promise<Response | null> {
  const { pathname } = new URL(request.url);
  if (!pathname.startsWith("/api/push/")) return null;

  if (pathname === "/api/push/config" && request.method === "GET") {
    return json({
      available: Boolean(env.PUSH_SUBSCRIPTIONS && env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_JWK),
      publicKey: env.PUSH_SUBSCRIPTIONS && env.VAPID_PUBLIC_KEY ? env.VAPID_PUBLIC_KEY : null,
    });
  }

  if (pathname === "/api/push/subscribe" && request.method === "POST") {
    if (!sameOrigin(request)) return json({ error: "same_origin_required" }, 403);
    if (!env.PUSH_SUBSCRIPTIONS || !env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_JWK) return json({ error: "push_not_configured" }, 503);
    let subscription: PushSubscription | null;
    try {
      subscription = parseSubscription(await readJsonBody(request));
    } catch (error) {
      return json({ error: error instanceof Error && error.message === "request_too_large" ? error.message : "invalid_json" }, 400);
    }
    if (!subscription) return json({ error: "invalid_subscription" }, 400);
    try {
      const key = await subscriptionKey(subscription.endpoint);
      const stored = JSON.stringify(subscription);
      // The value and list metadata deliberately contain only the Web Push endpoint and its two required encryption keys.
      await env.PUSH_SUBSCRIPTIONS.put(key, stored, { metadata: subscription });
      return json({ subscribed: true }, 201);
    } catch {
      return json({ error: "subscription_storage_unavailable" }, 503);
    }
  }

  if (pathname === "/api/push/unsubscribe" && request.method === "DELETE") {
    if (!sameOrigin(request)) return json({ error: "same_origin_required" }, 403);
    if (!env.PUSH_SUBSCRIPTIONS) return json({ error: "push_not_configured" }, 503);
    let subscription: PushSubscription | null;
    try {
      subscription = parseSubscription(await readJsonBody(request));
    } catch {
      return json({ error: "invalid_json" }, 400);
    }
    if (!subscription) return json({ error: "invalid_subscription" }, 400);
    try {
      await env.PUSH_SUBSCRIPTIONS.delete(await subscriptionKey(subscription.endpoint));
      return json({ unsubscribed: true });
    } catch {
      return json({ error: "subscription_storage_unavailable" }, 503);
    }
  }

  if (pathname === "/api/push/test" && request.method === "POST") {
    if (!env.PUSH_ADMIN_TOKEN || request.headers.get("authorization") !== `Bearer ${env.PUSH_ADMIN_TOKEN}`) {
      return json({ error: "unauthorized" }, 401);
    }
    if (!env.PUSH_SUBSCRIPTIONS || !env.VAPID_PRIVATE_JWK) return json({ error: "push_not_configured" }, 503);
    try {
      const body = await readJsonBody(request) as { endpoint?: unknown };
      if (typeof body.endpoint !== "string") return json({ error: "endpoint_required" }, 400);
      const stored = await env.PUSH_SUBSCRIPTIONS.get(await subscriptionKey(body.endpoint), { type: "json" });
      const subscription = parseSubscription(stored);
      if (!subscription) return json({ error: "subscription_not_found" }, 404);
      const result = await sendPush(env, subscription, {
        title: "NaijaCheck test alert",
        body: "Web Push is configured for this browser. Real alerts are limited to verified dollar or depot petrol changes.",
        source: "NaijaCheck owner test",
        asOf: new Date().toISOString(),
        url: SITE_URL,
      });
      return json({ deliveredToPushService: result.ok, status: result.status }, result.ok ? 200 : 502);
    } catch {
      return json({ error: "invalid_request" }, 400);
    }
  }

  return json({ error: "not_found" }, 404);
}

async function sendPush(env: PushEnv, subscription: PushSubscription, payload: PushPayload): Promise<Response> {
  const built = await buildPushHTTPRequest({
    privateJWK: env.VAPID_PRIVATE_JWK!,
    subscription,
    message: {
      payload,
      adminContact: env.VAPID_SUBJECT || "https://naijacheck.ng",
      options: { ttl: 21_600, urgency: "normal", topic: "critical-rates" },
    },
  });
  return fetch(built.endpoint, { method: "POST", headers: built.headers, body: built.body });
}

async function fetchSnapshot<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { accept: "application/json", "user-agent": "NaijaCheck-Push-Monitor/1.0" } });
  if (!response.ok) throw new Error(`snapshot_http_${response.status}`);
  return response.json() as Promise<T>;
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function validTimestamp(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

export function criticalChange(
  previous: CriticalState,
  fx: FxSnapshot,
  fuel: FuelSnapshot,
  health: HealthSnapshot,
): { state: CriticalState; payload: PushPayload | null } {
  const state: CriticalState = { ...previous };
  const changes: Array<{ text: string; source: string; asOf: string }> = [];

  const usd = fx.blackMarket?.USD?.buy;
  if (health.aboki?.ok && finite(usd) && validTimestamp(fx.blackMarketAsOf)) {
    if (previous.parallelUsd && previous.parallelUsd.asOf !== fx.blackMarketAsOf && Math.abs(usd - previous.parallelUsd.value) >= 5) {
      changes.push({ text: `Parallel USD buy moved from ₦${previous.parallelUsd.value.toLocaleString("en-NG")} to ₦${usd.toLocaleString("en-NG")}.`, source: fx.blackMarketSource?.label || "Aboki Forex", asOf: fx.blackMarketAsOf });
    }
    state.parallelUsd = { value: usd, asOf: fx.blackMarketAsOf };
  }

  const petrol = fuel.medians?.petrol;
  if (health.awajis?.ok && finite(petrol) && validTimestamp(fuel.asOf)) {
    if (previous.depotPetrol && previous.depotPetrol.asOf !== fuel.asOf && petrol !== previous.depotPetrol.value) {
      changes.push({ text: `Depot petrol median moved from ₦${previous.depotPetrol.value.toLocaleString("en-NG")}/L to ₦${petrol.toLocaleString("en-NG")}/L.`, source: fuel.source?.label || "Awajis depot fuel table", asOf: fuel.asOf });
    }
    state.depotPetrol = { value: petrol, asOf: fuel.asOf };
  }

  if (!changes.length) return { state, payload: null };
  const latest = changes.reduce((a, b) => Date.parse(a.asOf) >= Date.parse(b.asOf) ? a : b);
  return {
    state,
    payload: {
      title: changes.length > 1 ? "Dollar and petrol readings changed" : "Critical price reading changed",
      body: `${changes.map((change) => change.text).join(" ")} Source: ${changes.map((change) => change.source).join("; ")}. As of ${latest.asOf}.`,
      source: changes.map((change) => change.source).join("; "),
      asOf: latest.asOf,
      url: SITE_URL,
    },
  };
}

async function deliverPending(env: PushEnv, pending: PendingEvent, state: CriticalState): Promise<void> {
  const kv = env.PUSH_SUBSCRIPTIONS!;
  const page = await kv.list<PushSubscription>({ prefix: SUBSCRIPTION_PREFIX, limit: DELIVERY_BATCH_SIZE, cursor: pending.cursor });
  await Promise.all(page.keys.map(async (entry) => {
    const subscription = parseSubscription(entry.metadata);
    if (!subscription) return;
    try {
      const response = await sendPush(env, subscription, pending.payload);
      if (response.status === 404 || response.status === 410) await kv.delete(entry.name);
    } catch {
      // A temporary push-service failure must not delete a valid browser subscription.
    }
  }));

  if (page.list_complete) {
    await kv.delete(PENDING_KEY);
    await kv.put(STATE_KEY, JSON.stringify({ ...state, lastEventSentAt: new Date().toISOString() }));
  } else {
    await kv.put(PENDING_KEY, JSON.stringify({ ...pending, cursor: page.cursor }));
  }
}

export async function runPushMonitor(env: PushEnv): Promise<void> {
  const kv = env.PUSH_SUBSCRIPTIONS;
  if (!kv || !env.VAPID_PRIVATE_JWK || !env.VAPID_PUBLIC_KEY) return;

  const state = (await kv.get(STATE_KEY, { type: "json" }) as CriticalState | null) ?? {};
  const pending = await kv.get(PENDING_KEY, { type: "json" }) as PendingEvent | null;
  if (pending) {
    if (!pending.notBefore || Date.now() >= Date.parse(pending.notBefore)) await deliverPending(env, pending, state);
    return;
  }

  const base = (env.MONITOR_DATA_BASE_URL || DEFAULT_DATA_BASE).replace(/\/$/, "");
  const [fx, fuel, health] = await Promise.all([
    fetchSnapshot<FxSnapshot>(`${base}/fx.json`),
    fetchSnapshot<FuelSnapshot>(`${base}/fuel.json`),
    fetchSnapshot<HealthSnapshot>(`${base}/health.json`),
  ]);
  const change = criticalChange(state, fx, fuel, health);
  await kv.put(STATE_KEY, JSON.stringify(change.state));
  if (!change.payload) return;

  const lastSent = state.lastEventSentAt ? Date.parse(state.lastEventSentAt) : 0;
  const cooldownRemaining = Math.max(0, SIX_HOURS_MS - (Date.now() - lastSent));
  const pendingEvent: PendingEvent = {
    payload: change.payload,
    ...(cooldownRemaining ? { notBefore: new Date(Date.now() + cooldownRemaining).toISOString() } : {}),
  };
  await kv.put(PENDING_KEY, JSON.stringify(pendingEvent));
  if (!cooldownRemaining) await deliverPending(env, pendingEvent, change.state);
}
