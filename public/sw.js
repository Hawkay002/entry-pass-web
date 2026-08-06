// public/sw.js — service worker for Entry Pass.
// Strategies:
//   - Static assets (_next/static, fonts, icons): network-first with cache
//     fallback (ensures latest code on every deploy; works offline)
//   - Navigations (HTML): network-first, fall back to cached shell when offline
//   - API + everything else: network-only (never cache dynamic data)
//
// No workbox dependency. Kept intentionally small.

const CACHE_VERSION = "entry-pass-v3";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const PAGES_CACHE = `${CACHE_VERSION}-pages`;
const OFFLINE_URL = "/"; // landing shell used as the offline fallback

const PRECACHE = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/success.mp3",
  "/error.mp3",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => !k.startsWith(CACHE_VERSION))
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GET.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Same-origin only (let cross-origin requests pass through).
  if (url.origin !== self.location.origin) return;

  // Never intercept API calls or Next.js data/mutations.
  if (url.pathname.startsWith("/api/")) return;

  // HTML navigations: network-first with offline fallback.
  if (request.mode === "navigate" || request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(PAGES_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match(OFFLINE_URL))
        )
    );
    return;
  }

  // Static assets (_next/static, fonts, images, audio): network-first with
  // cache fallback. This ensures the latest code is always served on deploys
  // while still working offline. (Cache-first caused stale-JS breakage.)
  const isStaticAsset =
    url.pathname.startsWith("/_next/static/") ||
    /\.(?:js|css|woff2?|ttf|otf|png|jpg|jpeg|gif|webp|svg|ico|mp3|wav)$/.test(url.pathname) ||
    url.pathname === "/manifest.webmanifest";

  if (isStaticAsset) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Everything else: default browser behavior (network-only).
});
