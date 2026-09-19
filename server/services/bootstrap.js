"use strict";
const Shop = require("../models/Shop");
const Item = require("../models/Item");
const { sanitiseRates } = require("./rates");
const { starterProducts } = require("./starterCatalog");
const DEFAULT_SHOP = {
  phone: "", whatsapp: "", upiId: "Q531672501@ybl", upiName: "Prem Power Laundry And Dry Clean",
  upiMc: "0000", qrImage: "@default", pickupFee: 0, freeAbove: 0, dropDiscount: 0,
  gstPct: 0, kgFold: 64, kgPress: 112, pressPlain: 8, pressSteam: 30,
  businessName: "Prem Power Laundry", businessAddress: "Shop no. 4, New Partap Nagar Maine, Gurlal Bazar, East Gobind Nagar, Pratap Nagar, Amritsar, Amritsar Cantt., Punjab 143001",
  mapUrl: "https://maps.app.goo.gl/fhX7rC6RjevR7M3Y9?g_st=aw",
  instagramUrl: "https://www.instagram.com/prem_power_laundry?stkn=Mm5weTdxY2R4NHdt",
  businessEmail: "", gstNumber: "", businessState: "Punjab", stateCode: "03",
  bankName: "", accountHolder: "", accountNumber: "", ifsc: "",
  defaultInvoiceNotes: "Thank you for choosing Prem Power Laundry.",
  defaultInvoiceTerms: "Payment is due when the clothes are delivered."
};
async function ensureShop() {
  let shop = await Shop.findOne({ key: "main" });
  if (!shop) {
    shop = await Shop.create({
      key: "main",
      settings: DEFAULT_SHOP,
      rates: {},
      orderSeq: 100,
      customerSeq: 0,
      itemSeq: 0,
      invoiceSeq: 0
    });
  }
  const savedSettings = shop.settings || {};
  shop.settings = Object.assign({}, DEFAULT_SHOP, savedSettings);
  if (!savedSettings.mapUrl || !savedSettings.businessAddress || savedSettings.businessAddress === "Gurlal Bazar, Amritsar, Punjab 143001") {
    shop.settings.businessAddress = DEFAULT_SHOP.businessAddress;
  }
  shop.settings.mapUrl = DEFAULT_SHOP.mapUrl;
  shop.settings.instagramUrl = DEFAULT_SHOP.instagramUrl;
  // Collection is permanently free; migrate databases that still store old charges.
  shop.settings.pickupFee = 0;
  shop.settings.freeAbove = 0;
  shop.settings.dropDiscount = 0;
  shop.markModified("settings");
  shop.rates = sanitiseRates(shop.rates || {});
  shop.markModified("rates");

  if (!Number.isInteger(shop.customerSeq) || shop.customerSeq < 0) shop.customerSeq = 0;
  if (!Number.isInteger(shop.itemSeq) || shop.itemSeq < 0) shop.itemSeq = 0;
  if (!Number.isInteger(shop.invoiceSeq) || shop.invoiceSeq < 0) shop.invoiceSeq = 0;
  await shop.save(); return shop;
}

// Seed the former static rate card once. From this point forward Item is the
// single source of truth, so admin changes appear on the customer rate list.
async function ensureStarterServices() {
  const operations = starterProducts.map((service, index) => ({
    updateOne: {
      filter: { id: service.id },
      update: { $setOnInsert: Object.assign({}, service, { slug: String(service.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""), sortOrder: index + 1 }) },
      upsert: true
    }
  }));
  if (operations.length) await Item.bulkWrite(operations, { ordered: false });
}
module.exports = { DEFAULT_SHOP, ensureShop, ensureStarterServices };
