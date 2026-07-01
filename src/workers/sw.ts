/* eslint-disable no-restricted-globals */
// TypeScript Service Worker equivalent of public/sw.js
// Note: Browsers load /public/sw.js directly. Keep that JS file for runtime.
// This TS file is for type safety and maintenance.

export {}; // ensure this is treated as a module

declare const self: ServiceWorkerGlobalScope;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event: ExtendableEvent) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event: ExtendableMessageEvent) => {
  const data = (event.data || {}) as {
    type?: string;
    title?: string;
    body?: string;
    icon?: string;
    badge?: string;
    tag?: string;
    data?: unknown;
    requireInteraction?: boolean;
  };
  if (data && data.type === "notify") {
    const {
      title,
      body,
      icon,
      badge,
      tag,
      data: payload,
      requireInteraction,
    } = data;
    event.waitUntil(
      self.registration.showNotification(title || "Notification", {
        body: body || "",
        icon: icon || "/favicon.ico",
        badge: badge || "/favicon.ico",
        tag,
        data: payload,
        requireInteraction: !!requireInteraction,
      }),
    );
  }
});

self.addEventListener("push", (event: PushEvent) => {
  try {
    const payload = event.data ? (event.data.json() as any) : {};
    const { title, body, icon, badge, tag, data } = payload || {};
    event.waitUntil(
      self.registration.showNotification(title || "Notification", {
        body: body || "",
        icon: icon || "/favicon.ico",
        badge: badge || "/favicon.ico",
        tag,
        data,
      }),
    );
  } catch (e) {
    const text = event.data ? event.data.text() : "Notification";
    event.waitUntil(self.registration.showNotification(text));
  }
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const urlFromData = (event.notification as any)?.data?.url as
    | string
    | undefined;
  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        includeUncontrolled: true,
        type: "window",
      });
      const targetUrl = urlFromData || "/";
      for (const client of allClients) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) {
            (client as any).navigate(targetUrl);
          }
          return;
        }
      }
      await self.clients.openWindow(targetUrl);
    })(),
  );
});
