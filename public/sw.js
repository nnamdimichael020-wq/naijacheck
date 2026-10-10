/* Small, dependency-free offline shell for the static export. */
const CACHE = "naijacheck-shell-v1";
const SHELL = ["/", "/offline.html", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png", "/icon.svg", "/logo.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("naijacheck-") && key !== CACHE).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = {}; }
  const target = (() => {
    try {
      const url = new URL(typeof data.url === "string" ? data.url : "/status", self.location.origin);
      return url.origin === self.location.origin ? `${url.pathname}${url.search}${url.hash}` : "/status";
    } catch { return "/status"; }
  })();
  const title = typeof data.title === "string" ? data.title.slice(0, 120) : "NaijaCheck update";
  const body = typeof data.body === "string" ? data.body.slice(0, 500) : "A monitored dollar or petrol reading changed.";
  event.waitUntil(self.registration.showNotification(title, {
    body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: "naijacheck-critical-rates",
    renotify: true,
    data: { url: target },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/status", self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clients) => {
    const existing = clients.find((client) => new URL(client.url).origin === self.location.origin);
    if (existing) {
      await existing.navigate(target);
      return existing.focus();
    }
    return self.clients.openWindow(target);
  }));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  // Never intercept or cache /api/* (push config/subscribe/unsubscribe, geo, …).
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then((response) => {
      if (response.ok && !url.pathname.startsWith("/api/")) caches.open(CACHE).then((cache) => cache.put(request, response.clone()));
      return response;
    }).catch(async () => (await caches.match(request)) || (await caches.match("/offline.html"))));
    return;
  }

  event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
    if (response.ok && !url.pathname.startsWith("/api/") && ["style", "script", "font", "image"].includes(request.destination)) caches.open(CACHE).then((cache) => cache.put(request, response.clone()));
    return response;
  })));
});
