"use strict";

// Prem Power Laundry's public rate card. `from` marks rates confirmed after inspection.
const CATEGORIES = [
  { id: "men", label: "Men's wear", days: 3, items: [
    ["shirt", "Shirt / T-shirt", 108, 36], ["trouser", "Trouser / Jeans", 108, 36], ["coat", "Coat", 252, 76],
    ["suit-2", "Suit - 2 piece", 360, 112, false, false, "set"], ["suit-3", "Suit - 3 piece", 444, 136, false, false, "set"],
    ["kurta", "Kurta", 168, 52, true, true], ["pyjama", "Pyjama", 108, 36, true, true], ["achkan", "Achkan", 460, 144],
  ] },
  { id: "women", label: "Women's wear", days: 3, items: [
    ["kurta", "Kurta", 168, 52, true, true], ["salwar", "Salwar", 108, 36], ["plazo", "Plazo", 108, 36, true, true],
    ["dupatta", "Dupatta / Chunni", 104, 36, true, true], ["saree", "Saree", 340, 104, true, true], ["blouse", "Blouse", 136, 44, true, true],
    ["dress", "Dress", 316, 92, true, true], ["top", "Top", 168, 52, true, true], ["lehenga", "Lehenga", 580, 176, true, true],
    ["skirt", "Skirt", 220, 68, true, true],
  ] },
  { id: "winter", label: "Winter wear", days: 3, items: [
    ["jacket-full", "Jacket - full sleeves", 252, 76, true, true], ["jacket-half", "Jacket - half sleeves", 196, 60],
    ["sweater-full", "Sweater - full sleeves", 192, 60, true, true], ["sweater-half", "Sweater - half sleeves", 144, 44],
    ["sweatshirt", "Sweat shirt", 236, 68], ["long-coat", "Long coat", 380, 120], ["shawl", "Shawl", 252, 76, true, true],
    ["pashmina", "Pashmina", 708, 216], ["leather-jacket", "Leather jacket", 420, 128],
  ] },
  { id: "household", label: "Household", days: 3, items: [
    ["blanket-single-1", "Blanket single - 1 ply", 300, null], ["blanket-single-2", "Blanket single - 2 ply", 372, null],
    ["blanket-double-1", "Blanket double - 1 ply", 380, null], ["blanket-double-2", "Blanket double - 2 ply", 468, null],
    ["quilt-single", "Quilt / Razai - single", 300, null], ["quilt-double", "Quilt / Razai - double", 380, null], ["duvet", "Duvet", 68, null, true],
    ["curtain-no-lining", "Curtain - without lining", 120, null, true], ["curtain-lining", "Curtain - with lining", 168, null, true],
    ["bedsheet-single", "Bed sheet - single", 104, null], ["bedsheet-double", "Bed sheet - double", 144, null], ["carpet", "Carpet - per sq ft", 24, null, false, false, "sq ft"],
  ] },
  { id: "shoes", label: "Shoes", days: 4, items: [
    ["sports-shoes", "Sports shoes", 336, null, false, false, "pair"], ["canvas-sneaker", "Canvas / Sneaker - non leather", 336, null, false, false, "pair"],
    ["leather-shoes", "Leather shoes", 424, null, false, false, "pair"], ["suede-shoes", "Suede leather shoes", 504, null, false, false, "pair"], ["boots", "Boots", 600, null, true, false, "pair"],
  ] },
  { id: "bags", label: "Bags", days: 4, items: [
    ["handbag", "Handbag", 420, null, true], ["handbag-leather", "Handbag - leather", 620, null, true], ["canvas-bag", "Canvas / Jute / Cloth bag", 300, null, true],
    ["suitcase", "Suit case", 212, null, true], ["wallet", "Wallet", 212, null, true],
  ] },
];

function rateProduct(category, item, service, price, from) {
  const [itemId, name, , , , , unit = "pc"] = item;
  return { id: `starter_${category.id}_${itemId}_${service.id}`, code: `STARTER-${category.id}-${itemId}-${service.id}`.toUpperCase(), name: `${name} - ${service.name}`, baseName: name, category: category.id, categoryLabel: category.label, readyDays: category.days, service: service.name, from: Boolean(from), price, unit, description: `${category.label} - ${service.name}`, active: true };
}

const garmentProducts = CATEGORIES.flatMap((category) => category.items.flatMap((item) => {
  const [, , dryClean, steamPress, dryFrom = false, pressFrom = false] = item;
  const rates = [];
  if (Number.isFinite(dryClean)) rates.push(rateProduct(category, item, { id: "dry-clean", name: "Dry clean" }, dryClean, dryFrom));
  if (Number.isFinite(steamPress)) rates.push(rateProduct(category, item, { id: "steam-press", name: "Steam press" }, steamPress, pressFrom));
  return rates;
}));

const quickProducts = [
  { id: "starter_everyday_wash-fold", code: "STARTER-WASH-FOLD", name: "Wash & fold", baseName: "Wash & fold", category: "everyday", categoryLabel: "Everyday laundry", readyDays: 2, service: "Wash & fold", price: 64, unit: "kg", description: "Everyday laundry by weight", active: true, from: false },
  { id: "starter_everyday_wash-press", code: "STARTER-WASH-PRESS", name: "Wash & press", baseName: "Wash & press", category: "everyday", categoryLabel: "Everyday laundry", readyDays: 2, service: "Wash & press", price: 120, unit: "kg", description: "Laundry by weight with press", active: true, from: false },
  { id: "starter_everyday_dry-clean", code: "STARTER-DRY-CLEAN", name: "Dry clean", baseName: "Dry clean", category: "everyday", categoryLabel: "Everyday laundry", readyDays: 3, service: "Dry clean", price: 68, unit: "pc", description: "Starting rate after inspection", active: true, from: true },
  { id: "starter_everyday_press-only", code: "STARTER-PRESS-ONLY", name: "Press only", baseName: "Press only", category: "everyday", categoryLabel: "Everyday laundry", readyDays: 2, service: "Press only", price: 9, unit: "pc", description: "Everyday pressing", active: true, from: false },
];

const starterProducts = [...quickProducts, ...garmentProducts];
function getStarterProduct(id) { return starterProducts.find((product) => product.id === id) || null; }
module.exports = { categories: CATEGORIES, starterProducts, getStarterProduct };
