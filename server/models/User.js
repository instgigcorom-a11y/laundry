"use strict";
const mongoose = require("mongoose");

const PushSubscriptionSchema = new mongoose.Schema({
  endpoint: { type: String, required: true },
  expirationTime: { type: Number, default: null },
  keys: {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true }
  },
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },

  /*
   * A customer may register with email, mobile, or both.  Missing identifiers
   * are left undefined (not stored as an empty string) so sparse unique
   * indexes can safely support many email-only and phone-only accounts.
   */
  email: { type: String, trim: true, lowercase: true, maxlength: 160, default: undefined },
  phone: { type: String, trim: true, maxlength: 10, default: undefined },

  pushSubscriptions: { type: [PushSubscriptionSchema], default: [] },
  lastLoginAt: { type: Date, default: null },
  otpWindowStart: { type: Date, default: null },
  otpRequestCount: { type: Number, default: 0 },
  pinWindowStart: { type: Date, default: null },
  pinFailedCount: { type: Number, default: 0 }
}, { timestamps: true });

/* One account per email and one account per mobile number, when present. */
UserSchema.index({ email: 1 }, { unique: true, sparse: true });
UserSchema.index({ phone: 1 }, { unique: true, sparse: true });

module.exports = mongoose.models.User || mongoose.model("User", UserSchema);
