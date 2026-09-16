"use strict";
const express = require("express");
const Customer = require("../models/Customer");
const Item = require("../models/Item");
const AdminInvoice = require("../models/AdminInvoice");
const Shop = require("../models/Shop");
const { requireAdmin } = require("../middleware/auth");
const {
  makeId,
  customerSnapshot,
  sanitiseCustomer,
  sanitiseItem,
  sanitiseInvoiceLine,
  invoiceTotals,
  customerToClient,
  itemToClient,
  adminInvoiceToClient
} = require("../services/adminUtils");
const S = require("../services/security");

const router = express.Router();

function duplicateError(err, fallbackKey) {
  const key = (err && err.keyPattern && Object.keys(err.keyPattern)[0]) || fallbackKey || "field";
  if (key === "email") return { status: 409, error: "email_exists", message: "That email is already used by another customer." };
  if (key === "phone") return { status: 409, error: "phone_exists", message: "That mobile number is already used by another customer." };
  if (key === "code") return { status: 409, error: "code_exists", message: "That code already exists. Please try again." };
  if (key === "number") return { status: 409, error: "invoice_exists", message: "That invoice number already exists. Please try again." };
  return { status: 409, error: "duplicate", message: "That record already exists." };
}

async function nextSequence(field, fallbackStart) {
  const shop = await Shop.findOneAndUpdate(
    { key: "main" },
    { $inc: { [field]: 1 } },
    { new: true }
  ).select(field);

  if (!shop) throw new Error("Shop configuration is missing.");
  const value = Number(shop[field]);
  return Number.isInteger(value) && value > 0 ? value : fallbackStart;
}

async function buildAdminInvoicePayload(input, currentInvoice, shopSettings) {
  const src = input && typeof input === "object" ? input : {};
  const current = currentInvoice || null;
  const customerId = String(
    src.customerId || (current && current.customerId) || ""
  ).trim();

  let customer = null;
  if (customerId) customer = await Customer.findOne({ id: customerId });
  if (!customer && (!current || customerId !== current.customerId)) {
    const err = new Error("Select a valid customer before saving the invoice.");
    err.statusCode = 400;
    err.clientError = "bad_customer";
    throw err;
  }

  const lineInputs = Array.isArray(src.lines) ? src.lines.slice(0, 200) : [];
  if (!lineInputs.length) {
    const err = new Error("Add at least one item to the invoice.");
    err.statusCode = 400;
    err.clientError = "empty_invoice";
    throw err;
  }

  const itemIds = [...new Set(lineInputs.map((line) => String(line && line.itemId || "").trim()).filter(Boolean))];
  const itemDocs = itemIds.length ? await Item.find({ id: { $in: itemIds } }) : [];
  const itemMap = new Map(itemDocs.map((item) => [item.id, item]));
  const currentLines = current && Array.isArray(current.lines) ? current.lines : [];

  const lines = lineInputs.map((line, index) => {
    const fallbackLine = currentLines[index] || null;
    const requestedItemId = String(
      (line && line.itemId) || (fallbackLine && fallbackLine.itemId) || ""
    ).trim();
    const itemDoc = requestedItemId ? itemMap.get(requestedItemId) : null;

    if (requestedItemId && !itemDoc && !(fallbackLine && fallbackLine.itemId === requestedItemId)) {
      const err = new Error("One of the selected items no longer exists.");
      err.statusCode = 400;
      err.clientError = "bad_item";
      throw err;
    }

    const cleaned = sanitiseInvoiceLine(line, fallbackLine, itemDoc);
    if (!cleaned.name) {
      const err = new Error("Each invoice line needs an item name.");
      err.statusCode = 400;
      err.clientError = "bad_line";
      throw err;
    }
    return cleaned;
  });

  const totals = invoiceTotals({
    lines,
    discount: src.discount,
    extraCharge: src.extraCharge,
    gstPct: src.gstPct == null ? shopSettings.gstPct : src.gstPct,
    adjustment: src.adjustment
  });
  const extraChargeLabel = String(src.extraChargeLabel ?? (current && current.extraChargeLabel) ?? "").trim().slice(0, 120);
  if (totals.extraCharge > 0 && !extraChargeLabel) {
    const err = new Error("Add a description for the extra charge.");
    err.statusCode = 400;
    err.clientError = "missing_extra_charge_description";
    throw err;
  }

  return {
    customerId,
    customer: customer ? customerSnapshot(customer) : (current && current.customer) || {},
    invoiceDate: Number(src.invoiceDate) || (current && current.invoiceDate) || Date.now(),
    lines,
    subtotal: totals.subtotal,
    discount: totals.discount,
    extraCharge: totals.extraCharge,
    extraChargeLabel,
    gstPct: totals.gstPct,
    gstAmount: totals.gstAmount,
    adjustment: totals.adjustment,
    total: totals.total,
    paid: src.paid === undefined ? !!(current && current.paid) : !!src.paid,
    note: String(src.note || (current && current.note) || "").trim().slice(0, 500),
    terms: String(src.terms || (current && current.terms) || "").trim().slice(0, 1000)
  };
}

