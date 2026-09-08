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
    role: user.role || "customer",
    address: user.address || {}
  };
}

async function authenticate(req) {
  const bearer = String(req.get("Authorization") || "").match(/^Bearer\s+(.+)$/i);
  const token = (bearer && bearer[1]) || (req.cookies && req.cookies[COOKIE_NAME]);
  const claims = S.readSession(token);
  if (!claims) return null;
  return User.findById(claims.sub);
}

async function requireAuth(req, res, next) {
  try {
    const user = await authenticate(req);
    if (!user) {
      return res.status(401).json({ error: "unauthenticated", message: "Sign in first." });
    }
    req.user = user;
    req.shop = await Shop.findOne({ key: "main" });
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

    if (user.role !== "admin") {
      console.warn("[authz] admin route refused for %s", S.maskUserIdentifier(user));
      return res.status(403).json({
        error: "forbidden",
        message: "This account does not have admin access."
      });
    }
    req.user = user;
    req.shop = await Shop.findOne({ key: "main" });
    if (!req.shop) throw new Error("Shop configuration is missing.");
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  COOKIE_NAME,
  publicUser,
  authenticate,
  requireAuth,
  requireAdmin,
  setSessionCookie,
  clearSessionCookie
};
