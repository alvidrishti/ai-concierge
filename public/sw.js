/* MAN — Service Worker for offline support (full offline for static assets). */
const CACHE = "man-v1";
const CORE = [
  "/",
  "/manifest.webmanifest",
  "/favicon.svg",
  "/icon.svg",
  "/robots.txt",
  "/llms.txt",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Network-first for navigations (so auth pages stay fresh), cache fallback.
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Never cache API calls (data must stay fresh / auth-protected).
  if (url.pathname.startsWith("/api/")) return;
  // Static assets: cache-first.
  if (url.pathname.startsWith("/_next/static/") || /\.(png|svg|jpg|jpeg|webp|css|js|woff2?)$/.test(url.pathname)) {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }))
    );
    return;
  }
  // Navigations: network-first, fallback to cached page.
  e.respondWith(
    fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy));
      return res;
    }).catch(() => caches.match(req).then((hit) => hit || caches.match("/")))
  );
});
