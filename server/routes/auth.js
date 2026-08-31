"use strict";
const express = require("express");
const User = require("../models/User");
const Otp = require("../models/Otp");
const S = require("../services/security");
const { sendPushToUser } = require("../services/push");
const { publicUser, setSessionCookie, clearSessionCookie } = require("../middleware/auth");
const router = express.Router();

function validSubscription(sub) {
  return !!(
    sub &&
    typeof sub.endpoint === "string" &&
    sub.endpoint.startsWith("https://") &&
    sub.keys &&
    typeof sub.keys.p256dh === "string" &&
    typeof sub.keys.auth === "string"
  );
}

function registrationIdentifiers(body) {
  const rawEmail = String((body && body.email) || "").trim();
  const rawPhone = String((body && body.phone) || "").trim();

  if (!rawEmail && !rawPhone) {
    return { error: { error: "identifier_required", message: "Enter an email address or a mobile number." } };
  }
  if (rawEmail && !S.validEmail(rawEmail)) {
    return { error: { error: "bad_email", message: "Enter a valid email address." } };
  }
  if (rawPhone && !S.validPhone(rawPhone)) {
    return { error: { error: "bad_mobile", message: "Enter a valid 10-digit Indian mobile number." } };
  }

  return {
    email: rawEmail ? S.normaliseEmail(rawEmail) : undefined,
    phone: rawPhone ? S.normalisePhone(rawPhone) : undefined
  };
}

function requestIdentifier(body) {
  /* identifier is the new API. email/phone fallbacks keep older clients usable. */
  const raw = body && body.identifier != null
    ? body.identifier
    : (body && body.email != null ? body.email : (body && body.phone != null ? body.phone : ""));
  return S.parseIdentifier(raw);
}

router.post("/register", async (req, res, next) => {
  try {
    const name = String(req.body.name || "").trim().slice(0, 80);
    const identifiers = registrationIdentifiers(req.body);
    const subscription = req.body.subscription;

    if (!name) {
      return res.status(400).json({ error: "bad_name", message: "Please enter your name." });
    }
    if (identifiers.error) {
      return res.status(400).json(identifiers.error);
    }
    if (!validSubscription(subscription)) {
      return res.status(400).json({
        error: "push_required",
        message: "Browser notifications must be enabled to register."
      });
    }

    const duplicateChecks = [];
    if (identifiers.email) duplicateChecks.push({ email: identifiers.email });
    if (identifiers.phone) duplicateChecks.push({ phone: identifiers.phone });

    const exists = await User.findOne({ $or: duplicateChecks });
    if (exists) {
      if (identifiers.email && exists.email === identifiers.email) {
        return res.status(409).json({
          error: "email_exists",
          message: "An account already exists with this email. Log in instead."
        });
      }
      return res.status(409).json({
        error: "phone_exists",
        message: "An account already exists with this mobile number. Log in instead."
      });
    }

    const userData = {
      name,
      pushSubscriptions: [{
        endpoint: subscription.endpoint,
        expirationTime: subscription.expirationTime || null,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth
        }
      }]
    };
    if (identifiers.email) userData.email = identifiers.email;
    if (identifiers.phone) userData.phone = identifiers.phone;

    const user = await User.create(userData);
    const loginIdentifier = user.email || user.phone;

    res.status(201).json({
      ok: true,
      user: publicUser(user),
      loginIdentifier
    });
  } catch (err) {
    if (err && err.code === 11000) {
      const key = err.keyPattern && err.keyPattern.phone ? "phone" : "email";
      return res.status(409).json({
        error: key + "_exists",
        message: key === "phone"
          ? "An account already exists with this mobile number. Log in instead."
          : "An account already exists with this email. Log in instead."
      });
    }
    next(err);
  }
});

