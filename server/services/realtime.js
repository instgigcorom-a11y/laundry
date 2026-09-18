"use strict";

const { Server } = require("socket.io");
const User = require("../models/User");
const security = require("./security");

let io = null;

function normaliseOrigin(value) {
  try { return new URL(String(value || "").trim()).origin; } catch { return ""; }
}

function allowedOrigins() {
  return String(process.env.CORS_ORIGINS || "")
    .split(",")
    .concat([
      "https://pplwash.in",
      "https://www.pplwash.in",
      "http://localhost:5173",
      "http://127.0.0.1:5173"
    ])
    .map(normaliseOrigin)
    .filter(Boolean);
}

function attachRealtime(server) {
  io = new Server(server, {
    cors: { origin: allowedOrigins(), credentials: true },
    transports: ["websocket", "polling"]
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth && socket.handshake.auth.token;
      const claims = security.readSession(token);
      if (!claims) return next(new Error("unauthenticated"));
      const user = await User.findById(claims.sub).select("role");
      if (!user || user.role !== "admin") return next(new Error("forbidden"));
      socket.data.userId = String(user._id);
      next();
    } catch (error) {
      next(new Error("authentication_failed"));
    }
  });

  io.on("connection", (socket) => {
    socket.join("admins");
    socket.emit("admin:ready", { connected: true });
  });

  return io;
}

function emitNewOrder(order) {
  if (!io) return false;
  io.to("admins").emit("order:new", order);
  return true;
}

module.exports = { attachRealtime, emitNewOrder };
