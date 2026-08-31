"use strict";
const mongoose = require("mongoose");
const OrderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  token: { type: String, required: true },
  createdAtMs: { type: Number, required: true, index: true },
  items: { type: [mongoose.Schema.Types.Mixed], default: [] },
  total: { type: Number, default: 0 },
  mode: { type: String, enum: ["pickup", "drop"], default: "pickup" },
  dateLabel: { type: String, default: "" },
  slot: { type: String, default: "" },
  readyBy: { type: String, default: "" },
  addrText: { type: String, default: "" },
  paidVia: { type: String, default: "" },
  status: { type: Number, default: 0 },
  invoice: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });
module.exports = mongoose.models.Order || mongoose.model("Order", OrderSchema);
