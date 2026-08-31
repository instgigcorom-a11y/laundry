"use strict";
const Shop = require("../models/Shop");
const S = require("./security");
const { sanitiseRates } = require("./rates");
const DEFAULT_SHOP = {
  phone: "", whatsapp: "", upiId: "Q531672501@ybl", upiName: "Prem Power Laundry And Dry Clean",
  upiMc: "0000", qrImage: "@default", pickupFee: 30, freeAbove: 300, dropDiscount: 20,
  gstPct: 0, kgFold: 64, kgPress: 112, pressPlain: 8, pressSteam: 30
};
async function ensureShop() {
  let shop = await Shop.findOne({ key: "main" });
  if (!shop) shop = await Shop.create({ key: "main", settings: DEFAULT_SHOP, rates: {}, orderSeq: 100 });
  shop.settings = Object.assign({}, DEFAULT_SHOP, shop.settings || {});
  shop.rates = sanitiseRates(shop.rates || {});
  shop.markModified("rates");

  /* Existing databases created before PIN-token revocation did not have this
     field. Initialise them safely without changing the current PIN. */
  if (!Number.isInteger(shop.adminTokenVersion) || shop.adminTokenVersion < 1) {
    shop.adminTokenVersion = 1;
  }
  if (!shop.ownerPinHash) {
    const pin = String(process.env.OWNER_PIN || "").replace(/\D+/g, "");
    if (!/^\d{4,8}$/.test(pin)) throw new Error("No owner PIN is stored. Set OWNER_PIN=4-to-8-digits for the first successful boot.");
    shop.ownerPinHash = S.hashPin(pin);
    console.log("[boot] owner PIN stored as a scrypt hash in MongoDB. Remove OWNER_PIN from .env now.");
  }
  await shop.save(); return shop;
}
module.exports = { DEFAULT_SHOP, ensureShop };
