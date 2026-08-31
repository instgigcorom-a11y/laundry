"use strict";
const webpush = require("web-push");
function configurePush() {
  const subject = String(process.env.VAPID_SUBJECT || "").trim();
  const publicKey = String(process.env.VAPID_PUBLIC_KEY || "").trim();
  const privateKey = String(process.env.VAPID_PRIVATE_KEY || "").trim();
  if (!subject || !publicKey || !privateKey) throw new Error("VAPID_SUBJECT, VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY are required.");
  webpush.setVapidDetails(subject, publicKey, privateKey);
}
async function sendPushToUser(user, payload) {
  const dead = new Set(); let delivered = 0;
  for (const sub of user.pushSubscriptions || []) {
    const plain = typeof sub.toObject === "function" ? sub.toObject() : sub;
    try { await webpush.sendNotification(plain, JSON.stringify(payload), { TTL: 120 }); delivered += 1; }
    catch (err) {
      if (err && (err.statusCode === 404 || err.statusCode === 410)) dead.add(sub.endpoint);
      else console.error("[push] %s", err && err.message ? err.message : err);
    }
  }
  if (dead.size) { user.pushSubscriptions = (user.pushSubscriptions || []).filter((sub) => !dead.has(sub.endpoint)); await user.save(); }
  return delivered;
}
module.exports = { configurePush, sendPushToUser };
