"use strict";
const mongoose = require("mongoose");
let connectionPromise = null;

async function connectDB() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (connectionPromise) return connectionPromise;

  const uri = String(process.env.MONGODB_URI || "").trim();
  if (!uri) throw new Error("MONGODB_URI is missing. Put it in server/.env.");

  connectionPromise = mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
    /* Indexes are created explicitly after the legacy email index migration. */
    autoIndex: false
  })
    .then(() => {
      console.log("[database] MongoDB connected: %s", mongoose.connection.name);
      return mongoose.connection;
    })
    .catch((err) => {
      connectionPromise = null;
      throw err;
    });

  return connectionPromise;
}

module.exports = connectDB;
