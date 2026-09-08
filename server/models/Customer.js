"use strict";
const mongoose = require("mongoose");

const CustomerSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  code: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  phone: { type: String, trim: true, maxlength: 10, default: undefined },
  email: { type: String, trim: true, lowercase: true, maxlength: 160, default: undefined },
  address: { type: String, trim: true, maxlength: 400, default: "" },
  notes: { type: String, trim: true, maxlength: 400, default: "" },
  active: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
}, { timestamps: true });

CustomerSchema.index({ phone: 1 }, { unique: true, sparse: true });
CustomerSchema.index({ email: 1 }, { unique: true, sparse: true });
CustomerSchema.index({ name: 1 });

module.exports = mongoose.models.Customer || mongoose.model("Customer", CustomerSchema);
