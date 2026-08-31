"use strict";
const User = require("../models/User");
const Shop = require("../models/Shop");
const S = require("../services/security");

const COOKIE_NAME = "ppl_session";

function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: S.SESSION_TTL_SECONDS * 1000
  };
}

function setSessionCookie(res, userId) {
  res.cookie(COOKIE_NAME, S.mintSession(userId), sessionCookieOptions());
}

function clearSessionCookie(res) {
  const o = sessionCookieOptions();
  delete o.maxAge;
  res.clearCookie(COOKIE_NAME, o);
}

function publicUser(user) {
  return {
    id: String(user._id),
    uid: String(user._id),
    name: user.name || "",
    email: user.email || "",
    phone: user.phone || "",
    isAdmin: S.isAllowlisted(user)
  };
}

async function authenticate(req) {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  const claims = S.readSession(token);
  if (!claims) return null;
  return User.findById(claims.sub);
}

/*
 * A valid owner step-up requires all three things:
 *   1. the signed-in user is on ADMIN_EMAILS,
 *   2. the admin token belongs to that same user, and
 *   3. the token version matches the current version stored in MongoDB.
 */
function adminTokenMatches(req, user, shop) {
  if (!user || !shop || !S.isAllowlisted(user)) return false;

  const claims = S.readAdmin(req.get("X-Admin-Token"));
  if (!claims || claims.sub !== String(user._id)) return false;

  const currentVersion = Number(shop.adminTokenVersion) || 1;
  return Number.isInteger(currentVersion) && currentVersion >= 1 && claims.ver === currentVersion;
}

async function requireAuth(req, res, next) {
  try {
    const user = await authenticate(req);
    if (!user) {
      return res.status(401).json({ error: "unauthenticated", message: "Sign in first." });
    }
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

async function requireAdmin(req, res, next) {
  try {
    const user = await authenticate(req);
    if (!user) {
      return res.status(401).json({ error: "unauthenticated", message: "Sign in first." });
    }

    if (!S.isAllowlisted(user)) {
      console.warn("[authz] admin route refused for %s", S.maskUserIdentifier(user));
      return res.status(403).json({
        error: "forbidden",
        message: "This account does not have owner access."
      });
    }

    const shop = await Shop.findOne({ key: "main" });
    if (!shop) {
      return res.status(500).json({
        error: "shop_missing",
        message: "Shop configuration is missing."
      });
    }

    if (!adminTokenMatches(req, user, shop)) {
      return res.status(403).json({
        error: "pin_required",
        message: "Enter the shop PIN to continue."
      });
    }

    req.user = user;
    req.shop = shop;
    req.adminClaims = S.readAdmin(req.get("X-Admin-Token"));
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  COOKIE_NAME,
  publicUser,
  authenticate,
  adminTokenMatches,
  requireAuth,
  requireAdmin,
  setSessionCookie,
  clearSessionCookie
};
