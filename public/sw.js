const CACHE = "sisters-shell-v1";
const SHELL = ["/", "/login", "/icon.svg", "/manifest.webmanifest"];
self.addEventListener("install", (event) => event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL))));
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? { title: "Sisters", body: "새 학습 알림이 있어요." };
  event.waitUntil(self.registration.showNotification(data.title, { body: data.body, icon: "/icon.svg", badge: "/icon.svg", data: { url: data.url ?? "/dashboard" } }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data?.url ?? "/dashboard"));
});
