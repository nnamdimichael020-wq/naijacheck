import { buildPushHTTPRequest, type PushSubscription } from "@pushforge/builder";
import {
  ALERT_COOLDOWN_MS,
  alertUrl,
  criticalChange,
  jsonResponse as json,
  type AlertChange,
  type AlertDeps,
  type AlertPayload,
  type CriticalState,
  type FetchLike,
  type FxSnapshot,
  type FuelSnapshot,
  type HealthSnapshot,
} from "./alerts";
import { sendTelegramAlert, telegramConfiguration, type TelegramEnv } from "./telegram";

const SUBSCRIPTION_PREFIX = "push:subscription:";
const STATE_KEY = "push:critical-state";
const PENDING_KEY = "push:pending-event";
const DELIVERY_BATCH_SIZE = 20;
const DEFAULT_DATA_BASE = "https://raw.githubusercontent.com/nnamdimichael020-wq/naijacheck/main/data/live";

/** Re-exported so both channels provably share one decision (see `alerts.ts`). */
export { criticalChange };
export type { AlertChange, AlertPayload };

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

export type PushEnv = TelegramEnv & {
  PUSH_SUBSCRIPTIONS?: PushKv;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_JWK?: string;
  VAPID_SUBJECT?: string;
  PUSH_ADMIN_TOKEN?: string;
  MONITOR_DATA_BASE_URL?: string;
};

type PushPayload = AlertPayload;

type PendingEvent = {
  payload: PushPayload;
  /** Push pagination cursor; present only while more than one page of subscribers is being delivered. */
  cursor?: string;
  notBefore?: string;
  /** Set once Telegram accepted this burst, so a resumed push page can never send it twice. */
  telegramSent?: boolean;
};

/** Result of one monitor run, used by tests and logs to prove channels and gating. */
export type AlertRunSummary = {
  ran: boolean;
  reason?: "no_state_store" | "no_channel_configured";
  channels: { push: boolean; telegram: boolean };
  changed: number;
  sent: { push: number; telegram: boolean };
  outcome: "no_change" | "coalesced" | "delivered" | "skipped";
};

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
      telegramAvailable: telegramConfiguration(env).configured,
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
        url: alertUrl(env),
        changes: [],
      });
      return json({ deliveredToPushService: result.ok, status: result.status }, result.ok ? 200 : 502);
    } catch {
      return json({ error: "invalid_request" }, 400);
    }
  }

  return json({ error: "not_found" }, 404);
}

async function sendPush(env: PushEnv, subscription: PushSubscription, payload: PushPayload, fetchImpl?: FetchLike): Promise<Response> {
  const built = await buildPushHTTPRequest({
    privateJWK: env.VAPID_PRIVATE_JWK!,
    subscription,
    message: {
      payload,
      adminContact: env.VAPID_SUBJECT || "https://naijacheck.ng",
      options: { ttl: 21_600, urgency: "normal", topic: "critical-rates" },
    },
  });
  return (fetchImpl ?? fetch)(built.endpoint, { method: "POST", headers: built.headers, body: built.body });
}

async function fetchSnapshot<T>(url: string, fetchImpl: FetchLike): Promise<T> {
  const response = await fetchImpl(url, { headers: { accept: "application/json", "user-agent": "NaijaCheck-Push-Monitor/1.0" } });
  if (!response.ok) throw new Error(`snapshot_http_${response.status}`);
  return response.json() as Promise<T>;
}

/**
 * One shared delivery pass for every configured channel. Web Push and Telegram
 * receive the same payload produced by the same `criticalChange` decision and
 * the same six-hour cooldown; there is no second, looser alert path.
 */
async function deliverPending(
  env: PushEnv,
  pending: PendingEvent,
  state: CriticalState,
  deps: AlertDeps,
  now: () => number,
): Promise<{ push: number; telegram: boolean; deferred: boolean }> {
  const kv = env.PUSH_SUBSCRIPTIONS!;
  let pushSent = 0;

  // Telegram is a single destination, so it is dispatched alongside the first
  // push page instead of waiting for push pagination to finish hours later.
  const telegramPromise = !pending.telegramSent && telegramConfiguration(env).configured
    ? sendTelegramAlert(env, pending.payload, deps).catch(() => ({ ok: false, status: 0 as number }))
    : null;

  let page: KvListResult<PushSubscription> | null = null;
  if (env.VAPID_PRIVATE_JWK && env.VAPID_PUBLIC_KEY) {
    page = await kv.list<PushSubscription>({ prefix: SUBSCRIPTION_PREFIX, limit: DELIVERY_BATCH_SIZE, cursor: pending.cursor });
    await Promise.all(page.keys.map(async (entry) => {
      const subscription = parseSubscription(entry.metadata);
      if (!subscription) return;
      try {
        const response = await sendPush(env, subscription, pending.payload, deps.fetchImpl);
        if (response.status === 404 || response.status === 410) {
          await kv.delete(entry.name);
          return;
        }
        pushSent += 1;
      } catch {
        // A temporary push-service failure must not delete a valid browser subscription.
      }
    }));
  }

  const telegramResult = telegramPromise ? await telegramPromise : null;

  if (page && !page.list_complete) {
    await kv.put(PENDING_KEY, JSON.stringify({
      ...pending,
      cursor: page.cursor,
      telegramSent: Boolean(pending.telegramSent || telegramResult?.ok),
    }));
    return { push: pushSent, telegram: Boolean(telegramResult?.ok), deferred: true };
  }

  await kv.delete(PENDING_KEY);
  await kv.put(STATE_KEY, JSON.stringify({ ...state, lastEventSentAt: new Date(now()).toISOString() }));
  return { push: pushSent, telegram: Boolean(telegramResult?.ok), deferred: false };
}

