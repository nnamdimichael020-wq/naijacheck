"use client";

import * as React from "react";

export function PwaClient() {
  const [offline, setOffline] = React.useState(false);
  React.useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return offline ? (
    <div role="status" className="bg-amber-100 px-4 py-2 text-center text-xs font-semibold text-amber-950">
      Offline: saved pages may contain stale prices or rates. Reconnect before relying on a changing figure.
    </div>
  ) : null;
}
