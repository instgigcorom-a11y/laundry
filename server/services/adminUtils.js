"use strict";
const crypto = require("crypto");
const S = require("./security");

function text(value, max) {
  return String(value == null ? "" : value).trim().slice(0, max);
}

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function makeId(prefix) {
  return prefix + "_" + crypto.randomBytes(8).toString("base64url");
}

function customerSnapshot(customer) {
  return {
    id: String(customer.id || ""),
    code: String(customer.code || ""),
    name: String(customer.name || ""),
    phone: String(customer.phone || ""),
    email: String(customer.email || ""),
    address: String(customer.address || "")
  };
}

function sanitiseCustomer(input) {
  const rawEmail = text(input && input.email, 160);
  const rawPhone = text(input && input.phone, 20);
  return {
    name: text(input && input.name, 120),
    email: rawEmail ? S.normaliseEmail(rawEmail) : undefined,
    phone: rawPhone ? S.normalisePhone(rawPhone) : undefined,
    address: text(input && input.address, 400),
    notes: text(input && input.notes, 400),
    active: input && input.active === false ? false : true
  };
}

function sanitiseItem(input) {
  const name = text(input && input.name, 120);
  const slug = text(input && input.slug, 140).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return {
    name,
    slug,
    baseName: text(input && input.baseName, 120) || name,
    service: text(input && input.service, 80),
    category: text(input && input.category, 60) || "everyday",
    categoryLabel: text(input && input.categoryLabel, 80) || "Everyday laundry",
    readyDays: clampNumber(input && input.readyDays, 1, 30, 3),
    unit: text(input && input.unit, 20) || "pcs",
    price: clampNumber(input && input.price, 0, 1e7, 0),
    gstRate: clampNumber(input && input.gstRate, 0, 100, 0),
    hsnSacCode: text(input && input.hsnSacCode, 20),
    icon: text(input && input.icon, 24),
    from: !!(input && input.from),
    sortOrder: clampNumber(input && input.sortOrder, 0, 100000, 0),
    description: text(input && input.description, 300),
    active: input && input.active === false ? false : true
  };
}

function sanitiseInvoiceLine(line, fallbackLine, itemDoc) {
  const src = line && typeof line === "object" ? line : {};
  const prev = fallbackLine && typeof fallbackLine === "object" ? fallbackLine : {};
  const item = itemDoc || null;

  const qty = clampNumber(src.qty, 0, 100000, clampNumber(prev.qty, 0, 100000, 1));
  const price = clampNumber(
    src.price,
    0,
    1e7,
    item ? clampNumber(item.price, 0, 1e7, 0) : clampNumber(prev.price, 0, 1e7, 0)
  );
  const name = text(src.name || (item && item.name) || prev.name, 120);
  const unit = text(src.unit || (item && item.unit) || prev.unit, 20) || "pcs";

  return {
    itemId: item ? String(item.id) : text(src.itemId || prev.itemId, 60),
    itemCode: item ? String(item.code) : text(src.itemCode || prev.itemCode, 60),
    name,
    unit,
    qty,
    price,
    amount: roundMoney(qty * price),
    note: text(src.note || prev.note, 200)
  };
}

function invoiceTotals(input) {
  const subtotal = roundMoney(
    (input.lines || []).reduce((sum, line) => sum + roundMoney(Number(line.amount || 0)), 0)
  );
  const discount = clampNumber(input.discount, 0, 1e7, 0);
  const extraCharge = clampNumber(input.extraCharge, 0, 1e7, 0);
  const adjustment = clampNumber(input.adjustment, -1e6, 1e6, 0);
  const gstPct = clampNumber(input.gstPct, 0, 100, 0);
  const taxable = Math.max(subtotal - discount + extraCharge, 0);
  const gstAmount = roundMoney(taxable * gstPct / 100);
  const total = roundMoney(taxable + gstAmount + adjustment);

  return { subtotal, discount, extraCharge, adjustment, gstPct, gstAmount, total };
}

function customerToClient(customer) {
  const c = typeof customer.toObject === "function" ? customer.toObject() : customer;
  return {
    id: c.id,
    code: c.code,
    name: c.name || "",
    phone: c.phone || "",
    email: c.email || "",
    address: c.address || "",
    notes: c.notes || "",
    active: c.active !== false,
    createdAt: c.createdAt ? c.createdAt.getTime() : null,
    updatedAt: c.updatedAt ? c.updatedAt.getTime() : null
  };
}

function itemToClient(item) {
  const x = typeof item.toObject === "function" ? item.toObject() : item;
  return {
    id: x.id,
    code: x.code,
    name: x.name || "",
    slug: x.slug || "",
    baseName: x.baseName || x.name || "",
    service: x.service || "",
    category: x.category || "everyday",
    categoryLabel: x.categoryLabel || "Everyday laundry",
    readyDays: clampNumber(x.readyDays, 1, 30, 3),
    unit: x.unit || "pcs",
    price: clampNumber(x.price, 0, 1e7, 0),
    gstRate: clampNumber(x.gstRate, 0, 100, 0),
    hsnSacCode: x.hsnSacCode || "",
    icon: x.icon || "",
    from: !!x.from,
    sortOrder: clampNumber(x.sortOrder, 0, 100000, 0),
    description: x.description || "",
    active: x.active !== false,
    createdAt: x.createdAt ? x.createdAt.getTime() : null,
    updatedAt: x.updatedAt ? x.updatedAt.getTime() : null
  };
}

function adminInvoiceToClient(invoice) {
  const x = typeof invoice.toObject === "function" ? invoice.toObject() : invoice;
  return {
    id: x.id,
    number: x.number,
    sourceOrderId: x.sourceOrderId || "",
    customerId: x.customerId || "",
    customer: x.customer || {},
    invoiceDate: Number(x.invoiceDate) || Date.now(),
    lines: Array.isArray(x.lines) ? x.lines : [],
    subtotal: clampNumber(x.subtotal, 0, 1e9, 0),
    discount: clampNumber(x.discount, 0, 1e9, 0),
    extraCharge: clampNumber(x.extraCharge, 0, 1e9, 0),
    extraChargeLabel: String(x.extraChargeLabel || "").trim().slice(0, 120),
    gstPct: clampNumber(x.gstPct, 0, 100, 0),
    gstAmount: clampNumber(x.gstAmount, 0, 1e9, 0),
    adjustment: clampNumber(x.adjustment, -1e9, 1e9, 0),
    total: clampNumber(x.total, 0, 1e9, 0),
    paid: !!x.paid,
    note: x.note || "",
    terms: x.terms || "",
    createdAt: x.createdAt ? x.createdAt.getTime() : null,
    updatedAt: x.updatedAt ? x.updatedAt.getTime() : null
  };
}

module.exports = {
  clampNumber,
  makeId,
  customerSnapshot,
  sanitiseCustomer,
  sanitiseItem,
  sanitiseInvoiceLine,
  invoiceTotals,
  customerToClient,
  itemToClient,
  adminInvoiceToClient
};
