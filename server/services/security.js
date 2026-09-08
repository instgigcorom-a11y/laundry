"use strict";
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const SESSION_SECRET = String(process.env.SESSION_SECRET || "");
if (SESSION_SECRET.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters.");
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

function validEmail(input) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(input || "").trim()); }
function normalisePhone(input) {
  let digits = String(input || "").replace(/\D+/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return digits;
}
function validPhone(input) { return /^[6-9]\d{9}$/.test(normalisePhone(input)); }
function parseIdentifier(input) {
  const raw = String(input || "").trim();
  if (validEmail(raw)) return { valid: true, type: "email", value: normaliseEmail(raw) };
  if (validPhone(raw)) return { valid: true, type: "phone", value: normalisePhone(raw) };
  return { valid: false, type: null, value: raw };
}

function hashPassword(password) {
  const clean = String(password || "");
  if (clean.length < 8) throw new Error("Password must be at least 8 characters.");
  const salt = crypto.randomBytes(16), N = 16384;
  const derived = crypto.scryptSync(clean, salt, 32, { N, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return ["scrypt", N, salt.toString("base64url"), derived.toString("base64url")].join("$");
}

function checkPassword(password, stored) {
  try {
    const parts = String(stored || "").split("$");
    if (parts.length !== 4 || parts[0] !== "scrypt") return false;
    const expected = Buffer.from(parts[3], "base64url");
    const actual = crypto.scryptSync(String(password || ""), Buffer.from(parts[2], "base64url"), expected.length, { N: Number(parts[1]), r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  } catch { return false; }
}

function mintSession(userId) { return jwt.sign({ sub: String(userId), typ: "session" }, SESSION_SECRET, { expiresIn: SESSION_TTL_SECONDS, issuer: "prem-power-laundry" }); }
function readSession(token) {
  try {
    const claims = jwt.verify(String(token || ""), SESSION_SECRET, { issuer: "prem-power-laundry" });
    return claims && claims.typ === "session" ? claims : null;
  } catch { return null; }
}
function maskUserIdentifier(user) { return user && user.email ? normaliseEmail(user.email).replace(/^(.{2}).*@/, "$1***@") : "unknown-user"; }

module.exports = { SESSION_TTL_SECONDS, normaliseEmail, validEmail, normalisePhone, validPhone, parseIdentifier, hashPassword, checkPassword, mintSession, readSession, maskUserIdentifier };
