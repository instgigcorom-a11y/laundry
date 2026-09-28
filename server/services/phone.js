"use strict";

const { parsePhoneNumberFromString } = require("libphonenumber-js");

function parseInternationalPhone(input, defaultCountry = "IN") {
  const raw = String(input || "").trim();
  if (!raw) return { valid: false, reason: "invalid" };
  const digits = raw.replace(/\D/g, "");
  const value = raw.startsWith("+") ? `+${digits}` : digits.length === 12 && digits.startsWith("91") ? `+${digits}` : raw;
  let phone;
  try { phone = parsePhoneNumberFromString(value, defaultCountry || "IN"); } catch { return { valid: false, reason: "invalid" }; }
  if (!phone) return { valid: false, reason: "invalid" };
  const country = phone.country || String(defaultCountry || "").toUpperCase();
  const callingCode = phone.countryCallingCode;
  if (!phone.isValid()) return { valid: false, reason: "invalid", country, callingCode };
  return { valid: true, country, callingCode, e164: phone.number, nationalNumber: phone.nationalNumber };
}

module.exports = { parseInternationalPhone };
