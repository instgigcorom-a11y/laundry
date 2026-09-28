import { getCountries, getCountryCallingCode, parsePhoneNumberFromString } from "libphonenumber-js";

const names = typeof Intl !== "undefined" && Intl.DisplayNames ? new Intl.DisplayNames(["en"], { type: "region" }) : null;

export function countryFlag(country) {
  return country.toUpperCase().replace(/./g, (letter) => String.fromCodePoint(127397 + letter.charCodeAt(0)));
}

export function countryOptions() {
  return getCountries()
    .map((country) => ({ country, name: names?.of(country) || country, callingCode: getCountryCallingCode(country), flag: countryFlag(country) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function parseSignupPhone(value, country = "IN") {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  const candidate = raw.startsWith("+") ? `+${digits}` : `+${getCountryCallingCode(country)}${digits.replace(/^0+/, "")}`;
  try {
    const phone = parsePhoneNumberFromString(candidate, country);
    if (!phone?.isValid() || !phone.country) return null;
    return phone;
  } catch { return null; }
}

export function splitInternationalPhone(value, fallbackCountry = "IN") {
  const raw = String(value || "").trim();
  if (!raw) return { country: fallbackCountry, nationalNumber: "" };
  try {
    const phone = parsePhoneNumberFromString(raw, fallbackCountry);
    if (phone?.country) return { country: phone.country, nationalNumber: phone.nationalNumber };
  } catch { /* Keep the original value editable if it cannot be parsed. */ }
  return { country: fallbackCountry, nationalNumber: raw.replace(/^\+\d{1,4}\s*/, "") };
}