router.get("/customers", requireAdmin, async (req, res, next) => {
  try {
    const customers = await Customer.find({}).sort({ createdAt: -1 }).limit(1000);
    res.set("Cache-Control", "no-store");
    res.json({ customers: customers.map(customerToClient) });
  } catch (err) {
    next(err);
  }
});

router.post("/customers", requireAdmin, async (req, res, next) => {
  try {
    const src = sanitiseCustomer(req.body.customer || {});
    if (!src.name) {
      return res.status(400).json({ error: "bad_name", message: "Please enter the customer name." });
    }
    if (src.email && !S.validEmail(src.email)) {
      return res.status(400).json({ error: "bad_email", message: "Enter a valid email address." });
    }
    if (src.phone && !S.validPhone(src.phone)) {
      return res.status(400).json({ error: "bad_mobile", message: "Enter a valid 10-digit Indian mobile number." });
    }

    const seq = await nextSequence("customerSeq", 1);
    const customer = await Customer.create(Object.assign({}, src, {
      id: makeId("cust"),
      code: "CUST-" + String(seq).padStart(4, "0"),
      createdBy: req.user._id,
      updatedBy: req.user._id
    }));

    res.status(201).json({ customer: customerToClient(customer) });
  } catch (err) {
    if (err && err.code === 11000) {
      const x = duplicateError(err);
      return res.status(x.status).json({ error: x.error, message: x.message });
    }
    next(err);
  }
});

router.put("/customers/:id", requireAdmin, async (req, res, next) => {
  try {
    const customer = await Customer.findOne({ id: req.params.id });
    if (!customer) return res.status(404).json({ error: "not_found", message: "That customer no longer exists." });

    const src = sanitiseCustomer(req.body.customer || {});
    if (!src.name) {
      return res.status(400).json({ error: "bad_name", message: "Please enter the customer name." });
    }
    if (src.email && !S.validEmail(src.email)) {
      return res.status(400).json({ error: "bad_email", message: "Enter a valid email address." });
    }
    if (src.phone && !S.validPhone(src.phone)) {
      return res.status(400).json({ error: "bad_mobile", message: "Enter a valid 10-digit Indian mobile number." });
    }

    Object.assign(customer, src, { updatedBy: req.user._id });
    await customer.save();

    await AdminInvoice.updateMany(
      { customerId: customer.id },
      { $set: { customer: customerSnapshot(customer), updatedBy: req.user._id } }
    );

    res.json({ customer: customerToClient(customer) });
  } catch (err) {
    if (err && err.code === 11000) {
      const x = duplicateError(err);
      return res.status(x.status).json({ error: x.error, message: x.message });
    }
    next(err);
  }
});

router.delete("/customers/:id", requireAdmin, async (req, res, next) => {
  try {
    const customer = await Customer.findOne({ id: req.params.id });
    if (!customer) return res.status(404).json({ error: "not_found", message: "That customer no longer exists." });

    await Promise.all([
      Customer.deleteOne({ _id: customer._id }),
      AdminInvoice.updateMany(
        { customerId: customer.id },
        { $set: { customerId: "", updatedBy: req.user._id } }
      )
    ]);

    res.json({ ok: true, id: customer.id });
  } catch (err) {
    next(err);
  }
});

router.get(["/items", "/services"], requireAdmin, async (req, res, next) => {
  try {
    const search = String(req.query.search || "").trim();
    const status = String(req.query.status || "all");
    const category = String(req.query.category || "").trim();
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const query = {};
    if (status === "active") query.active = true;
    if (status === "inactive") query.active = false;
    if (category) query.category = category;
    if (search) query.$or = [{ name: { $regex: search, $options: "i" } }, { baseName: { $regex: search, $options: "i" } }, { service: { $regex: search, $options: "i" } }, { category: { $regex: search, $options: "i" } }, { description: { $regex: search, $options: "i" } }, { code: { $regex: search, $options: "i" } }];
    const [items, total] = await Promise.all([Item.find(query).sort({ sortOrder: 1, name: 1 }).skip((page - 1) * limit).limit(limit), Item.countDocuments(query)]);
    res.set("Cache-Control", "no-store");
    res.json({ items: items.map(itemToClient), pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } });
  } catch (err) {
    next(err);
  }
});

router.post(["/items", "/services"], requireAdmin, async (req, res, next) => {
  try {
    const src = sanitiseItem(req.body.item || {});
    if (!src.name) {
      return res.status(400).json({ error: "bad_name", message: "Please enter the item name." });
    }

    const seq = await nextSequence("itemSeq", 1);
    const item = await Item.create(Object.assign({}, src, {
      id: makeId("item"),
      code: "ITEM-" + String(seq).padStart(4, "0"),
      createdBy: req.user._id,
      updatedBy: req.user._id
    }));

    res.status(201).json({ item: itemToClient(item) });
  } catch (err) {
    if (err && err.code === 11000) {
      const x = duplicateError(err, "code");
      return res.status(x.status).json({ error: x.error, message: x.message });
    }
    next(err);
  }
});

