"use client";

import * as React from "react";

/**
 * Register the service worker as early as possible so `navigator.serviceWorker.ready`
 * is already satisfied (or near it) when a mobile user taps Enable alerts.
 * Deduplicated across renders/HMR; failures stay silent — push surfaces its own errors.
 */
let swRegistration: Promise<ServiceWorkerRegistration | undefined> | null = null;

function registerServiceWorker(): Promise<ServiceWorkerRegistration | undefined> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return Promise.resolve(undefined);
  swRegistration ??= navigator.serviceWorker
    .register("/sw.js", { scope: "/" })
    .then((registration) => registration)
    .catch(() => undefined);
  return swRegistration;
}

/** Ask the browser for a newer service worker once the page is fully loaded or back online. */
function checkForServiceWorkerUpdate(): void {
  swRegistration
    ?.then((registration) => registration?.update())
    .catch(() => undefined);
}

export function PwaClient() {
  const [offline, setOffline] = React.useState(false);
  React.useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    registerServiceWorker();
    if (document.readyState === "complete") checkForServiceWorkerUpdate();
    else window.addEventListener("load", checkForServiceWorkerUpdate, { once: true });
    const onlineUpdate = () => checkForServiceWorkerUpdate();
    window.addEventListener("online", onlineUpdate);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      window.removeEventListener("online", onlineUpdate);
      window.removeEventListener("load", checkForServiceWorkerUpdate);
    };
  }, []);
  return offline ? (
    <div role="status" className="bg-amber-100 px-4 py-2 text-center text-xs font-semibold text-amber-950">
      Offline: saved pages may contain stale prices or rates. Reconnect before relying on a changing figure.
    </div>
  ) : null;
}
