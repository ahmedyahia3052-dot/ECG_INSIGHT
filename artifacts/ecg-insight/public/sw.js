const CACHE_NAME = "ecg-insight-pwa-v31";
const APP_SHELL = ["/", "/manifest.json", "/offline.html", "/icons/pwa-icon.svg"];

function offlineApiResponse() {
  return new Response(JSON.stringify({
    code: "BACKEND_UNAVAILABLE",
    message: "Backend service unavailable.",
    ok: false,
    status: "offline",
  }), {
    headers: { "content-type": "application/json" },
    status: 503,
    statusText: "Service Unavailable",
  });
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.pathname.startsWith("/api/") || url.pathname === "/health" || url.pathname === "/liveness" || url.pathname === "/readiness") {
    event.respondWith(fetch(request).catch(() => offlineApiResponse()));
    return;
  }
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put("/", clone));
          }
          return response;
        })
        .catch(() => caches.match("/").then((cached) => cached || caches.match("/offline.html"))),
    );
    return;
  }
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok && response.type !== "opaque") {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached || caches.match("/offline.html"));
      return cached || network;
    }),
  );
});

self.addEventListener("sync", (event) => {
  if (event.tag === "ecg-insight-background-sync") {
    event.waitUntil(self.clients.matchAll({ type: "window" }).then((clients) => {
      clients.forEach((client) => client.postMessage({ type: "ECG_BACKGROUND_SYNC" }));
    }));
  }
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
