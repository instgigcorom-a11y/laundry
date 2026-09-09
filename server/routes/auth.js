"use strict";
const express = require("express");
const User = require("../models/User");
const S = require("../services/security");
const { publicUser, setSessionCookie, clearSessionCookie, requireAuth } = require("../middleware/auth");
const router = express.Router();

function addressFrom(input) {
  const source = input && typeof input === "object" ? input : {};
  const address = {
    line1: String(source.line1 || "").trim().slice(0, 160), line2: String(source.line2 || "").trim().slice(0, 160),
    city: String(source.city || "").trim().slice(0, 80), state: String(source.state || "").trim().slice(0, 80),
    pincode: String(source.pincode || "").replace(/\D/g, "").slice(0, 6), country: String(source.country || "India").trim().slice(0, 80) || "India"
  };
  return address.line1 && address.city && address.state && /^\d{6}$/.test(address.pincode) ? address : null;
}

router.post("/register", async (req, res, next) => {
  try {
    const name = String(req.body.name || "").trim().slice(0, 80);
    const email = S.normaliseEmail(req.body.email);
    const phone = S.normalisePhone(req.body.mobileNumber || req.body.phone);
    const password = String(req.body.password || "");
    const address = req.body.address == null ? undefined : addressFrom(req.body.address);
    if (!name) return res.status(400).json({ error: "bad_name", message: "Please enter your name." });
    if (!S.validEmail(email)) return res.status(400).json({ error: "bad_email", message: "Enter a valid email address." });
    if (!S.validPhone(phone)) return res.status(400).json({ error: "bad_mobile", message: "Enter a valid 10-digit Indian mobile number." });
    if (password.length < 8) return res.status(400).json({ error: "bad_password", message: "Password must be at least 8 characters." });
    if (req.body.address != null && !address) return res.status(400).json({ error: "bad_address", message: "Enter a complete address with a 6-digit pincode." });
    const existing = await User.findOne({ $or: [{ email }, { phone }] });
    if (existing) return res.status(409).json({ error: existing.email === email ? "email_exists" : "phone_exists", message: "An account already exists with those details." });
    const user = await User.create({ name, email, phone, passwordHash: S.hashPassword(password), address, role: "customer" });
    setSessionCookie(res, user._id);
    res.status(201).json({ user: publicUser(user), token: S.mintSession(user._id) });
  } catch (err) { if (err && err.code === 11000) return res.status(409).json({ error: "account_exists", message: "An account already exists with those details." }); next(err); }
});

router.post("/login", async (req, res, next) => {
  try {
    const parsed = S.parseIdentifier(req.body.identifier || req.body.email);
    const password = String(req.body.password || "");
    if (!parsed.valid || !password) return res.status(400).json({ error: "bad_credentials", message: "Enter your email or mobile number and password." });
    const user = await User.findOne({ [parsed.type]: parsed.value }).select("+passwordHash");
    if (!user || !S.checkPassword(password, user.passwordHash)) return res.status(401).json({ error: "bad_credentials", message: "Email/mobile number or password is incorrect." });
    user.lastLoginAt = new Date(); await user.save(); setSessionCookie(res, user._id);
    res.json({ user: publicUser(user), token: S.mintSession(user._id) });
  } catch (err) { next(err); }
});

router.post("/change-password", requireAuth, async (req, res, next) => {
  try {
    const currentPassword = String(req.body.currentPassword || "");
    const password = String(req.body.password || "");
    if (!currentPassword || password.length < 8) return res.status(400).json({ error: "bad_password", message: "Enter your current password and a new password of at least 8 characters." });

    const user = await User.findById(req.user._id).select("+passwordHash");
    if (!user || !S.checkPassword(currentPassword, user.passwordHash)) return res.status(401).json({ error: "bad_current_password", message: "Your current password is incorrect." });

    user.passwordHash = S.hashPassword(password);
    user.lastLoginAt = new Date();
    await user.save();
    setSessionCookie(res, user._id);
    res.json({ user: publicUser(user), token: S.mintSession(user._id) });
  } catch (err) { next(err); }
});

router.post("/forgot-password", async (req, res, next) => {
  try {
    const email = S.normaliseEmail(req.body.email);
    const phone = S.normalisePhone(req.body.mobileNumber || req.body.phone);
    const password = String(req.body.password || "");
    if (!S.validEmail(email) || !S.validPhone(phone) || password.length < 8) return res.status(400).json({ error: "bad_recovery_details", message: "Enter your account email, registered 10-digit mobile number, and a new password of at least 8 characters." });

    const user = await User.findOne({ email, phone }).select("+passwordHash");
    if (!user) return res.status(401).json({ error: "recovery_not_verified", message: "We could not verify those account details. Check your email and registered mobile number." });

    user.passwordHash = S.hashPassword(password);
    user.lastLoginAt = new Date();
    await user.save();
    setSessionCookie(res, user._id);
    res.json({ user: publicUser(user), token: S.mintSession(user._id) });
  } catch (err) { next(err); }
});

router.get("/me", requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));
router.post("/logout", (req, res) => { clearSessionCookie(res); res.json({ ok: true }); });
module.exports = router;
