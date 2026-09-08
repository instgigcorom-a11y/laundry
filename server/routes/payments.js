"use strict";
const express = require("express");
const Order = require("../models/Order");
const Shop = require("../models/Shop");
const { requireAuth } = require("../middleware/auth");
const { orderToClient } = require("../services/orderUtils");
const router = express.Router();
router.get("/:orderId", requireAuth, async (req, res, next) => {
  try {
    const order = await Order.findOne({ id: req.params.orderId, owner: req.user._id }); if (!order) return res.status(404).json({ error: "not_found", message: "Order not found." });
    const shop = await Shop.findOne({ key: "main" }); const settings = shop && shop.settings || {};
    const upiId = String(settings.upiId || ""); const merchant = String(settings.upiName || "Prem Power Laundry");
    const qrValue = upiId ? "upi://pay?pa=" + encodeURIComponent(upiId) + "&pn=" + encodeURIComponent(merchant) + "&am=" + encodeURIComponent(order.total.toFixed(2)) + "&cu=INR&tn=" + encodeURIComponent("Order " + order.token) : "Order " + order.token + " - Rs " + order.total;
    res.json({ order: orderToClient(order), payment: { status: order.paymentStatus, amount: order.total, qrValue, upiId, merchant } });
  } catch (err) { next(err); }
});
router.post("/:orderId/submit", requireAuth, async (req, res, next) => {
  try {
    const order = await Order.findOne({ id: req.params.orderId, owner: req.user._id });
    if (!order) return res.status(404).json({ error: "not_found", message: "Order not found." });
    if (order.paidVia !== "UPI") return res.status(400).json({ error: "not_upi", message: "This order is not set to pay by UPI." });
    if (order.paymentStatus === "pending") { order.paymentStatus = "verification_pending"; await order.save(); }
    res.json({ order: orderToClient(order), payment: { status: order.paymentStatus, amount: order.total } });
  } catch (err) { next(err); }
});
module.exports = router;
