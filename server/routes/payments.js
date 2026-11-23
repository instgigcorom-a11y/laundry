"use strict";
const express = require("express");
const Order = require("../models/Order");
const Shop = require("../models/Shop");
const { requireAuth } = require("../middleware/auth");
const { orderToClient, orderPaymentAmounts } = require("../services/orderUtils");
const router = express.Router();
router.get("/:orderId", requireAuth, async (req, res, next) => {
  try {
    const order = await Order.findOne({ id: req.params.orderId, owner: req.user._id }); if (!order) return res.status(404).json({ error: "not_found", message: "Order not found." });
    const shop = await Shop.findOne({ key: "main" }); const settings = shop && shop.settings || {};
    const upiId = String(settings.upiId || ""); const merchant = String(settings.upiName || "Prem Power Laundry");
    const { paymentDue: amount } = orderPaymentAmounts(order);
    const qrValue = upiId && amount > 0 ? "upi://pay?pa=" + encodeURIComponent(upiId) + "&pn=" + encodeURIComponent(merchant) + "&am=" + amount.toFixed(2) + "&cu=INR&tn=" + encodeURIComponent("Order " + order.token) : "";
    res.json({ order: orderToClient(order), payment: { status: order.paymentStatus, amount, qrValue, upiId, merchant } });
  } catch (err) { next(err); }
});
router.post("/:orderId/submit", requireAuth, async (req, res, next) => {
  try {
    const order = await Order.findOne({ id: req.params.orderId, owner: req.user._id });
    if (!order) return res.status(404).json({ error: "not_found", message: "Order not found." });
    if (order.paidVia !== "UPI") return res.status(400).json({ error: "not_upi", message: "This order is not set to pay by UPI." });
    const { paymentDue: amount, advanceReceived } = orderPaymentAmounts(order);
    if (order.status === "cancelled" || amount <= 0) return res.status(400).json({ error: "payment_unavailable", message: "There is no UPI payment due on this order." });
    if ((req.body.amount !== undefined && req.body.amount !== amount) ||
        (req.body.advanceReceived !== undefined && req.body.advanceReceived !== advanceReceived)) {
      return res.status(409).json({ error: "payment_changed", message: "The payment has changed. Check the current balance before paying." });
    }
    if (order.paymentStatus === "pending") {
      await Order.updateOne({ _id: order._id, paymentStatus: "pending", status: { $ne: "cancelled" }, verifiedAdvanceAmount: order.verifiedAdvanceAmount ?? { $exists: false } }, { $set: { paymentStatus: "verification_pending" } });
    }
    const updated = await Order.findById(order._id);
    res.json({ order: orderToClient(updated), payment: { status: updated.paymentStatus, amount: orderPaymentAmounts(updated).paymentDue } });
  } catch (err) { next(err); }
});
module.exports = router;
