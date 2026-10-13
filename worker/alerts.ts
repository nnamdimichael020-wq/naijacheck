/**
 * Shared alert core.
 *
 * Every notification channel — Web Push and Telegram — must go through
 * `criticalChange()`. A channel never gets its own, looser rule: there is one
 * decision, and channels only format and deliver its result.
 *
 * The genuine-change gate requires:
 *  - the upstream monitor for that reading to be healthy (`health.*.ok`);
 *  - a *newer* source timestamp than the last stored observation for that
 *    reading (a re-check of the same source time is not a change);
 *  - a real movement: parallel USD buy by at least ₦5, or any change in the
 *    wholesale depot petrol median.
 *
 * The first observation of a reading only establishes a baseline and sends
 * nothing. Delivery (not this module) applies the shared six-hour cooldown.
 */

export const CRITICAL_USD_THRESHOLD_NGN = 5;
export const ALERT_COOLDOWN_MS = 6 * 60 * 60 * 1000;
export const ALERT_PATH = "/status";

/**
 * Fallback used only when `ALERT_SITE_URL` is unset or invalid. `wrangler.jsonc` ships
 * `ALERT_SITE_URL = https://naijacheck.nnamdimichael020.workers.dev/status` as public,
 * committed config so a deploy cannot drop the alert link host.
 */
export const DEFAULT_ALERT_SITE_URL = `https://naijacheck.ng${ALERT_PATH}`;

export type AlertChannelEnv = {
  /** Optional plain-text Worker variable: where alert links should open (no secret). */
  ALERT_SITE_URL?: string;
};

export type CriticalState = {
  parallelUsd?: { value: number; asOf: string };
  depotPetrol?: { value: number; asOf: string };
  lastEventSentAt?: string;
};

/** One genuine movement, described once and rendered per channel. */
export type AlertChange = {
  key: "parallel-usd" | "depot-petrol";
  label: string;
  unit: string;
  from: number;
  to: number;
  delta: number;
  source: string;
  asOf: string;
  /** Sentence used verbatim in Web Push bodies. */
  text: string;
};

export type AlertPayload = {
  title: string;
  body: string;
  source: string;
  asOf: string;
  url: string;
  changes: AlertChange[];
};

export type FxSnapshot = {
  blackMarket?: { USD?: { buy?: number } };
  blackMarketAsOf?: string;
  blackMarketSource?: { label?: string };
};

export type FuelSnapshot = {
  medians?: { petrol?: number };
  asOf?: string;
  source?: { label?: string };
};

export type HealthSnapshot = {
  aboki?: { ok?: boolean };
  awajis?: { ok?: boolean };
};

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type AlertDeps = {
  /** Injectable for tests; defaults to the runtime `fetch`. */
  fetchImpl?: FetchLike;
  /** Injectable clock for tests; defaults to `Date.now`. */
  now?: () => number;
};

/** JSON helper shared by the API handlers so responses stay no-store and full-text safe. */
export function jsonResponse(body: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
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

/** Resolves where alert links should open. Invalid or non-HTTPS values fall back to the canonical path. */
export function alertUrl(env: AlertChannelEnv): string {
  const raw = (env.ALERT_SITE_URL ?? "").trim();
  if (!raw) return DEFAULT_ALERT_SITE_URL;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || !url.hostname) return DEFAULT_ALERT_SITE_URL;
    const path = url.pathname.replace(/\/+$/, "");
    return path ? `${url.origin}${path}` : `${url.origin}${ALERT_PATH}`;
  } catch {
    return DEFAULT_ALERT_SITE_URL;
  }
}

/** Naira text identical to the long-standing push copy (no rounding change). */
export function formatNaira(value: number): string {
  return `₦${value.toLocaleString("en-NG")}`;
}

