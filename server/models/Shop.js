"use strict";
const mongoose = require("mongoose");

const ShopSchema = new mongoose.Schema({
  key: { type: String, default: "main", unique: true, index: true },
  settings: { type: mongoose.Schema.Types.Mixed, default: {} },
  rates: { type: mongoose.Schema.Types.Mixed, default: {} },
  ownerPinHash: { type: String, default: null },

  /*
   * Every owner/admin step-up token contains this version number.
   * Changing the owner PIN increments the version, which immediately makes
   * every admin token issued under the old PIN invalid on every browser/tab.
   */
  adminTokenVersion: { type: Number, default: 1, min: 1 },

  orderSeq: { type: Number, default: 100 }
}, { timestamps: true });

module.exports = mongoose.models.Shop || mongoose.model("Shop", ShopSchema);
