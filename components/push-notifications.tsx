"use client";

import * as React from "react";

const NOT_NOW_KEY = "naijacheck:push-not-now-until:v1";
const VISITS_KEY = "naijacheck:meaningful-visits:v1";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

type PushConfig = { available: boolean; publicKey: string | null };
type State = "checking" | "unsupported" | "unavailable" | "idle" | "enabling" | "subscribed" | "unsubscribing" | "denied" | "error";

function supported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
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
  if (!response.ok) throw new Error("config_failed");
  return response.json() as Promise<PushConfig>;
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

async function subscribe(publicKey: string): Promise<void> {
  // Both permission and subscribe are called only from the Enable button handler.
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error(permission === "denied" ? "permission_denied" : "permission_dismissed");
  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  const subscription = existing ?? await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: applicationServerKey(publicKey),
  });
  const response = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(subscription.toJSON()),
  });
  if (!response.ok) {
    if (!existing) await subscription.unsubscribe().catch(() => false);
    throw new Error("subscribe_failed");
  }
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

function usePushState(active: boolean) {
  const [pushConfig, setPushConfig] = React.useState<PushConfig | null>(null);
  const [state, setState] = React.useState<State>(active ? "checking" : "idle");
  const [message, setMessage] = React.useState("");

  React.useEffect(() => {
    if (!active) return;
    if (!supported()) {
      setState("unsupported");
      return;
    }
    let cancelled = false;
    config().then(async (result) => {
      if (cancelled) return;
      setPushConfig(result);
      if (!result.available || !result.publicKey) setState("unavailable");
      else setState((await currentSubscription()) ? "subscribed" : Notification.permission === "denied" ? "denied" : "idle");
    }).catch(() => !cancelled && setState("unavailable"));
    return () => { cancelled = true; };
  }, [active]);

  const enable = async () => {
    if (!pushConfig?.publicKey) return;
    setState("enabling");
    setMessage("");
    try {
      await subscribe(pushConfig.publicKey);
      setState("subscribed");
      setMessage("Alerts are enabled on this browser.");
    } catch (error) {
      const denied = error instanceof Error && error.message === "permission_denied";
      setState(denied ? "denied" : "error");
      setMessage(denied ? "Notifications are blocked in this browser's site settings." : "Could not enable alerts. Nothing was stored unless subscription succeeded.");
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

export function PushPrompt() {
  const [open, setOpen] = React.useState(false);
  const push = usePushState(open);

  React.useEffect(() => {
    if (!supported() || Notification.permission !== "default") return;
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
    } catch { /* storage may be unavailable */ }
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
    try { window.localStorage.setItem(NOT_NOW_KEY, String(Date.now() + SEVEN_DAYS_MS)); } catch { /* no-op */ }
    setOpen(false);
  };

  return (
    <aside aria-labelledby="push-prompt-title" className="fixed inset-x-3 bottom-20 z-50 mx-auto max-w-md rounded-2xl border bg-background p-4 shadow-2xl lg:bottom-6 lg:right-6 lg:mx-0">
      <button type="button" aria-label="Close alert invitation" onClick={notNow} className="absolute right-3 top-2 rounded p-2 text-muted-foreground hover:text-foreground">×</button>
      <h2 id="push-prompt-title" className="pr-8 text-base font-bold">Get alert when dollar or petrol moves</h2>
      <p className="mt-1 text-sm text-muted-foreground">Background alerts only when parallel USD moves by at least ₦5 or the depot petrol median changes. At most one alert every six hours.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={push.enable} disabled={push.state === "enabling" || push.state === "subscribed"} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          {push.state === "enabling" ? "Enabling…" : push.state === "subscribed" ? "Enabled" : "Enable alerts"}
        </button>
        <button type="button" onClick={notNow} className="rounded-md border px-4 py-2 text-sm font-semibold">Not now</button>
      </div>
      {push.message ? <p role="status" className="mt-2 text-xs text-muted-foreground">{push.message}</p> : null}
    </aside>
  );
}

export function PushSettings() {
  const push = usePushState(true);
  return (
    <section aria-labelledby="push-settings-title" className="rounded-xl border p-4">
      <h2 id="push-settings-title" className="text-lg font-bold">Notification settings</h2>
      <p className="mt-1 text-sm text-muted-foreground">The server stores only this browser&apos;s push endpoint and required encryption keys. No name, phone number, precise location or watch threshold is attached.</p>
      <p className="mt-2 text-sm">
        {push.state === "checking" ? "Checking this browser…" : push.state === "subscribed" ? "Background alerts are enabled on this browser." : push.state === "unavailable" ? "Web Push awaits owner configuration. The local page-open watchlist below still works." : push.state === "unsupported" ? "This browser does not expose standards-based Web Push. Use the local page-open watchlist below." : push.state === "denied" ? "Notifications are blocked in this browser's site settings." : "Background alerts are not enabled on this browser."}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {push.state === "subscribed" || push.state === "unsubscribing" ? (
          <button type="button" onClick={push.disable} disabled={push.state === "unsubscribing"} className="rounded-md border border-destructive px-4 py-2 text-sm font-semibold text-destructive disabled:opacity-60">{push.state === "unsubscribing" ? "Clearing…" : "Unsubscribe and clear"}</button>
        ) : (
          <button type="button" onClick={push.enable} disabled={["checking", "unavailable", "unsupported", "enabling", "denied"].includes(push.state)} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">{push.state === "enabling" ? "Enabling…" : "Enable alerts"}</button>
        )}
      </div>
      {push.message ? <p role="status" className="mt-2 text-xs text-muted-foreground">{push.message}</p> : null}
    </section>
  );
}
