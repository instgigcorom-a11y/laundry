"use strict";
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const SESSION_SECRET = String(process.env.SESSION_SECRET || "");
const OTP_PEPPER = String(process.env.OTP_PEPPER || "");
if (SESSION_SECRET.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters.");
if (OTP_PEPPER.length < 32) throw new Error("OTP_PEPPER must be at least 32 characters.");

const OTP_TTL_MS = 120000;
const OTP_RESEND_COOLDOWN_MS = 30000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_MAX_PER_HOUR = 5;
const ADMIN_TTL_SECONDS = 30 * 60;
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

function normaliseEmail(input) {
  const raw = String(input || "").trim().toLowerCase();
  const at = raw.lastIndexOf("@");
  if (at <= 0) return raw;
  let local = raw.slice(0, at);
  let domain = raw.slice(at + 1);
  if (domain === "googlemail.com") domain = "gmail.com";
  if (domain === "gmail.com") {
    const plus = local.indexOf("+");
    if (plus >= 0) local = local.slice(0, plus);
    local = local.replace(/\./g, "");
  }
  return local + "@" + domain;
}

function validEmail(input) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(input || "").trim());
}

function normalisePhone(input) {
  let digits = String(input || "").replace(/\D+/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return digits;
}

function validPhone(input) {
  return /^[6-9]\d{9}$/.test(normalisePhone(input));
}

/*
 * Login accepts one field that may be either an email address or an Indian
 * mobile number.  The returned value is the canonical value stored in MongoDB.
 */
function parseIdentifier(input) {
  const raw = String(input || "").trim();
  if (!raw) return { valid: false, type: null, value: "" };

  if (validEmail(raw)) {
    return { valid: true, type: "email", value: normaliseEmail(raw) };
  }

  if (validPhone(raw)) {
    return { valid: true, type: "phone", value: normalisePhone(raw) };
  }

  return { valid: false, type: raw.includes("@") ? "email" : "phone", value: raw };
}

function identifierQuery(input) {
  const parsed = parseIdentifier(input);
  if (!parsed.valid) return null;
  return { [parsed.type]: parsed.value };
}

const ADMIN_EMAILS = new Set(
  String(process.env.ADMIN_EMAILS || "")
    .split(",")
    .map(normaliseEmail)
    .filter(Boolean)
);

function isAllowlisted(user) {
  return !!(user && user.email && ADMIN_EMAILS.has(normaliseEmail(user.email)));
}

function maskEmail(email) {
  const e = normaliseEmail(email), at = e.indexOf("@");
  if (at < 1) return "•••";
  return e.slice(0, Math.min(2, at)) + "•••@" + e.slice(at + 1);
}

function maskPhone(phone) {
  const p = normalisePhone(phone);
  if (p.length !== 10) return "••••";
  return p.slice(0, 2) + "•••••" + p.slice(-3);
}

function maskUserIdentifier(user) {
  if (user && user.email) return maskEmail(user.email);
  if (user && user.phone) return maskPhone(user.phone);
  return "unknown-user";
}

function makeOtp() {
  return String(crypto.randomInt(1000, 10000));
}

function hashOtp(code, userId) {
  return crypto
    .createHmac("sha256", OTP_PEPPER)
    .update(String(userId) + ":" + String(code || ""))
    .digest("hex");
}

function sameSecret(a, b) {
  const aa = Buffer.from(String(a || "")), bb = Buffer.from(String(b || ""));
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

function hashPin(pin) {
  const clean = String(pin || "").replace(/\D+/g, "");
  if (!/^\d{4,8}$/.test(clean)) throw new Error("PIN must be 4 to 8 digits.");
  const salt = crypto.randomBytes(16), N = 16384;
  const derived = crypto.scryptSync(clean, salt, 32, {
    N, r: 8, p: 1, maxmem: 64 * 1024 * 1024
  });
  return ["scrypt", N, salt.toString("base64url"), derived.toString("base64url")].join("$");
}

function checkPin(pin, stored) {
  try {
    const parts = String(stored || "").split("$");
    if (parts.length !== 4 || parts[0] !== "scrypt") return false;
    const N = Number(parts[1]);
    const salt = Buffer.from(parts[2], "base64url");
    const expected = Buffer.from(parts[3], "base64url");
    const clean = String(pin || "").replace(/\D+/g, "");
    const actual = crypto.scryptSync(clean, salt, expected.length, {
      N, r: 8, p: 1, maxmem: 64 * 1024 * 1024
    });
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

function mintSession(userId) {
  return jwt.sign(
    { sub: String(userId), typ: "session" },
    SESSION_SECRET,
    { expiresIn: SESSION_TTL_SECONDS, issuer: "prem-power-laundry" }
  );
}

function readSession(token) {
  try {
    const claims = jwt.verify(String(token || ""), SESSION_SECRET, { issuer: "prem-power-laundry" });
    return claims && claims.typ === "session" ? claims : null;
  } catch {
    return null;
  }
}

function mintAdmin(userId, version) {
  const ver = Number(version);
  if (!Number.isInteger(ver) || ver < 1) throw new Error("Invalid admin token version.");
  return jwt.sign(
    { sub: String(userId), typ: "admin", ver },
    SESSION_SECRET,
    { expiresIn: ADMIN_TTL_SECONDS, issuer: "prem-power-laundry" }
  );
}

function readAdmin(token) {
  try {
    const claims = jwt.verify(String(token || ""), SESSION_SECRET, { issuer: "prem-power-laundry" });
    if (!claims || claims.typ !== "admin") return null;
    if (!Number.isInteger(claims.ver) || claims.ver < 1) return null;
    return claims;
  } catch {
    return null;
  }
}

module.exports = {
  ADMIN_EMAILS,
  OTP_TTL_MS,
  OTP_RESEND_COOLDOWN_MS,
  OTP_MAX_ATTEMPTS,
  OTP_MAX_PER_HOUR,
  ADMIN_TTL_SECONDS,
  SESSION_TTL_SECONDS,
  normaliseEmail,
  validEmail,
  normalisePhone,
  validPhone,
  parseIdentifier,
  identifierQuery,
  isAllowlisted,
  maskEmail,
  maskPhone,
  maskUserIdentifier,
  makeOtp,
  hashOtp,
  sameSecret,
  hashPin,
  checkPin,
  mintSession,
  readSession,
  mintAdmin,
  readAdmin
};
