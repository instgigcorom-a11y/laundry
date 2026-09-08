"use strict";
const mongoose = require("mongoose");

const ItemSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  code: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  slug: { type: String, trim: true, maxlength: 140, index: true, default: "" },
  baseName: { type: String, trim: true, maxlength: 120, default: "" },
  service: { type: String, trim: true, maxlength: 80, default: "" },
  category: { type: String, trim: true, maxlength: 60, index: true, default: "everyday" },
  categoryLabel: { type: String, trim: true, maxlength: 80, default: "Everyday laundry" },
  readyDays: { type: Number, min: 1, max: 30, default: 3 },
  unit: { type: String, trim: true, maxlength: 20, default: "pcs" },
  price: { type: Number, default: 0, min: 0 },
  gstRate: { type: Number, default: 0, min: 0, max: 100 },
  hsnSacCode: { type: String, trim: true, maxlength: 20, default: "" },
  icon: { type: String, trim: true, maxlength: 24, default: "" },
  from: { type: Boolean, default: false },
  sortOrder: { type: Number, default: 0, index: true },
  description: { type: String, trim: true, maxlength: 300, default: "" },
  active: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
}, { timestamps: true });

ItemSchema.index({ active: 1, sortOrder: 1, name: 1 });

module.exports = mongoose.models.Item || mongoose.model("Item", ItemSchema);
