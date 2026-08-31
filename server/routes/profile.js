"use strict";
const express = require("express");
const User = require("../models/User");
const S = require("../services/security");
const { requireAuth, publicUser } = require("../middleware/auth");
const router = express.Router();

router.get("/", requireAuth, (req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({ user: publicUser(req.user) });
});

router.post("/", requireAuth, async (req, res, next) => {
  try {
    const name = String(req.body.name == null ? req.user.name : req.body.name).trim().slice(0, 80);

    const rawEmail = String(
      req.body.email == null ? (req.user.email || "") : req.body.email
    ).trim();
    const rawPhone = String(
      req.body.phone == null ? (req.user.phone || "") : req.body.phone
    ).trim();

    if (!name) {
      return res.status(400).json({ error: "bad_name", message: "Please enter your name." });
    }
    if (!rawEmail && !rawPhone) {
      return res.status(400).json({
        error: "identifier_required",
        message: "Keep at least one login method: email address or mobile number."
      });
    }
    if (rawEmail && !S.validEmail(rawEmail)) {
      return res.status(400).json({ error: "bad_email", message: "Enter a valid email address." });
    }
    if (rawPhone && !S.validPhone(rawPhone)) {
      return res.status(400).json({
        error: "bad_mobile",
        message: "Enter a valid 10-digit Indian mobile number."
      });
    }

    const email = rawEmail ? S.normaliseEmail(rawEmail) : undefined;
    const phone = rawPhone ? S.normalisePhone(rawPhone) : undefined;

    const duplicateChecks = [];
    if (email) duplicateChecks.push({ email, _id: { $ne: req.user._id } });
    if (phone) duplicateChecks.push({ phone, _id: { $ne: req.user._id } });

    if (duplicateChecks.length) {
      const exists = await User.findOne({ $or: duplicateChecks });
      if (exists) {
        if (email && exists.email === email) {
          return res.status(409).json({
            error: "email_exists",
            message: "That email is already used by another account."
          });
        }
        return res.status(409).json({
          error: "phone_exists",
          message: "That mobile number is already used by another account."
        });
      }
    }

    req.user.name = name;
    req.user.email = email;
    req.user.phone = phone;
    await req.user.save();

    res.set("Cache-Control", "no-store");
    res.json({ user: publicUser(req.user) });
  } catch (err) {
    if (err && err.code === 11000) {
      const key = err.keyPattern && err.keyPattern.phone ? "phone" : "email";
      return res.status(409).json({
        error: key + "_exists",
        message: key === "phone"
          ? "That mobile number is already used by another account."
          : "That email is already used by another account."
      });
    }
    next(err);
  }
});

module.exports = router;
