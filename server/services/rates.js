"use strict";

/*
 * Rate keys are stored canonically as category/index/kind, e.g. men/0/dc.
 * Older frontend builds used dots (men.0.dc), so accept and migrate both.
 */
function normaliseRateKey(rawKey) {
  const key = String(rawKey || "").trim().replace(/\./g, "/");
  return /^[a-z0-9_]+\/\d+\/(dc|si)$/i.test(key) ? key : null;
}

function sanitiseRates(input) {
  const src = input && typeof input === "object" ? input : {};
  const out = {};
  let count = 0;

  for (const rawKey of Object.keys(src)) {
    if (++count > 2000) break;
    const key = normaliseRateKey(rawKey);
    if (!key) continue;

    const value = src[rawKey];
    if (value === null || value === "") {
      out[key] = null;
      continue;
    }

    const number = Number(value);
    if (Number.isFinite(number) && number >= 0 && number <= 1e6) {
      out[key] = number;
    }
  }

  return out;
}

module.exports = { normaliseRateKey, sanitiseRates };
