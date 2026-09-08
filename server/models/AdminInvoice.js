"use strict";
const mongoose = require("mongoose");

const AdminInvoiceLineSchema = new mongoose.Schema({
  itemId: { type: String, default: "" },
  itemCode: { type: String, default: "" },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  unit: { type: String, trim: true, maxlength: 20, default: "pcs" },
  qty: { type: Number, default: 1, min: 0 },
  price: { type: Number, default: 0, min: 0 },
  amount: { type: Number, default: 0, min: 0 },
  note: { type: String, trim: true, maxlength: 200, default: "" }
}, { _id: false });

const CustomerSnapshotSchema = new mongoose.Schema({
  id: { type: String, default: "" },
  code: { type: String, default: "" },
  name: { type: String, default: "" },
  phone: { type: String, default: "" },
  email: { type: String, default: "" },
  address: { type: String, default: "" }
}, { _id: false });

const AdminInvoiceSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  number: { type: String, required: true, unique: true, index: true },
  sourceOrderId: { type: String, default: undefined, unique: true, sparse: true, index: true },
  customerId: { type: String, default: "", index: true },
  customer: { type: CustomerSnapshotSchema, default: () => ({}) },
  invoiceDate: { type: Number, required: true, index: true },
  lines: { type: [AdminInvoiceLineSchema], default: [] },
  subtotal: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  extraCharge: { type: Number, default: 0 },
  gstPct: { type: Number, default: 0 },
  gstAmount: { type: Number, default: 0 },
  adjustment: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  paid: { type: Boolean, default: false },
  note: { type: String, trim: true, maxlength: 500, default: "" },
  terms: { type: String, trim: true, maxlength: 1000, default: "" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
}, { timestamps: true });

module.exports = mongoose.models.AdminInvoice || mongoose.model("AdminInvoice", AdminInvoiceSchema);