router.put(["/items/:id", "/services/:id"], requireAdmin, async (req, res, next) => {
  try {
    const item = await Item.findOne({ id: req.params.id });
    if (!item) return res.status(404).json({ error: "not_found", message: "That item no longer exists." });

    const src = sanitiseItem(req.body.item || {});
    if (!src.name) {
      return res.status(400).json({ error: "bad_name", message: "Please enter the item name." });
    }

    Object.assign(item, src, { updatedBy: req.user._id });
    await item.save();

    // Invoice lines are price snapshots: never rewrite issued financial records.
    res.json({ item: itemToClient(item) });
  } catch (err) {
    if (err && err.code === 11000) {
      const x = duplicateError(err, "code");
      return res.status(x.status).json({ error: x.error, message: x.message });
    }
    next(err);
  }
});

router.delete(["/items/:id", "/services/:id"], requireAdmin, async (req, res, next) => {
  try {
    const item = await Item.findOne({ id: req.params.id });
    if (!item) return res.status(404).json({ error: "not_found", message: "That item no longer exists." });

    const used = await AdminInvoice.exists({ "lines.itemId": item.id });
    if (used) {
      item.active = false;
      item.updatedBy = req.user._id;
      await item.save();
      return res.json({ ok: true, id: item.id, deactivated: true, message: "Service was used on an invoice and has been deactivated to protect history." });
    }
    await Item.deleteOne({ _id: item._id });
    res.json({ ok: true, id: item.id, deactivated: false });
  } catch (err) {
    next(err);
  }
});

router.patch("/services/:id/status", requireAdmin, async (req, res, next) => {
  try {
    const item = await Item.findOne({ id: req.params.id });
    if (!item) return res.status(404).json({ error: "not_found", message: "That service no longer exists." });
    item.active = !!req.body.active;
    item.updatedBy = req.user._id;
    await item.save();
    res.json({ item: itemToClient(item) });
  } catch (err) { next(err); }
});

router.patch("/services/:id/order", requireAdmin, async (req, res, next) => {
  try {
    const item = await Item.findOne({ id: req.params.id });
    if (!item) return res.status(404).json({ error: "not_found", message: "That service no longer exists." });
    item.sortOrder = Math.max(0, Math.min(100000, Number(req.body.sortOrder) || 0));
    item.updatedBy = req.user._id;
    await item.save();
    res.json({ item: itemToClient(item) });
  } catch (err) { next(err); }
});

router.get("/invoices", requireAdmin, async (req, res, next) => {
  try {
    const invoices = await AdminInvoice.find({}).sort({ invoiceDate: -1, createdAt: -1 }).limit(1000);
    res.set("Cache-Control", "no-store");
    res.json({ invoices: invoices.map(adminInvoiceToClient) });
  } catch (err) {
    next(err);
  }
});

router.post("/invoices", requireAdmin, async (req, res, next) => {
  try {
    const number = "INV-" + String(await nextSequence("invoiceSeq", 1)).padStart(5, "0");
    const payload = await buildAdminInvoicePayload(req.body.invoice || {}, null, req.shop.settings || {});

    const invoice = await AdminInvoice.create(Object.assign({}, payload, {
      id: makeId("inv"),
      number,
      createdBy: req.user._id,
      updatedBy: req.user._id
    }));

    res.status(201).json({ invoice: adminInvoiceToClient(invoice) });
  } catch (err) {
    if (err && err.code === 11000) {
      const x = duplicateError(err, "number");
      return res.status(x.status).json({ error: x.error, message: x.message });
    }
    if (err && err.statusCode) {
      return res.status(err.statusCode).json({ error: err.clientError || "bad_request", message: err.message });
    }
    next(err);
  }
});

router.put("/invoices/:id", requireAdmin, async (req, res, next) => {
  try {
    const invoice = await AdminInvoice.findOne({ id: req.params.id });
    if (!invoice) return res.status(404).json({ error: "not_found", message: "That invoice no longer exists." });
    if (invoice.sourceOrderId) return res.status(400).json({ error: "order_invoice", message: "Order invoices are generated automatically and cannot be edited here." });

    const payload = await buildAdminInvoicePayload(req.body.invoice || {}, invoice, req.shop.settings || {});
    Object.assign(invoice, payload, { updatedBy: req.user._id });
    await invoice.save();

    res.json({ invoice: adminInvoiceToClient(invoice) });
  } catch (err) {
    if (err && err.statusCode) {
      return res.status(err.statusCode).json({ error: err.clientError || "bad_request", message: err.message });
    }
    next(err);
  }
});

router.delete("/invoices/:id", requireAdmin, async (req, res, next) => {
  try {
    const invoice = await AdminInvoice.findOne({ id: req.params.id });
    if (!invoice) return res.status(404).json({ error: "not_found", message: "That invoice no longer exists." });
    if (invoice.sourceOrderId) return res.status(400).json({ error: "order_invoice", message: "Order invoices are generated automatically and cannot be deleted." });
    await AdminInvoice.deleteOne({ _id: invoice._id });
    res.json({ ok: true, id: invoice.id });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
