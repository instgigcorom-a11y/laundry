self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data ? event.data.text() : "You have a new order." }; }
  const title = data.title || "Prem Power Laundry";
  const options = {
    body: data.body || "A new laundry order has arrived.",
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    tag: data.tag || "ppl-order",
    renotify: true,
    requireInteraction: true,
    vibrate: [180, 90, 180, 90, 260],
    data: { url: data.url || "/admin/orders" }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/admin/orders", self.location.origin).href;
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
    const match = windows.find((client) => client.url.startsWith(self.location.origin));
    return match ? match.focus().then(() => match.navigate(target)) : clients.openWindow(target);
  }));
});
