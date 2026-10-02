// Offline support: the whole app is precached. Bump VERSION on every
// release so devices pick up the new files.
const VERSION = "mt-v20";
const FILES = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "css/style.css",
  "js/app.js",
  "js/celebrate.js",
  "js/crumple.js",
  "js/decor.js",
  "js/envelope.js",
  "js/export.js",
  "js/folder.js",
  "js/ink.js",
  "js/keyboard.js",
  "js/practice.js",
  "js/preview.js",
  "js/texts.js",
  "js/layout.js",
  "js/render.js",
  "js/settings.js",
  "js/sound.js",
  "js/stampdrawer.js",
  "js/storage.js",
  "js/toast.js",
  "fonts/special-elite-latin-400-normal.woff2",
  "icons/apple-touch-icon.png",
  "icons/favicon-32.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache first, falling back to the network (and caching what it returns).
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(
      (hit) =>
        hit ||
        fetch(e.request).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(e.request, copy));
          }
          return res;
        })
    )
  );
});