export function formatDelta(delta: number): string {
  const sign = delta > 0 ? "+" : delta < 0 ? "-" : "±";
  return `${sign}₦${Math.abs(delta).toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;
}

const WAT_FORMAT = new Intl.DateTimeFormat("en-NG", {
  timeZone: "Africa/Lagos",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

/** `10 Oct 2026, 11:06 am WAT (2026-10-10T10:06:00.000Z)`; never invents a time for an unparseable input. */
export function formatSourceTime(asOf: string): string {
  const ms = Date.parse(asOf);
  if (!Number.isFinite(ms)) return asOf;
  let wat: string;
  try {
    wat = WAT_FORMAT.format(new Date(ms));
  } catch {
    wat = new Date(ms).toISOString();
  }
  return `${wat} WAT (${new Date(ms).toISOString()})`;
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function validTimestamp(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

/**
 * The single genuine-change decision. Returns the next state to persist plus a
 * payload only when at least one reading genuinely moved. `payload` is null for
 * a baseline, a flat reading, a re-check of the same source time, a movement
 * below threshold, or an unhealthy/failed monitor.
 */
export function criticalChange(
  previous: CriticalState,
  fx: FxSnapshot,
  fuel: FuelSnapshot,
  health: HealthSnapshot,
): { state: CriticalState; payload: AlertPayload | null } {
  const state: CriticalState = { ...previous };
  const changes: AlertChange[] = [];

  const usd = fx.blackMarket?.USD?.buy;
  if (health.aboki?.ok && finite(usd) && validTimestamp(fx.blackMarketAsOf)) {
    if (
      previous.parallelUsd &&
      previous.parallelUsd.asOf !== fx.blackMarketAsOf &&
      Math.abs(usd - previous.parallelUsd.value) >= CRITICAL_USD_THRESHOLD_NGN
    ) {
      const source = fx.blackMarketSource?.label || "Aboki Forex";
      changes.push({
        key: "parallel-usd",
        label: "Parallel USD buy",
        unit: "/US$",
        from: previous.parallelUsd.value,
        to: usd,
        delta: usd - previous.parallelUsd.value,
        source,
        asOf: fx.blackMarketAsOf,
        text: `Parallel USD buy moved from ₦${previous.parallelUsd.value.toLocaleString("en-NG")} to ₦${usd.toLocaleString("en-NG")}.`,
      });
    }
    state.parallelUsd = { value: usd, asOf: fx.blackMarketAsOf };
  }

  const petrol = fuel.medians?.petrol;
  if (health.awajis?.ok && finite(petrol) && validTimestamp(fuel.asOf)) {
    if (previous.depotPetrol && previous.depotPetrol.asOf !== fuel.asOf && petrol !== previous.depotPetrol.value) {
      const source = fuel.source?.label || "Awajis depot fuel table";
      changes.push({
        key: "depot-petrol",
        label: "Depot petrol median",
        unit: "/L",
        from: previous.depotPetrol.value,
        to: petrol,
        delta: petrol - previous.depotPetrol.value,
        source,
        asOf: fuel.asOf,
        text: `Depot petrol median moved from ₦${previous.depotPetrol.value.toLocaleString("en-NG")}/L to ₦${petrol.toLocaleString("en-NG")}/L.`,
      });
    }
    state.depotPetrol = { value: petrol, asOf: fuel.asOf };
  }

  if (!changes.length) return { state, payload: null };
  const latest = changes.reduce((a, b) => (Date.parse(a.asOf) >= Date.parse(b.asOf) ? a : b));
  return {
    state,
    payload: {
      title: changes.length > 1 ? "Dollar and petrol readings changed" : "Critical price reading changed",
      body: `${changes.map((change) => change.text).join(" ")} Source: ${changes.map((change) => change.source).join("; ")}. As of ${latest.asOf}.`,
      source: changes.map((change) => change.source).join("; "),
      asOf: latest.asOf,
      url: DEFAULT_ALERT_SITE_URL,
      changes,
    },
  };
}
