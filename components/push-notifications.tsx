"use client";

import * as React from "react";

const NOT_NOW_KEY = "naijacheck:push-not-now-until:v1";
const VISITS_KEY = "naijacheck:meaningful-visits:v1";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const SW_TIMEOUT_MS = 12_000;

type PushConfig = { available: boolean; publicKey: string | null };
type State =
  | "checking"
  | "unsupported"
  | "unavailable"
  | "ios-install"
  | "idle"
  | "enabling"
  | "subscribed"
  | "unsubscribing"
  | "denied"
  | "error";

/**
 * Error whose `message` is a stable, machine-mappable code such as `sw_timeout`
 * or `subscribe_failed:503`. `describeCode()` turns codes into actionable text.
 */
class PushError extends Error {
  readonly code: string;
  constructor(code: string) {
    super(code);
    this.name = "PushError";
    this.code = code;
  }
}

function errorCode(error: unknown): string {
  if (error instanceof PushError) return error.code;
  if (error instanceof Error && error.message) return error.message;
  return "unknown_error";
}

type Platform = { isIOS: boolean; isStandalone: boolean };

/**
 * iOS only honours Web Push from an installed Home Screen web app (iOS 16.4+).
 * `navigator.standalone` is the iOS Safari flag; `display-mode: standalone` is
 * the standard check that also covers Chrome Android / desktop PWAs.
 */
function detectPlatform(): Platform {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return { isIOS: false, isStandalone: false };
  }
  const ua = navigator.userAgent || "";
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && (navigator.maxTouchPoints ?? 0) > 1);
  let isStandalone = false;
  try {
    isStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches === true ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
  } catch {
    isStandalone = false;
  }
  return { isIOS, isStandalone };
}

function iosInstallTab(): boolean {
  const { isIOS, isStandalone } = detectPlatform();
  return isIOS && !isStandalone;
}

function supported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function applicationServerKey(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.padEnd(Math.ceil(value.length / 4) * 4, "=").replace(/-/g, "+").replace(/_/g, "/");
  const binary = window.atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function config(): Promise<PushConfig> {
  const response = await fetch("/api/push/config", { cache: "no-store", headers: { accept: "application/json" } });
  if (!response.ok) throw new PushError("config_failed");
  return response.json() as Promise<PushConfig>;
}

async function currentSubscription(): Promise<PushSubscription | null> {
  // Bounded: `ready` can hang forever when registration failed, which would
  // leave the settings UI stuck on "checking".
  const registration = await withTimeout(navigator.serviceWorker.ready, SW_TIMEOUT_MS, "sw_timeout");
  return registration.pushManager.getSubscription();
}

function withTimeout<T>(promise: Promise<T>, ms: number, code: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new PushError(code)), Math.max(0, ms));
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/**
 * Register `/sw.js` and wait — with a ~12s overall budget — until a worker is
 * active for this scope AND controlling this page. Throws `sw_register_failed`
 * when registration itself fails and `sw_timeout` when activation/control
 * never happens in time, so the UI can show a specific, actionable message.
 */
async function ensureServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    throw new PushError("sw_unsupported");
  }
  const deadline = Date.now() + SW_TIMEOUT_MS;
  const timeLeft = () => deadline - Date.now();

  let registration: ServiceWorkerRegistration;
  try {
    registration = await withTimeout(
      navigator.serviceWorker.register("/sw.js", { scope: "/" }),
      timeLeft(),
      "sw_timeout",
    );
  } catch (error) {
    throw new PushError(errorCode(error) === "sw_timeout" ? "sw_timeout" : "sw_register_failed");
  }

  // 1) An active worker for this scope (navigator.serviceWorker.ready resolves only then).
  if (!registration.active) {
    try {
      await withTimeout(navigator.serviceWorker.ready, timeLeft(), "sw_timeout");
    } catch {
      throw new PushError("sw_timeout");
    }
  }
  if (!registration.active) {
    const reloaded = await navigator.serviceWorker.getRegistration().catch(() => undefined);
    if (reloaded?.active) registration = reloaded;
  }
  if (!registration.active) throw new PushError("sw_timeout");

  // 2) This page must be controlled by the worker before we subscribe
  //    (the service worker calls clients.claim() on activate).
  if (!navigator.serviceWorker.controller) {
    await new Promise<void>((resolve) => {
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        window.clearTimeout(timer);
        navigator.serviceWorker.removeEventListener("controllerchange", finish);
        resolve();
      };
      const timer = window.setTimeout(finish, Math.max(0, timeLeft()));
      navigator.serviceWorker.addEventListener("controllerchange", finish);
      if (navigator.serviceWorker.controller) finish();
    });
    if (!navigator.serviceWorker.controller) throw new PushError("sw_timeout");
  }

  return registration;
}

