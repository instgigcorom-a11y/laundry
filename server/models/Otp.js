"use strict";
const mongoose = require("mongoose");
const OtpSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
  hash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  resendAfter: { type: Date, required: true }
}, { timestamps: true });
module.exports = mongoose.models.Otp || mongoose.model("Otp", OtpSchema);
