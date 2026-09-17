"use strict";
const webpush = require("web-push");
const PushSubscription = require("../models/PushSubscription");

const publicKey = String(process.env.VAPID_PUBLIC_KEY || "").trim();
const privateKey = String(process.env.VAPID_PRIVATE_KEY || "").trim();
const subject = String(process.env.VAPID_SUBJECT || "").trim();
let configured = false;

if (publicKey && privateKey && subject) {
  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
  } catch (error) {
    console.warn("[push] VAPID is disabled because its configuration is invalid: %s", error.message);
  }
}

function pushConfig() {
  return { enabled: configured, publicKey: configured ? publicKey : "" };
}

async function notifyAdminsOfNewOrder(order) {
  if (!configured) return;
  const subscriptions = await PushSubscription.find().lean();
  if (!subscriptions.length) return;
  const customer = order.deliveryAddress && order.deliveryAddress.name || "Customer";
  const payload = JSON.stringify({
    title: "New laundry order",
    body: `Order #${order.token} from ${customer} - Rs ${Number(order.total || 0).toFixed(2)}`,
    tag: `order-${order.id}`,
    url: "/admin/orders"
  });
  await Promise.all(subscriptions.map(async (subscription) => {
    try {
      await webpush.sendNotification({ endpoint: subscription.endpoint, keys: subscription.keys }, payload, { TTL: 300, urgency: "high" });
    } catch (error) {
      if (error.statusCode === 404 || error.statusCode === 410) await PushSubscription.deleteOne({ _id: subscription._id });
      else console.warn("[push] delivery failed: %s", error.message);
    }
  }));
}

module.exports = { notifyAdminsOfNewOrder, pushConfig };
