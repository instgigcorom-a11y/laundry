"use strict";
const express = require("express");
const crypto = require("crypto");
const Order = require("../models/Order");
const Item = require("../models/Item");
const Shop = require("../models/Shop");
const Customer = require("../models/Customer");
const AdminInvoice = require("../models/AdminInvoice");
const { requireAuth } = require("../middleware/auth");
const { orderToClient } = require("../services/orderUtils");
const { makeId, customerSnapshot, invoiceTotals } = require("../services/adminUtils");
const router = express.Router();

function addressSnapshot(user) {
  return Object.assign({ name: user.name, mobileNumber: user.phone }, user.address && user.address.toObject ? user.address.toObject() : user.address || {});
}

function bookingAddress(input, user) {
  const fallback = addressSnapshot(user);
  const source = input && typeof input === "object" ? input : fallback;
  const line1 = String(source.line1 || "").trim().slice(0, 160);
  const city = String(source.city || "").trim().slice(0, 80);
  const state = String(source.state || "Punjab").trim().slice(0, 80);
  const pincode = String(source.pincode || "").replace(/\D/g, "").slice(0, 6);
  if (!line1 || !city || !/^\d{6}$/.test(pincode)) return null;
  return {
    name: user.name, mobileNumber: user.phone, line1,
    line2: String(source.line2 || "").trim().slice(0, 160), city, state, pincode,
    country: String(source.country || "India").trim().slice(0, 80) || "India",
    label: String(source.label || "Home").trim().slice(0, 24),
    lat: Number.isFinite(Number(source.lat)) ? Number(source.lat) : undefined,
    lng: Number.isFinite(Number(source.lng)) ? Number(source.lng) : undefined
  };
}

function addressText(address) {
  return [address.line1, address.line2, address.city, address.state, address.pincode].filter(Boolean).join(", ");
}

async function nextSequence(field) {
  const shop = await Shop.findOneAndUpdate({ key: "main" }, { $inc: { [field]: 1 } }, { new: true }).select(field);
  if (!shop) throw new Error("Shop configuration is missing.");
  return Number(shop[field]);
}

async function customerForOrder(user, address) {
  let customer = await Customer.findOne({ $or: [{ phone: user.phone }, { email: user.email }] });
  if (customer) return customer;
  const sequence = await nextSequence("customerSeq");
  customer = await Customer.create({
    id: makeId("cust"), code: "CUST-" + String(sequence).padStart(4, "0"),
    name: user.name, phone: user.phone, email: user.email,
    address: address ? addressText(address) : "",
    createdBy: user._id, updatedBy: user._id
  });
  return customer;
}

async function createOrderInvoice(order, user, deliveryCharge, invoiceSettings) {
  const existing = await AdminInvoice.findOne({ sourceOrderId: order.id });
  if (existing) return existing;
  const customer = await customerForOrder(user, order.deliveryAddress);
  const lines = order.items.map((item) => ({
    itemId: item.productId || "", itemCode: "", name: item.name, unit: item.unit || "pcs",
    qty: item.qty, price: item.price, amount: item.subtotal, note: ""
  }));
  const totals = invoiceTotals({
    lines,
    extraCharge: Math.max(0, deliveryCharge),
    discount: Math.max(0, -deliveryCharge),
    gstPct: 0,
    adjustment: 0
  });
  const sequence = await nextSequence("invoiceSeq");
  return AdminInvoice.create({
    id: makeId("inv"), number: "INV-" + String(sequence).padStart(5, "0"), sourceOrderId: order.id,
    customerId: customer.id, customer: customerSnapshot(customer), invoiceDate: order.createdAtMs,
    lines, ...totals, paid: order.paymentStatus === "paid",
    note: [String(invoiceSettings?.defaultInvoiceNotes || "").trim(), "Order #" + order.token].filter(Boolean).join(" | ").slice(0, 500),
    terms: String(invoiceSettings?.defaultInvoiceTerms || "").slice(0, 1000),
    createdBy: user._id, updatedBy: user._id
  });
}