router.post("/request-otp", async (req, res, next) => {
  try {
    const parsed = requestIdentifier(req.body);
    if (!parsed.valid) {
      return res.status(400).json({
        error: "bad_identifier",
        message: "Enter a valid email address or 10-digit Indian mobile number."
      });
    }

    const user = await User.findOne({ [parsed.type]: parsed.value });
    if (!user) {
      return res.status(404).json({
        error: "account_not_found",
        message: "No account was found for that email or mobile number. Register first."
      });
    }
    if (!user.pushSubscriptions || !user.pushSubscriptions.length) {
      return res.status(409).json({
        error: "push_unavailable",
        message: "This account has no registered browser for push notifications."
      });
    }

    const now = Date.now();
    const existing = await Otp.findOne({ user: user._id });
    if (existing && now < existing.resendAfter.getTime()) {
      return res.status(429).json({
        error: "cooldown",
        message: "Please wait before asking for another code.",
        retryAfterSec: Math.ceil((existing.resendAfter.getTime() - now) / 1000)
      });
    }

    const hour = 60 * 60 * 1000;
    if (!user.otpWindowStart || now - user.otpWindowStart.getTime() >= hour) {
      user.otpWindowStart = new Date(now);
      user.otpRequestCount = 0;
    }
    if (user.otpRequestCount >= S.OTP_MAX_PER_HOUR) {
      return res.status(429).json({
        error: "rate_limited",
        message: "Too many codes requested. Try again later."
      });
    }
    user.otpRequestCount += 1;
    await user.save();

    const code = S.makeOtp();
    await Otp.findOneAndUpdate(
      { user: user._id },
      {
        $set: {
          hash: S.hashOtp(code, user._id),
          attempts: 0,
          expiresAt: new Date(now + S.OTP_TTL_MS),
          resendAfter: new Date(now + S.OTP_RESEND_COOLDOWN_MS)
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const delivered = await sendPushToUser(user, {
      title: "Prem Power Laundry",
      body: `Your login OTP is ${code}. It expires in 2 minutes.`,
      tag: "ppl-login-otp",
      url: "/"
    });

    if (!delivered) {
      await Otp.deleteOne({ user: user._id });
      return res.status(503).json({
        error: "push_failed",
        message: "The OTP could not be delivered to a registered browser. Open the registered browser and try again."
      });
    }

    console.log("[otp] push sent to %s (valid 120s)", S.maskUserIdentifier(user));
    res.json({
      ok: true,
      identifier: parsed.value,
      identifierType: parsed.type,
      expiresInSec: S.OTP_TTL_MS / 1000,
      resendAfterSec: S.OTP_RESEND_COOLDOWN_MS / 1000
    });
  } catch (err) {
    next(err);
  }
});

router.post("/verify-otp", async (req, res, next) => {
  try {
    const parsed = requestIdentifier(req.body);
    const code = String(req.body.code || "").replace(/\D+/g, "");

    if (!parsed.valid || !/^\d{4}$/.test(code)) {
      return res.status(400).json({ error: "otp_wrong", message: "That code is not right." });
    }

    const user = await User.findOne({ [parsed.type]: parsed.value });
    if (!user) {
      return res.status(400).json({ error: "otp_wrong", message: "That code is not right." });
    }

    const otp = await Otp.findOne({ user: user._id });
    if (!otp || Date.now() >= otp.expiresAt.getTime()) {
      if (otp) await Otp.deleteOne({ _id: otp._id });
      return res.status(400).json({
        error: "otp_expired",
        message: "That code has expired. Ask for a new one."
      });
    }

    if (!S.sameSecret(S.hashOtp(code, user._id), otp.hash)) {
      otp.attempts += 1;
      if (otp.attempts >= S.OTP_MAX_ATTEMPTS) {
        await Otp.deleteOne({ _id: otp._id });
        return res.status(429).json({
          error: "otp_attempts",
          message: "Too many wrong codes. Ask for a new one."
        });
      }
      await otp.save();
      return res.status(400).json({ error: "otp_wrong", message: "That code is not right." });
    }

    await Otp.deleteOne({ _id: otp._id });
    user.lastLoginAt = new Date();
    await user.save();

    setSessionCookie(res, user._id);
    res.json({ ok: true, user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

router.post("/logout", (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

module.exports = router;
