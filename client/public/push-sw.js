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
    const visibleWindows = windows.filter((client) => client.visibilityState === "visible");
    if (visibleWindows.length && !String(data.tag || "").startsWith("ppl-push-test")) {
      visibleWindows.forEach((client) => client.postMessage({ type: "ppl-order-alert", orderId: data.orderId, body: data.body || "A new laundry order has arrived." }));
      return;
    }
    await self.registration.showNotification(title, {
      body: data.body || "A new laundry order has arrived.",
      icon: "/prem-power-mark.svg",
      badge: "/prem-power-mark.svg",
      tag: data.tag || "ppl-order",
      silent: false,
      renotify: true,
      requireInteraction: true,
      vibrate: [180, 90, 180, 90, 260],
      data: { url: data.url || "/admin/orders" }
    });
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
