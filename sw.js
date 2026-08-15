const CACHE_NAME = "companion-v3";
const urlsToCache = [
  "/",
  "/index.html",
  "/manifest.json",
  "/assets/sprites/pixel-neutral.svg",
  "/assets/sprites/pixel-happy.svg",
  "/assets/sprites/pixel-sad.svg",
  "/assets/sprites/pixel-angry.svg",
  "/assets/sprites/pixel-surprised.svg",
  "/assets/sprites/pixel-thinking.svg",
  "/assets/sprites/pixel-annoyed.svg",
  "/assets/sprites/pixel-embarrassed.svg",
  "/assets/sprites/pixel-curious.svg",
  "/assets/sprites/pixel-sleepy.svg",
  "/assets/sprites/pixel-excited.svg",
  "/assets/sprites/pixel-chaotic.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache).catch(() => {
        console.log("Some assets failed to cache, will use network");
      });
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  if (event.request.url.includes("/api/")) {
    event.respondWith(
      fetch(event.request)
        .then((response) => response)
        .catch(() => {
          return new Response(
            JSON.stringify({ error: "Offline", fallback: true }),
            { headers: { "Content-Type": "application/json" } }
          );
        })
    );
    return;
  }

  // Navigations go to the network first so an updated app is never masked by
  // a cached shell; the cache is only the offline safety net.
  if (event.request.mode === "navigate" || event.request.destination === "document") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request).then((hit) => hit || caches.match("/index.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) return response;
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      });
    })
  );
});
