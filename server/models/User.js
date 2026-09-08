"use strict";
const mongoose = require("mongoose");

const AddressSchema = new mongoose.Schema({
  line1: { type: String, required: true, trim: true, maxlength: 160 },
  line2: { type: String, trim: true, maxlength: 160, default: "" },
  city: { type: String, required: true, trim: true, maxlength: 80 },
  state: { type: String, required: true, trim: true, maxlength: 80 },
  pincode: { type: String, required: true, trim: true, match: /^\d{6}$/ },
  country: { type: String, trim: true, maxlength: 80, default: "India" }
}, { _id: false });

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },

  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 160 },
  phone: { type: String, required: true, trim: true, maxlength: 10 },
  passwordHash: { type: String, required: true, select: false },
  address: { type: AddressSchema, default: undefined },
  role: { type: String, enum: ["customer", "admin"], default: "customer", index: true },
  lastLoginAt: { type: Date, default: null },
}, { timestamps: true });

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ phone: 1 }, { unique: true });

module.exports = mongoose.models.User || mongoose.model("User", UserSchema);
