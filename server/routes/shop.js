"use strict";
const express = require("express");
const Shop = require("../models/Shop");
const { DEFAULT_SHOP } = require("../services/bootstrap");
const { sanitiseRates } = require("../services/rates");
const router = express.Router();

router.get("/", async (req,res,next) => {
  try {
    const shop = await Shop.findOne({ key:"main" });
    if (!shop) throw new Error("Shop configuration is missing.");

    const rates = sanitiseRates(shop.rates || {});

    /* Transparently migrate dot-style rate keys written by older builds. */
    if (JSON.stringify(rates) !== JSON.stringify(shop.rates || {})) {
      shop.rates = rates;
      shop.markModified("rates");
      await shop.save();
    }

    res.set("Cache-Control", "no-store");
    res.json({
      shop: Object.assign({}, DEFAULT_SHOP, shop.settings || {}),
      rates,
      ratesUpdatedAt: shop.updatedAt
    });
  } catch (err) { next(err); }
});

module.exports = router;
