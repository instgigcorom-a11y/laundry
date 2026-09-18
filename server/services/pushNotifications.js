"use strict";
const webpush = require("web-push");
const PushSubscription = require("../models/PushSubscription");

const publicKey = String(process.env.VAPID_PUBLIC_KEY || "").trim();
const privateKey = String(process.env.VAPID_PRIVATE_KEY || "").trim();
const subject = String(process.env.VAPID_SUBJECT || "").trim();
let configured = false;
let configurationMessage = "VAPID keys have not been configured on the backend.";

if (publicKey && privateKey && subject) {
  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
  } catch (error) {
    configurationMessage = "VAPID settings are invalid on the backend.";
    console.warn("[push] VAPID is disabled because its configuration is invalid: %s", error.message);
  }
}

function pushConfig() {
  return { enabled: configured, publicKey: configured ? publicKey : "", message: configured ? "" : configurationMessage };
}

async function notifyAdminsOfNewOrder(order) {
  if (!configured) return;
  const subscriptions = await PushSubscription.find().lean();
  if (!subscriptions.length) return;
  const customer = order.deliveryAddress && order.deliveryAddress.name || "Customer";
  const payload = JSON.stringify({
    title: "New laundry order",
    body: `Order #${order.token} from ${customer} - Rs ${Number(order.total || 0).toFixed(2)}`,
    orderId: order.id,
    tag: `order-${order.id}`,
    url: "/admin/orders"
  });
  await deliver(subscriptions, payload);
}

async function deliver(subscriptions, payload) {
  let delivered = 0;
  await Promise.all(subscriptions.map(async (subscription) => {
    try {
      await webpush.sendNotification({ endpoint: subscription.endpoint, keys: subscription.keys }, payload, { TTL: 300, urgency: "high" });
      delivered += 1;
    } catch (error) {
      if (error.statusCode === 404 || error.statusCode === 410) await PushSubscription.deleteOne({ _id: subscription._id });
      else console.warn("[push] delivery failed: %s", error.message);
    }
  }));
  return delivered;
}

async function sendTestNotification(userId) {
  if (!configured) return { delivered: 0, message: configurationMessage };
  const subscriptions = await PushSubscription.find({ user: userId }).lean();
  if (!subscriptions.length) return { delivered: 0, message: "No background-alert subscription was saved for this admin device." };
  const delivered = await deliver(subscriptions, JSON.stringify({
    title: "Prem Power Laundry",
    body: "Background alerts are working on this device.",
    tag: "ppl-push-test",
    url: "/admin/orders"
  }));
  return { delivered, message: delivered ? "" : "The push service could not deliver to this device. Re-enable alerts and allow notifications." };
}

module.exports = { notifyAdminsOfNewOrder, pushConfig, sendTestNotification };
