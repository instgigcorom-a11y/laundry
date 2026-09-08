"use strict";
const express = require("express");
const Item = require("../models/Item");
const router = express.Router();
function product(item) { return { id: item.id, code: item.code, name: item.name, baseName: item.baseName || item.name, category: item.category || "everyday", categoryLabel: item.categoryLabel || "Everyday laundry", readyDays: item.readyDays || 3, service: item.service || item.description || "Laundry care", from: !!item.from, unit: item.unit, price: item.price, description: item.description, active: item.active, gstRate: item.gstRate || 0, hsnSacCode: item.hsnSacCode || "", icon: item.icon || "" }; }
router.get("/", async (req, res, next) => { try { const items = await Item.find({ active: true }).sort({ sortOrder: 1, name: 1 }); res.set("Cache-Control", "no-store"); res.json({ products: items.map(product), source: "database" }); } catch (err) { next(err); } });
router.get("/:id", async (req, res, next) => { try { const item = await Item.findOne({ id: req.params.id, active: true }); if (!item) return res.status(404).json({ error: "not_found", message: "Service not found." }); res.json({ product: product(item) }); } catch (err) { next(err); } });
module.exports = router;
