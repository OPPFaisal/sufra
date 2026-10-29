const CACHE = "sufra-v1";
const SHELL = ["./", "./index.html", "./lib.js", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-180.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  // App shell + CDN libs: cache-first, refresh in background
  const isShell = url.origin === location.origin || url.hostname === "cdnjs.cloudflare.com" || url.hostname === "unpkg.com" || url.hostname.endsWith("gstatic.com") || url.hostname.endsWith("googleapis.com");
  if (isShell) {
    e.respondWith(caches.match(e.request).then(hit => {
      const fetching = fetch(e.request).then(res => { if (res && res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone())); return res; }).catch(() => hit);
      return hit || fetching;
    }));
    return;
  }
  // Food APIs: network-first, fall back to cache for repeat barcodes offline
  if (url.hostname.endsWith("openfoodfacts.org") || url.hostname.endsWith("usda.gov")) {
    e.respondWith(fetch(e.request).then(res => { if (res && res.ok) caches.open(CACHE + "-api").then(c => c.put(e.request, res.clone())); return res; }).catch(() => caches.match(e.request)));
  }
});
