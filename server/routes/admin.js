"use strict";
const express = require("express");
const User = require("../models/User");
const Order = require("../models/Order");
const Item = require("../models/Item");
const AdminInvoice = require("../models/AdminInvoice");
const Customer = require("../models/Customer");
const Shop = require("../models/Shop");
const { DEFAULT_SHOP } = require("../services/bootstrap");
const { makeId, customerSnapshot, invoiceTotals, adminInvoiceToClient } = require("../services/adminUtils");
const { requireAdmin, publicUser } = require("../middleware/auth");
const { orderToClient } = require("../services/orderUtils");
const router = express.Router();

const BILLING_FIELDS = ["businessName", "businessAddress", "businessEmail", "phone", "gstNumber", "businessState", "stateCode", "bankName", "accountHolder", "accountNumber", "ifsc", "upiId", "defaultInvoiceNotes", "defaultInvoiceTerms"];
function billingSettings(input) {
  const src = input && typeof input === "object" ? input : {};
  const out = {};
  BILLING_FIELDS.forEach((field) => { if (src[field] !== undefined) out[field] = String(src[field] || "").trim().slice(0, field === "defaultInvoiceTerms" ? 1000 : 500); });
  return out;
}

async function nextSequence(field) {
  const shop = await Shop.findOneAndUpdate({ key: "main" }, { $inc: { [field]: 1 } }, { new: true }).select(field);
  if (!shop) throw new Error("Shop configuration is missing.");
  return Number(shop[field]);
}

async function ensureOrderInvoice(order, actor, settings) {
  const existing = await AdminInvoice.findOne({ sourceOrderId: order.id });
  if (existing) return existing;
  const owner = order.owner;
  if (!owner) throw new Error("The order customer could not be found.");
  let customer = await Customer.findOne({ $or: [{ phone: owner.phone }, { email: owner.email }] });
  if (!customer) {
    const customerSeq = await nextSequence("customerSeq");
    customer = await Customer.create({
      id: makeId("cust"), code: "CUST-" + String(customerSeq).padStart(4, "0"), name: owner.name,
      phone: owner.phone, email: owner.email, address: order.addrText || "", createdBy: actor._id, updatedBy: actor._id
    });
  }
  const lines = (order.items || []).map((item) => ({ itemId: item.productId || "", itemCode: "", name: item.name, unit: item.unit || "pcs", qty: item.qty, price: item.price, amount: item.subtotal, note: "" }));
  const deliveryCharge = Number(order.invoice && order.invoice.deliveryCharge || 0);
  const totals = invoiceTotals({ lines, extraCharge: Math.max(0, deliveryCharge), discount: Math.max(0, -deliveryCharge), gstPct: 0, adjustment: 0 });
  const invoiceSeq = await nextSequence("invoiceSeq");
  return AdminInvoice.create({
    id: makeId("inv"), number: "INV-" + String(invoiceSeq).padStart(5, "0"), sourceOrderId: order.id,
    customerId: customer.id, customer: customerSnapshot(customer), invoiceDate: order.createdAtMs || Date.now(), lines, ...totals,
    extraChargeLabel: deliveryCharge > 0 ? "Pickup & delivery" : "",
    paid: order.paymentStatus === "paid", note: [String(settings.defaultInvoiceNotes || "").trim(), "Order #" + order.token].filter(Boolean).join(" | ").slice(0, 500),
    terms: String(settings.defaultInvoiceTerms || "").slice(0, 1000), createdBy: actor._id, updatedBy: actor._id
  });
}

router.get("/billing-settings", requireAdmin, async (req, res, next) => {
  try { res.json({ settings: Object.assign({}, DEFAULT_SHOP, req.shop.settings || {}) }); } catch (err) { next(err); }
});
router.put("/billing-settings", requireAdmin, async (req, res, next) => {
  try {
    req.shop.settings = Object.assign({}, DEFAULT_SHOP, req.shop.settings || {}, billingSettings(req.body.settings));
    req.shop.markModified("settings");
    await req.shop.save();
    res.json({ settings: Object.assign({}, DEFAULT_SHOP, req.shop.settings || {}) });
  } catch (err) { next(err); }
});

router.get("/dashboard", requireAdmin, async (req, res, next) => {
  try {
    const [totalCustomers, totalOrders, pendingOrders, completedOrders, revenue] = await Promise.all([
      Customer.countDocuments({ active: true }), Order.countDocuments(), Order.countDocuments({ status: { $in: ["pending", "processing"] } }), Order.countDocuments({ status: "completed" }),
      Order.aggregate([{ $match: { paymentStatus: "paid" } }, { $group: { _id: null, total: { $sum: "$total" } } }])
    ]);
    res.json({ stats: { totalCustomers, totalOrders, pendingOrders, completedOrders, totalRevenue: revenue[0] ? revenue[0].total : 0 } });
  } catch (err) { next(err); }
});
router.get("/users", requireAdmin, async (req, res, next) => { try { const users = await User.find({ role: "customer" }).sort({ createdAt: -1 }).limit(1000); res.json({ users: users.map(publicUser) }); } catch (err) { next(err); } });
router.get("/orders", requireAdmin, async (req, res, next) => { try { const orders = await Order.find().sort({ createdAt: -1 }).limit(1000); res.json({ orders: orders.map(orderToClient) }); } catch (err) { next(err); } });
router.get("/orders/:id/invoice", requireAdmin, async (req, res, next) => {
  try {
    const order = await Order.findOne({ id: req.params.id }).populate("owner");
    if (!order) return res.status(404).json({ error: "not_found", message: "Order not found." });
    const invoice = await ensureOrderInvoice(order, req.user, Object.assign({}, DEFAULT_SHOP, req.shop.settings || {}));
    res.json({ invoice: adminInvoiceToClient(invoice) });
  } catch (err) { next(err); }
});
router.get("/orders/:id", requireAdmin, async (req, res, next) => { try { const order = await Order.findOne({ id: req.params.id }); if (!order) return res.status(404).json({ error: "not_found", message: "Order not found." }); res.json({ order: orderToClient(order) }); } catch (err) { next(err); } });
router.patch("/orders/:id", requireAdmin, async (req, res, next) => {
  try {
    const order = await Order.findOne({ id: req.params.id }); if (!order) return res.status(404).json({ error: "not_found", message: "Order not found." });
    if (["pending", "processing", "completed", "cancelled"].includes(req.body.status)) order.status = req.body.status;
    if (["pending", "verification_pending", "paid"].includes(req.body.paymentStatus)) order.paymentStatus = req.body.paymentStatus;
    await order.save();
    await AdminInvoice.updateOne({ sourceOrderId: order.id }, { $set: { paid: order.paymentStatus === "paid", updatedBy: req.user._id } });
    res.json({ order: orderToClient(order) });
  } catch (err) { next(err); }
});
router.get("/products", requireAdmin, async (req, res, next) => { try { const products = await Item.find().sort({ createdAt: -1 }); res.json({ products }); } catch (err) { next(err); } });
module.exports = router;
