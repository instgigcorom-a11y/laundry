import * as PhoneInputPackage from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

const PhoneInput = PhoneInputPackage.default?.default || PhoneInputPackage.default;

export function Button({ children, loading, ...props }) { return <button className="button" disabled={loading || props.disabled} {...props}>{loading ? "Please wait..." : children}</button>; }
export function Field({ label, error, ...props }) { return <label className="field"><span>{label}</span><input {...props} />{error && <small className="error">{error}</small>}</label>; }
export function Status({ loading, error, empty, children }) { if (loading) return <p className="state">Loading...</p>; if (error) return <p className="state error">{error}</p>; if (empty) return <p className="state">{empty}</p>; return children; }

export function InternationalPhoneField({ country, value, onChange, label = "Mobile number", hint, required = false }) {
  return <label className="international-phone-field"><span>{label}</span><PhoneInput country={String(country || "IN").toLowerCase()} value={value || ""} onChange={(digits) => onChange(digits ? `+${digits}` : "")} preferredCountries={["in", "gb", "us", "ae", "sa", "ca", "au"]} enableSearch disableSearchIcon countryCodeEditable={false} specialLabel="" inputProps={{ required, autoComplete: "tel", inputMode: "tel", "aria-label": label }} containerClass="international-phone-controls" inputClass="international-phone-input" buttonClass="international-phone-button" dropdownClass="international-phone-dropdown" searchClass="international-phone-search" placeholder="Mobile number" />{hint && <small className="phone-hint">{hint}</small>}</label>;
}