/**
 * Full enable flow. Called ONLY from an explicit Enable click — never on page
 * load. Order: permission → service worker ready → browser subscription →
 * server save. A failed server save unsubscribes a newly created local
 * subscription so the device never holds a subscription the server forgot.
 */
async function subscribe(publicKey: string): Promise<void> {
  if (iosInstallTab()) throw new PushError("ios_install_required");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new PushError(permission === "denied" ? "permission_denied" : "permission_dismissed");
  }

  const registration = await ensureServiceWorker();

  const existing = await registration.pushManager.getSubscription();
  let subscription = existing;
  if (!subscription) {
    try {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey(publicKey),
      });
    } catch {
      throw new PushError("subscribe_browser_failed");
    }
  }

  const serverSave = async (): Promise<void> => {
    let response: Response;
    try {
      response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(subscription!.toJSON()),
        cache: "no-store",
      });
    } catch {
      if (!existing) await subscription!.unsubscribe().catch(() => false);
      throw new PushError("subscribe_failed:network");
    }
    if (!response.ok) {
      if (!existing) await subscription!.unsubscribe().catch(() => false);
      throw new PushError(`subscribe_failed:${response.status}`);
    }
  };
  await serverSave();
}

async function unsubscribe(): Promise<void> {
  const subscription = await currentSubscription();
  if (!subscription) return;
  const response = await fetch("/api/push/unsubscribe", {
    method: "DELETE",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(subscription.toJSON()),
  });
  if (!response.ok) throw new Error("server_clear_failed");
  await subscription.unsubscribe();
}

/** Maps stable error codes to text a user can act on. */
function describeCode(code: string): string {
  if (code === "ios_install_required") {
    return "On iPhone or iPad, alerts only work from the installed app. Tap Share → Add to Home Screen, open NaijaCheck from your home screen, then tap Enable alerts here.";
  }
  if (code === "permission_denied") {
    return "Notifications are blocked for this site. Open your browser's site settings, allow notifications for this page, then tap Enable alerts again.";
  }
  if (code === "permission_dismissed") {
    return "Permission was not granted yet. Tap Enable alerts and choose Allow when the browser asks.";
  }
  if (code === "sw_timeout") {
    return "The offline helper (service worker) did not become ready in time. Refresh the page and tap Enable alerts again.";
  }
  if (code === "sw_register_failed") {
    return "This browser refused to register the offline helper. Leave private/incognito mode, refresh, then tap Enable alerts again.";
  }
  if (code === "sw_unsupported") {
    return "This browser does not support service workers, which background alerts need. Try an up-to-date Chrome, Firefox or Safari.";
  }
  if (code === "subscribe_browser_failed") {
    return "This browser refused to create a push subscription. Close private/incognito tabs, refresh, and try again.";
  }
  if (code === "config_failed") {
    return "Could not load alert configuration. Check your connection and try again.";
  }
  if (code === "subscribe_failed:network") {
    return "No connection to the server, so nothing was saved. The browser subscription was removed again. Reconnect and retry.";
  }
  if (code.startsWith("subscribe_failed:")) {
    const status = code.slice("subscribe_failed:".length);
    if (status === "403") {
      return "The server rejected this page's origin. Refresh and try again. Nothing was kept on this device.";
    }
    if (status === "503") {
      return "The server says alerts are not configured yet. Nothing was kept on this device — try again after the owner finishes setup.";
    }
    return `The server could not save this subscription (HTTP ${status}). Nothing was kept on this device. Try again shortly.`;
  }
  return "Could not enable alerts. Nothing was stored unless the subscription succeeded. Try again.";
}

