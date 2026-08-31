"use strict";

const User = require("../models/User");
const Otp = require("../models/Otp");
const Order = require("../models/Order");
const Shop = require("../models/Shop");

async function listIndexesSafe(collection) {
  try {
    return await collection.indexes();
  } catch (err) {
    /* NamespaceNotFound: collection does not exist yet on a fresh database. */
    if (err && (err.code === 26 || err.codeName === "NamespaceNotFound")) return [];
    throw err;
  }
}

function keyIs(index, field) {
  return !!(index && index.key && Object.keys(index.key).length === 1 && index.key[field] === 1);
}

async function ensureUserIdentifierIndexes() {
  const indexes = await listIndexesSafe(User.collection);

  /*
   * Older versions had a non-sparse unique email_1 index because every user
   * was required to have an email.  Phone-only users need email to be absent,
   * so replace that old index with a sparse unique one.
   */
  for (const index of indexes) {
    if (keyIs(index, "email") && (!index.unique || !index.sparse)) {
      await User.collection.dropIndex(index.name);
      console.log("[database] replaced legacy user email index: %s", index.name);
    }
    if (keyIs(index, "phone") && (!index.unique || !index.sparse)) {
      await User.collection.dropIndex(index.name);
      console.log("[database] replaced legacy user phone index: %s", index.name);
    }
  }

  await User.collection.createIndex(
    { email: 1 },
    { unique: true, sparse: true, name: "email_1" }
  );
  await User.collection.createIndex(
    { phone: 1 },
    { unique: true, sparse: true, name: "phone_1" }
  );
}

async function ensureDatabaseIndexes() {
  await ensureUserIdentifierIndexes();

  /* autoIndex is disabled at connect time so upgrades can safely migrate the
     user index first. Create/confirm the rest explicitly here. */
  await Promise.all([
    Otp.createIndexes(),
    Order.createIndexes(),
    Shop.createIndexes()
  ]);
}

module.exports = { ensureDatabaseIndexes };