/**
 * Scheduled alert monitor. Runs when at least one channel is configured and the
 * KV state store is bound; otherwise it logs why and no-ops. Channel secrets are
 * read from the environment only.
 */
export async function runAlertMonitor(env: PushEnv, deps: AlertDeps = {}): Promise<AlertRunSummary> {
  const now = deps.now ?? (() => Date.now());
  const fetchImpl: FetchLike = deps.fetchImpl ?? ((input, init) => fetch(input, init));
  const kv = env.PUSH_SUBSCRIPTIONS;
  const pushReady = Boolean(kv && env.VAPID_PRIVATE_JWK && env.VAPID_PUBLIC_KEY);
  const telegram = telegramConfiguration(env);
  const summary: AlertRunSummary = {
    ran: false,
    channels: { push: pushReady, telegram: telegram.configured },
    changed: 0,
    sent: { push: 0, telegram: false },
    outcome: "skipped",
  };

  if (!pushReady) console.log("web push not configured; skipping push delivery");
  if (!telegram.configured) console.log(`telegram not configured (${telegram.reason}); skipping telegram delivery`);

  if (!kv) {
    console.log("alert state store unavailable (KV binding missing); no alert sent");
    summary.reason = "no_state_store";
    return summary;
  }
  if (!pushReady && !telegram.configured) {
    summary.reason = "no_channel_configured";
    return summary;
  }

  summary.ran = true;
  const state = (await kv.get(STATE_KEY, { type: "json" }) as CriticalState | null) ?? {};
  const pending = await kv.get(PENDING_KEY, { type: "json" }) as PendingEvent | null;
  if (pending) {
    if (!pending.notBefore || now() >= Date.parse(pending.notBefore)) {
      const delivered = await deliverPending(env, pending, state, { ...deps, fetchImpl }, now);
      summary.sent = { push: delivered.push, telegram: delivered.telegram };
      summary.outcome = delivered.deferred ? "coalesced" : "delivered";
    } else {
      summary.outcome = "coalesced";
    }
    return summary;
  }

  const base = (env.MONITOR_DATA_BASE_URL || DEFAULT_DATA_BASE).replace(/\/$/, "");
  const [fx, fuel, health] = await Promise.all([
    fetchSnapshot<FxSnapshot>(`${base}/fx.json`, fetchImpl),
    fetchSnapshot<FuelSnapshot>(`${base}/fuel.json`, fetchImpl),
    fetchSnapshot<HealthSnapshot>(`${base}/health.json`, fetchImpl),
  ]);
  const change = criticalChange(state, fx, fuel, health);
  await kv.put(STATE_KEY, JSON.stringify(change.state));
  if (!change.payload) {
    summary.outcome = "no_change";
    return summary;
  }
  summary.changed = change.payload.changes.length;

  const payload: PushPayload = { ...change.payload, url: alertUrl(env) };
  const lastSent = state.lastEventSentAt ? Date.parse(state.lastEventSentAt) : 0;
  const cooldownRemaining = Math.max(0, ALERT_COOLDOWN_MS - (now() - lastSent));
  const pendingEvent: PendingEvent = {
    payload,
    ...(cooldownRemaining ? { notBefore: new Date(now() + cooldownRemaining).toISOString() } : {}),
  };
  await kv.put(PENDING_KEY, JSON.stringify(pendingEvent));
  if (cooldownRemaining) {
    summary.outcome = "coalesced";
    return summary;
  }
  const delivered = await deliverPending(env, pendingEvent, change.state, { ...deps, fetchImpl }, now);
  summary.sent = { push: delivered.push, telegram: delivered.telegram };
  // A run that still has push pages left keeps the burst open for the next
  // scheduled run; Telegram is already marked sent for this burst.
  summary.outcome = delivered.deferred ? "coalesced" : "delivered";
  return summary;
}

/** Backwards-compatible name used by the Worker entry point before Telegram existed. */
export const runPushMonitor = runAlertMonitor;
