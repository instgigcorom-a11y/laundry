"use strict";
const express = require("express");
const Shop = require("../models/Shop");
const Order = require("../models/Order");
const S = require("../services/security");
const { requireAuth, requireAdmin, adminTokenMatches } = require("../middleware/auth");
const { sanitiseInvoice, orderToClient } = require("../services/orderUtils");
const { DEFAULT_SHOP } = require("../services/bootstrap");
const { sanitiseRates } = require("../services/rates");
const router = express.Router();

const SHOP_TEXT = ["phone", "whatsapp", "upiId", "upiName", "upiMc", "qrImage"];
const SHOP_NUM = ["pickupFee", "freeAbove", "dropDiscount", "gstPct", "kgFold", "kgPress", "pressPlain", "pressSteam"];

function sanitiseShop(input) {
  const src = input && typeof input === "object" ? input : {};
  const out = {};

  for (const key of SHOP_TEXT) {
    if (typeof src[key] === "string") {
      out[key] = key === "phone" || key === "whatsapp"
        ? src[key].replace(/\D+/g, "").slice(0, 12)
        : src[key].slice(0, 400000).trim();
    }
  }

  for (const key of SHOP_NUM) {
    if (src[key] !== undefined) {
      const n = Number(src[key]);
      out[key] = Number.isFinite(n) ? Math.max(0, Math.min(1e7, n)) : 0;
    }
  }

  return out;
}

router.get("/status", requireAuth, async (req, res, next) => {
  try {
    const allowed = S.isAllowlisted(req.user);
    const shop = await Shop.findOne({ key: "main" });
    const unlocked = !!(allowed && shop && adminTokenMatches(req, req.user, shop));

    res.set("Cache-Control", "no-store");
    res.json({
      isAdmin: allowed,
      unlocked,
      pinSet: !!(shop && shop.ownerPinHash)
    });
  } catch (err) {
    next(err);
  }
});

router.post("/pin/verify", requireAuth, async (req, res, next) => {
  try {
    if (!S.isAllowlisted(req.user)) {
      return res.status(403).json({
        error: "forbidden",
        message: "This account does not have owner access."
      });
    }

    const now = Date.now();
    const windowMs = 15 * 60 * 1000;

    if (!req.user.pinWindowStart || now - req.user.pinWindowStart.getTime() >= windowMs) {
      req.user.pinWindowStart = new Date(now);
      req.user.pinFailedCount = 0;
    }

    if (req.user.pinFailedCount >= 5) {
      return res.status(429).json({
        error: "locked",
        message: "Too many wrong PINs. Try again later.",
        retryAfterSec: Math.max(1, Math.ceil((windowMs - (now - req.user.pinWindowStart.getTime())) / 1000))
      });
    }

    const shop = await Shop.findOne({ key: "main" });
    if (!shop || !shop.ownerPinHash) {
      return res.status(500).json({ error: "no_pin", message: "No shop PIN is configured." });
    }

    const pin = String(req.body.pin || "").replace(/\D+/g, "");
    if (!S.checkPin(pin, shop.ownerPinHash)) {
      req.user.pinFailedCount += 1;
      await req.user.save();

      if (req.user.pinFailedCount >= 5) {
        return res.status(429).json({
          error: "locked",
          message: "Too many wrong PINs. Try again later.",
          retryAfterSec: 15 * 60
        });
      }

      return res.status(400).json({ error: "pin_wrong", message: "That PIN is not right." });
    }

    req.user.pinFailedCount = 0;
    req.user.pinWindowStart = null;
    await req.user.save();

    const version = Number(shop.adminTokenVersion) || 1;
    res.set("Cache-Control", "no-store");
    res.json({
      adminToken: S.mintAdmin(req.user._id, version),
      expiresInSec: S.ADMIN_TTL_SECONDS
    });
  } catch (err) {
    next(err);
  }
});

router.post("/pin/change", requireAdmin, async (req, res, next) => {
  try {
    const currentPin = String(req.body.currentPin || "").replace(/\D+/g, "");
    const newPin = String(req.body.newPin || "").replace(/\D+/g, "");
    const shop = req.shop;

    if (!shop || !S.checkPin(currentPin, shop.ownerPinHash)) {
      return res.status(400).json({
        error: "pin_wrong",
        message: "The current PIN is not right."
      });
    }

    if (!/^\d{4,8}$/.test(newPin)) {
      return res.status(400).json({
        error: "bad_pin",
        message: "The new PIN must be 4 to 8 digits."
      });
    }

    if (S.checkPin(newPin, shop.ownerPinHash)) {
      return res.status(400).json({
        error: "same_pin",
        message: "Choose a new PIN that is different from the current PIN."
      });
    }

    if (/^(\d)\1+$/.test(newPin) || newPin === "1234" || newPin === "0000") {
      return res.status(400).json({
        error: "weak_pin",
        message: "Choose a less obvious PIN."
      });
    }

    /*
     * Save the new PIN hash and revoke every existing owner/admin step-up
     * token in one MongoDB save. Old PIN verification now fails, and tokens
     * issued before this change fail their version check immediately.
     */
    shop.ownerPinHash = S.hashPin(newPin);
    shop.adminTokenVersion = (Number(shop.adminTokenVersion) || 1) + 1;
    await shop.save();

    console.log("[security] owner PIN changed; previous admin tokens revoked");
    res.set("Cache-Control", "no-store");
    res.json({ ok: true, adminRevoked: true });
  } catch (err) {
    next(err);
  }
});

router.put("/shop", requireAdmin, async (req, res, next) => {
  try {
    const shop = req.shop;
    if (!shop) throw new Error("Shop configuration is missing.");
    shop.settings = Object.assign({}, DEFAULT_SHOP, shop.settings || {}, sanitiseShop(req.body.shop));
    await shop.save();
    res.json({ shop: Object.assign({}, DEFAULT_SHOP, shop.settings || {}) });
  } catch (err) {
    next(err);
  }
});

router.put("/rates", requireAdmin, async (req, res, next) => {
  try {
    const shop = req.shop;
    if (!shop) throw new Error("Shop configuration is missing.");

    shop.rates = sanitiseRates(req.body.rates);
    shop.markModified("rates");
    await shop.save();

    res.set("Cache-Control", "no-store");
    res.json({ rates: sanitiseRates(shop.rates || {}), ratesUpdatedAt: shop.updatedAt });
  } catch (err) {
    next(err);
  }
});

router.patch("/orders/:id/status", requireAdmin, async (req, res, next) => {
  try {
    const status = Number(req.body.status);
    if (!Number.isInteger(status) || status < 0 || status > 5) {
      return res.status(400).json({ error: "bad_status", message: "Unknown order stage." });
    }

    const order = await Order.findOne({ id: req.params.id });
    if (!order) return res.status(404).json({ error: "not_found", message: "That order no longer exists." });

    order.status = status;
    await order.save();
    res.json({ order: orderToClient(order) });
  } catch (err) {
    next(err);
  }
});

router.put("/orders/:id/invoice", requireAdmin, async (req, res, next) => {
  try {
    const order = await Order.findOne({ id: req.params.id });
    if (!order) return res.status(404).json({ error: "not_found", message: "That order no longer exists." });

    order.invoice = sanitiseInvoice(req.body.invoice || {}, order.items || []);
    if (req.body.total !== undefined) {
      const total = Number(req.body.total);
      if (Number.isFinite(total)) order.total = Math.max(0, Math.min(1e7, total));
    }

    await order.save();
    res.json({ order: orderToClient(order) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
