/* eslint-disable no-restricted-globals */
const VERSION = "ws-pwa-v2";
const OFFLINE_URL = "/offline";
const SHELL_CACHE = `${VERSION}:shell`;
const RUNTIME_CACHE = `${VERSION}:runtime`;

const PRECACHE_URLS = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png",
  "/apple-touch-icon.png",
  "/tlogo.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheKeys = await caches.keys();
      await Promise.all(
        cacheKeys
          .filter((key) => !key.startsWith(VERSION))
          .map((staleKey) => caches.delete(staleKey)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

function parsePushPayload(event) {
  if (!event.data) {
    return {};
  }

  try {
    return event.data.json();
  } catch {
    try {
      return { body: event.data.text() };
    } catch {
      return {};
    }
  }
}

function shouldHandleRequest(request) {
  if (request.method !== "GET") return false;
  const url = new URL(request.url);
  return url.origin === self.location.origin;
}

function isStaticAsset(pathname) {
  return /\.(?:js|css|png|jpg|jpeg|svg|webp|gif|ico|woff2?)$/i.test(pathname);
}

self.addEventListener("push", (event) => {
  const payload = parsePushPayload(event);
  const title =
    typeof payload.title === "string" && payload.title.trim()
      ? payload.title.trim()
      : "Wheat & Stone";
  const body =
    typeof payload.body === "string" && payload.body.trim()
      ? payload.body.trim()
      : "New update is available.";

  const notificationOptions = {
    body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data:
      payload && typeof payload.data === "object" && payload.data
        ? payload.data
        : {},
  };

  event.waitUntil(self.registration.showNotification(title, notificationOptions));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const payloadData =
    event.notification?.data && typeof event.notification.data === "object"
      ? event.notification.data
      : {};
  const targetUrl =
    typeof payloadData.url === "string" && payloadData.url.trim()
      ? payloadData.url.trim()
      : "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if ("focus" in client && client.url === targetUrl) {
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }

      return undefined;
    }),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (!shouldHandleRequest(request)) return;

  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(request);
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(request, networkResponse.clone());
          return networkResponse;
        } catch {
          const cachedPage = await caches.match(request);
          if (cachedPage) return cachedPage;
          const offlinePage = await caches.match(OFFLINE_URL);
          if (offlinePage) return offlinePage;
          return Response.error();
        }
      })(),
    );
    return;
  }

  if (!isStaticAsset(url.pathname)) {
    return;
  }

  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) return cached;

      try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      } catch {
        return cached || Response.error();
      }
    })(),
  );
});