function usePushState(active: boolean) {
  const [pushConfig, setPushConfig] = React.useState<PushConfig | null>(null);
  const [state, setState] = React.useState<State>(active ? "checking" : "idle");
  const [message, setMessage] = React.useState("");

  React.useEffect(() => {
    if (!active) return;
    const platform = detectPlatform();
    if (platform.isIOS && !platform.isStandalone) {
      // iOS Safari tabs cannot subscribe; guide to the Home Screen app first.
      setState("ios-install");
      return;
    }
    if (!supported()) {
      setState("unsupported");
      return;
    }
    let cancelled = false;
    config()
      .then(async (result) => {
        if (cancelled) return;
        setPushConfig(result);
        if (!result.available || !result.publicKey) {
          setState("unavailable");
          return;
        }
        const subscription = await currentSubscription().catch(() => null);
        if (cancelled) return;
        setState(subscription ? "subscribed" : Notification.permission === "denied" ? "denied" : "idle");
      })
      .catch(() => {
        if (!cancelled) setState("unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, [active]);

  const enable = async () => {
    if (iosInstallTab()) {
      // iOS Safari tab: permission/subscribe cannot succeed here, ever.
      setState("ios-install");
      setMessage(describeCode("ios_install_required"));
      return;
    }
    if (!pushConfig?.publicKey) {
      setState("error");
      setMessage(describeCode("config_failed"));
      return;
    }
    setState("enabling");
    setMessage("");
    try {
      await subscribe(pushConfig.publicKey);
      setState("subscribed");
      setMessage("Alerts are enabled on this browser.");
    } catch (error) {
      const code = errorCode(error);
      if (code === "permission_denied") setState("denied");
      else if (code === "ios_install_required") setState("ios-install");
      else setState("error");
      setMessage(describeCode(code));
    }
  };

  const disable = async () => {
    setState("unsubscribing");
    setMessage("");
    try {
      await unsubscribe();
      setState("idle");
      setMessage("This browser's push subscription was cleared.");
    } catch {
      setState("error");
      setMessage("Could not clear the server subscription. Try again online before removing browser permission.");
    }
  };

  return { state, message, enable, disable };
}

const IOS_INSTALL_TEXT =
  "iPhone & iPad: background alerts only work from the installed app. Tap Share → Add to Home Screen, open NaijaCheck from your home screen, then tap Enable alerts.";

export function PushPrompt() {
  const [open, setOpen] = React.useState(false);
  const push = usePushState(open);

  React.useEffect(() => {
    // Never requests permission here — only decides whether to show the sheet.
    const platform = detectPlatform();
    const iosTab = platform.isIOS && !platform.isStandalone;
    const permission = typeof Notification !== "undefined" ? Notification.permission : "denied";
    if (!iosTab && (!supported() || permission !== "default")) return;
    if (iosTab && permission === "granted") return;
    try {
      if (Number(window.localStorage.getItem(NOT_NOW_KEY) ?? "0") > Date.now()) return;
      if (!window.sessionStorage.getItem("naijacheck:visit-counted")) {
        const visits = Number(window.localStorage.getItem(VISITS_KEY) ?? "0") + 1;
        window.localStorage.setItem(VISITS_KEY, String(visits));
        window.sessionStorage.setItem("naijacheck:visit-counted", "1");
        if (visits >= 2) {
          const quick = window.setTimeout(() => setOpen(true), 8_000);
          return () => window.clearTimeout(quick);
        }
      }
    } catch {
      /* storage may be unavailable */
    }
    const timer = window.setTimeout(() => setOpen(true), 45_000);
    return () => window.clearTimeout(timer);
  }, []);

  React.useEffect(() => {
    if (push.state === "subscribed") {
      const timer = window.setTimeout(() => setOpen(false), 1800);
      return () => window.clearTimeout(timer);
    }
  }, [push.state]);

  if (!open || push.state === "unsupported" || push.state === "unavailable") return null;
  const notNow = () => {
    try {
      window.localStorage.setItem(NOT_NOW_KEY, String(Date.now() + SEVEN_DAYS_MS));
    } catch {
      /* no-op */
    }
    setOpen(false);
  };
  const showInstall = push.state === "ios-install";

  return (
    <aside
      aria-labelledby="push-prompt-title"
      className="fixed inset-x-3 bottom-20 z-50 mx-auto max-w-md rounded-2xl border bg-background p-4 shadow-2xl dark:border-border dark:bg-background lg:bottom-6 lg:right-6 lg:mx-0"
    >
      <button
        type="button"
        aria-label="Close alert invitation"
        onClick={notNow}
        className="absolute right-3 top-2 rounded p-2 text-muted-foreground hover:text-foreground"
      >
        ×
      </button>
      <h2 id="push-prompt-title" className="pr-8 text-base font-bold">
        Get alert when dollar or petrol moves
      </h2>
      {showInstall ? (
        <>
          <p className="mt-1 text-sm text-muted-foreground">{IOS_INSTALL_TEXT}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={notNow} className="rounded-md border px-4 py-2 text-sm font-semibold">
              Not now
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted-foreground">
            Background alerts only when parallel USD moves by at least ₦5 or the depot petrol median changes. At most one alert every six hours.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={push.enable}
              disabled={push.state === "enabling" || push.state === "subscribed" || push.state === "checking"}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {push.state === "enabling" ? "Enabling…" : push.state === "subscribed" ? "Enabled" : "Enable alerts"}
            </button>
            <button type="button" onClick={notNow} className="rounded-md border px-4 py-2 text-sm font-semibold">
              Not now
            </button>
          </div>
        </>
      )}
      {push.message ? (
        <p role="status" className="mt-2 text-xs text-muted-foreground">
          {push.message}
        </p>
      ) : null}
    </aside>
  );
}

export function PushSettings() {
  const push = usePushState(true);
  const showInstall = push.state === "ios-install";
  return (
    <section aria-labelledby="push-settings-title" className="rounded-xl border p-4">
      <h2 id="push-settings-title" className="text-lg font-bold">
        Notification settings
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        The server stores only this browser&apos;s push endpoint and required encryption keys. No name, phone number, precise
        location or watch threshold is attached.
      </p>
      <p className="mt-2 text-sm">
        {showInstall
          ? IOS_INSTALL_TEXT
          : push.state === "checking"
            ? "Checking this browser…"
            : push.state === "subscribed"
              ? "Background alerts are enabled on this browser."
              : push.state === "unavailable"
                ? "Web Push awaits owner configuration. The local page-open watchlist below still works."
                : push.state === "unsupported"
                  ? "This browser does not expose standards-based Web Push. Use the local page-open watchlist below."
                  : push.state === "denied"
                    ? "Notifications are blocked in this browser's site settings."
                    : "Background alerts are not enabled on this browser."}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {push.state === "subscribed" || push.state === "unsubscribing" ? (
          <button
            type="button"
            onClick={push.disable}
            disabled={push.state === "unsubscribing"}
            className="rounded-md border border-destructive px-4 py-2 text-sm font-semibold text-destructive disabled:opacity-60"
          >
            {push.state === "unsubscribing" ? "Clearing…" : "Unsubscribe and clear"}
          </button>
        ) : (
          <button
            type="button"
            onClick={push.enable}
            disabled={["checking", "unavailable", "unsupported", "enabling", "denied", "ios-install"].includes(push.state)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {push.state === "enabling" ? "Enabling…" : showInstall ? "Install to enable" : "Enable alerts"}
          </button>
        )}
      </div>
      {push.message ? (
        <p role="status" className="mt-2 text-xs text-muted-foreground">
          {push.message}
        </p>
      ) : null}
    </section>
  );
}
