"use strict";
const express = require("express");
const crypto = require("crypto");
const Order = require("../models/Order");
const Shop = require("../models/Shop");
const S = require("../services/security");
const { requireAuth, adminTokenMatches } = require("../middleware/auth");
const { clampNumber, sanitiseLine, sanitiseInvoice, orderToClient } = require("../services/orderUtils");
const router = express.Router();

router.get("/", requireAuth, async (req, res, next) => {
  try {
    let admin = false;

    if (S.isAllowlisted(req.user) && req.get("X-Admin-Token")) {
      const shop = await Shop.findOne({ key: "main" }).select("adminTokenVersion");
      admin = !!(shop && adminTokenMatches(req, req.user, shop));
    }

    const orders = await Order.find(admin ? {} : { owner: req.user._id })
      .sort({ createdAtMs: -1 })
      .limit(500);

    res.set("Cache-Control", "no-store");
    res.json({ orders: orders.map(orderToClient), scope: admin ? "all" : "own" });
  } catch (err) {
    next(err);
  }
});

router.post("/", requireAuth, async (req, res, next) => {
  try {
    const src = (req.body && req.body.order) || {};
    const lines = Array.isArray(src.items) ? src.items.slice(0, 200).map(sanitiseLine) : [];

    if (!lines.length) {
      return res.status(400).json({ error: "empty_order", message: "The basket is empty." });
    }

    const shop = await Shop.findOneAndUpdate(
      { key: "main" },
      { $inc: { orderSeq: 1 } },
      { new: true }
    );
    if (!shop) throw new Error("Shop configuration is missing.");

    const invoiceInput = Object.assign({}, src.invoice || {});
    if (!invoiceInput.name) invoiceInput.name = req.user.name;
    if (!invoiceInput.email && req.user.email) invoiceInput.email = req.user.email;
    if (!invoiceInput.phone && req.user.phone) invoiceInput.phone = req.user.phone;

    const order = await Order.create({
      id: "o_" + crypto.randomBytes(8).toString("base64url"),
      owner: req.user._id,
      token: String(shop.orderSeq).padStart(3, "0"),
      createdAtMs: Date.now(),
      items: lines,
      total: clampNumber(src.total, 0, 1e7, 0),
      mode: src.mode === "drop" ? "drop" : "pickup",
      dateLabel: String(src.dateLabel || "").slice(0, 60),
      slot: String(src.slot || "").slice(0, 60),
      readyBy: String(src.readyBy || "").slice(0, 60),
      addrText: String(src.addrText || "").slice(0, 400),
      paidVia: String(src.paidVia || "").slice(0, 40),
      status: 0,
      invoice: sanitiseInvoice(invoiceInput, lines)
    });

    console.log("[order] %s token %s by %s", order.id, order.token, S.maskUserIdentifier(req.user));
    res.status(201).json({ order: orderToClient(order) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