router.get("/", requireAuth, async (req, res, next) => {
  try { const orders = await Order.find({ owner: req.user._id }).sort({ createdAt: -1 }).limit(500); res.json({ orders: orders.map(orderToClient) }); } catch (err) { next(err); }
});
router.get("/:id", requireAuth, async (req, res, next) => {
  try { const order = await Order.findOne({ id: req.params.id, owner: req.user._id }); if (!order) return res.status(404).json({ error: "not_found", message: "Order not found." }); res.json({ order: orderToClient(order) }); } catch (err) { next(err); }
});
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const lines = Array.isArray(req.body.items) ? req.body.items.slice(0, 100) : [];
    if (!lines.length) return res.status(400).json({ error: "empty_order", message: "Your cart is empty." });
    const ids = [...new Set(lines.map((line) => String(line.productId || "").trim()))];
    if (ids.some((id) => !id)) return res.status(400).json({ error: "bad_product", message: "Each cart line must contain a product." });
    const products = await Item.find({ id: { $in: ids }, active: true });
    const productMap = new Map(products.map((product) => [product.id, product]));
    if (productMap.size !== ids.length) return res.status(400).json({ error: "bad_product", message: "One or more products are unavailable." });
    const items = lines.map((line) => {
      const product = productMap.get(String(line.productId)); const quantity = Math.floor(Number(line.quantity));
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) throw Object.assign(new Error("Quantity must be between 1 and 99."), { statusCode: 400 });
      return { productId: product.id, name: product.name, unit: product.unit, qty: quantity, price: product.price, subtotal: Math.round(quantity * product.price * 100) / 100 };
    });
    const mode = req.body.mode === "drop" ? "drop" : "pickup";
    const paidVia = String(req.body.paidVia || "").toLowerCase() === "upi" ? "UPI" : "Cash";
    const dateLabel = String(req.body.dateLabel || "").trim().slice(0, 80);
    const slot = String(req.body.slot || "").trim().slice(0, 80);
    const readyBy = String(req.body.readyBy || "").trim().slice(0, 80);
    if (mode === "pickup" && (!dateLabel || !slot)) return res.status(400).json({ error: "missing_schedule", message: "Please choose a pickup day and time." });
    const shop = await Shop.findOneAndUpdate({ key: "main" }, { $inc: { orderSeq: 1 } }, { new: true });
    if (!shop) throw new Error("Shop configuration is missing.");
    const deliveryAddress = mode === "pickup" ? bookingAddress(req.body.deliveryAddress, req.user) : addressSnapshot(req.user);
    if (mode === "pickup" && !deliveryAddress) return res.status(400).json({ error: "bad_address", message: "Please choose a complete pickup address." });
    const settings = shop.settings || {};
    const itemsTotal = Math.round(items.reduce((sum, item) => sum + item.subtotal, 0) * 100) / 100;
    const pickupFee = Number(settings.pickupFee || 30);
    const freeAbove = Number(settings.freeAbove || 300);
    const dropDiscount = Number(settings.dropDiscount || 20);
    const deliveryCharge = mode === "pickup" ? (itemsTotal >= freeAbove ? 0 : pickupFee) : -dropDiscount;
    const total = Math.max(0, Math.round((itemsTotal + deliveryCharge) * 100) / 100);
    const order = await Order.create({
      id: "ord_" + crypto.randomBytes(8).toString("base64url"), owner: req.user._id,
      token: String(shop.orderSeq).padStart(4, "0"), createdAtMs: Date.now(), items, total,
      mode, dateLabel, slot, readyBy, paidVia, deliveryAddress,
      addrText: mode === "pickup" ? addressText(deliveryAddress) : "Prem Power Laundry, Gurlal Bazar, Amritsar",
      paymentStatus: "pending", status: "pending",
      invoice: { itemsTotal, deliveryCharge, pickupFee, freeAbove, dropDiscount }
    });
    try {
      await createOrderInvoice(order, req.user, deliveryCharge, settings);
    } catch (invoiceError) {
      // An order is only confirmed when its mandatory automatic invoice exists too.
      await Order.deleteOne({ _id: order._id });
      throw invoiceError;
    }
    res.status(201).json({ order: orderToClient(order) });
  } catch (err) { if (err.statusCode) return res.status(err.statusCode).json({ error: "bad_order", message: err.message }); next(err); }
});
module.exports = router;
