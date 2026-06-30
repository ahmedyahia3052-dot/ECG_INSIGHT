const CACHE_NAME = "ecg-insight-pwa-v32";
const APP_SHELL = ["/", "/manifest.json", "/offline.html", "/icons/pwa-icon.svg"];
const API_BYPASS_PREFIXES = ["/api/", "/auth/", "/copilot/", "/patients/", "/ecg/"];
const API_BYPASS_PATHS = ["/health", "/liveness", "/readiness"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("ecg-insight-pwa-") && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.searchParams.get("disableOffline") === "true") {
    console.info("[SW FETCH] disableOffline bypass", url.href);
    event.respondWith(fetch(request));
    return;
  }
  if (API_BYPASS_PATHS.includes(url.pathname) || API_BYPASS_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
    console.info("[SW FETCH] API bypass", url.pathname);
    return;
  }
  if (request.mode === "navigate") {
    console.info("[SW FETCH] navigation", url.pathname);
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
  console.info("[SW FETCH] asset", url.pathname);
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
