self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data ? event.data.text() : "You have a new order." }; }
  const title = data.title || "Prem Power Laundry";
  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: "window", includeUncontrolled: true });
    const focusedWindows = windows.filter((client) => client.visibilityState === "visible" && client.focused === true);
    if (focusedWindows.length && !String(data.tag || "").startsWith("ppl-push-test")) {
      focusedWindows.forEach((client) => client.postMessage({ type: "ppl-order-alert", orderId: data.orderId, body: data.body || "A new laundry order has arrived." }));
      return;
    }
    const body = data.body || "A new laundry order has arrived.";
    const target = data.url || "/admin/orders";
    try {
      await self.registration.showNotification(title, {
        body,
        icon: "/prem-power-mark.svg",
        badge: "/prem-power-mark.svg",
        tag: data.tag || `ppl-order-${Date.now()}`,
        silent: false,
        renotify: true,
        requireInteraction: true,
        vibrate: [180, 90, 180, 90, 260],
        timestamp: Date.now(),
        data: { url: target }
      });
    } catch {
      // Some browser/OS combinations reject enhanced notification options.
      await self.registration.showNotification(title, { body, data: { url: target } });
    }
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/admin/orders", self.location.origin).href;
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
    const match = windows.find((client) => client.url.startsWith(self.location.origin));
    return match ? match.focus().then(() => match.navigate(target)) : clients.openWindow(target);
  }));
});
