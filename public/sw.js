/* Service Worker for in-app notifications via postMessage and Web Push (optional) */
/* eslint-disable no-restricted-globals */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Receive messages from pages and show notifications
self.addEventListener("message", (event) => {
  const data = event.data || {};
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

// Optional: handle Web Push payloads
self.addEventListener("push", (event) => {
  try {
    const payload = event.data ? event.data.json() : {};
    const { title, body, icon, badge, tag, data } = payload;
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
    // Fallback to text
    const text = event.data ? event.data.text() : "Notification";
    event.waitUntil(self.registration.showNotification(text));
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const urlFromData = event.notification?.data?.url;
  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        includeUncontrolled: true,
        type: "window",
      });
      const targetUrl = urlFromData || "/";
      for (const client of allClients) {
        if ("focus" in client) {
          client.focus();
          if ("navigate" in client) {
            client.navigate(targetUrl);
          }
          return;
        }
      }
      await self.clients.openWindow(targetUrl);
    })(),
  );
});
