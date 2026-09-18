"use strict";
const crypto = require("crypto");
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
  return {
    enabled: configured,
    publicKey: configured ? publicKey : "",
    publicKeyFingerprint: configured ? fingerprint(publicKey) : "",
    subject: configured ? subject : "",
    message: configured ? "" : configurationMessage
  };
}

async function pushStatusForUser(userId) {
  const subscriptions = configured ? await PushSubscription.countDocuments({ user: userId }) : 0;
  const devices = configured ? await PushSubscription.find({ user: userId }).sort({ updatedAt: -1 }).limit(5).lean() : [];
  return Object.assign(pushConfig(), {
    subscriptions,
    devices: devices.map((subscription) => ({
      id: String(subscription._id),
      endpointHost: safeEndpointHost(subscription.endpoint),
      endpointTail: String(subscription.endpoint || "").slice(-18),
      updatedAt: subscription.updatedAt
    }))
  });
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
  const failures = [];
  await Promise.all(subscriptions.map(async (subscription) => {
    try {
      await webpush.sendNotification({ endpoint: subscription.endpoint, keys: subscription.keys }, payload, { TTL: 300, urgency: "high" });
      delivered += 1;
    } catch (error) {
      if (error.statusCode === 404 || error.statusCode === 410) await PushSubscription.deleteOne({ _id: subscription._id });
      const failure = { endpointTail: String(subscription.endpoint || "").slice(-18), statusCode: error.statusCode || 0, message: error.message };
      failures.push(failure);
      console.warn("[push] delivery failed for ...%s: %s", failure.endpointTail, error.message);
    }
  }));
  console.log("[push] delivered %d of %d notification(s)", delivered, subscriptions.length);
  return { delivered, failures };
}

async function sendTestNotification(userId) {
  if (!configured) return { delivered: 0, message: configurationMessage };
  const subscriptions = await PushSubscription.find({ user: userId }).lean();
  if (!subscriptions.length) return { delivered: 0, message: "No background-alert subscription was saved for this admin device." };
  const result = await deliver(subscriptions, JSON.stringify({
    title: "Prem Power Laundry",
    body: "Background alerts are working on this device.",
    tag: `ppl-push-test-${Date.now()}`,
    url: "/admin/orders"
  }));
  return {
    delivered: result.delivered,
    failures: result.failures,
    message: result.delivered ? "" : failureMessage(result.failures)
  };
}

function fingerprint(value) {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 12);
}

function safeEndpointHost(endpoint) {
  try { return new URL(endpoint).host; } catch { return "unknown"; }
}

function failureMessage(failures) {
  const first = failures && failures[0];
  if (!first) return "The push service could not deliver to this device. Re-enable alerts and allow notifications.";
  if (first.statusCode === 401 || first.statusCode === 403) return "Push delivery was rejected by the browser service. Update Render with the current VAPID key pair, redeploy, then repair alerts.";
  if (first.statusCode === 404 || first.statusCode === 410) return "This browser subscription expired. Click Repair alerts and test again.";
  return first.message || "The push service could not deliver to this device.";
}

module.exports = { notifyAdminsOfNewOrder, pushConfig, pushStatusForUser, sendTestNotification };
