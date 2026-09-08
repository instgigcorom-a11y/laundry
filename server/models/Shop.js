"use strict";
const mongoose = require("mongoose");

const ShopSchema = new mongoose.Schema({
  key: { type: String, default: "main", unique: true, index: true },
  settings: { type: mongoose.Schema.Types.Mixed, default: {} },
  rates: { type: mongoose.Schema.Types.Mixed, default: {} },
  orderSeq: { type: Number, default: 100 },
  customerSeq: { type: Number, default: 0 },
  itemSeq: { type: Number, default: 0 },
  invoiceSeq: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.models.Shop || mongoose.model("Shop", ShopSchema);
