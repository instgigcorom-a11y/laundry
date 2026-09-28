import { useContext, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { showToast } from "../utils/toast";
import { Button, Field } from "../components/common";
import { countryOptions, parseSignupPhone } from "../utils/phone";

const signupCountries = countryOptions();

function nextPath(user, location) {
  const requested = location.state?.from;
  if (requested && requested.startsWith("/") && !requested.startsWith("//")) return requested;
  return user.role === "admin" ? "/admin" : "/products";
}

function AuthShell({ title, children }) {
  return <section className="auth"><p className="eyebrow">Prem Power Laundry</p><h1>{title}</h1>{children}</section>;
}

function useSignedInRedirect() {
  const { user, loading: sessionLoading } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => { if (user) navigate(nextPath(user, location), { replace: true }); }, [user, location, navigate]);
  return { user, sessionLoading, location };
}

export function LoginPage() {
  const { login } = useContext(AuthContext);
  const { user, sessionLoading, location } = useSignedInRedirect();
  const navigate = useNavigate();
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event) {
    event.preventDefault();
    const identifier = form.identifier.trim();
    if (!identifier || !form.password) return setError("Enter your email/mobile number and password.");
    setLoading(true); setError("");
    try { const signedIn = await login({ identifier, password: form.password }); showToast("Welcome back."); navigate(nextPath(signedIn, location), { replace: true }); }
    catch (err) { setError(err.message); } finally { setLoading(false); }
  }
  if (sessionLoading || user) return <p className="state">Preparing your account...</p>;
  return <AuthShell title="Welcome back"><form onSubmit={submit} noValidate><Field label="Email or mobile number" autoComplete="username" value={form.identifier} onChange={(event) => setForm({ ...form, identifier: event.target.value })} required /><Field label="Password" type="password" autoComplete="current-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required /><p className="auth-helper"><Link to="/forgot-password">Forgot password?</Link></p>{error && <p className="error" role="alert">{error}</p>}<Button loading={loading}>Log in</Button></form><p>New customer? <Link to="/register" state={{ from: location.state?.from }}>Create an account</Link></p></AuthShell>;
}

export function ForgotPasswordPage() {
  const { forgotPassword } = useContext(AuthContext);
  const { user, sessionLoading, location } = useSignedInRedirect();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", mobileNumber: "", password: "", confirmPassword: "" });
  const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  const set = (key, value) => setForm({ ...form, [key]: value });
  async function submit(event) {
    event.preventDefault();
    const mobileNumber = parseSignupPhone(form.mobileNumber, "IN")?.number;
    if (!form.email.trim() || !mobileNumber) return setError("Enter your account email and registered mobile number, including its country code.");
    if (form.password.length < 8) return setError("New password must be at least 8 characters.");
    if (form.password !== form.confirmPassword) return setError("Passwords do not match.");
    setLoading(true); setError("");
    try { const signedIn = await forgotPassword({ email: form.email.trim(), mobileNumber, password: form.password }); showToast("Password updated. You are signed in."); navigate(nextPath(signedIn, location), { replace: true }); }
    catch (err) { setError(err.message); } finally { setLoading(false); }
  }
  if (sessionLoading || user) return <p className="state">Preparing your account...</p>;
  return <AuthShell title="Forgot your password?"><p className="auth-note">Confirm your saved email and registered mobile number, then choose a new password.</p><form className="auth-register-form" onSubmit={submit} noValidate><Field label="Account email" type="email" autoComplete="email" value={form.email} onChange={(event) => set("email", event.target.value)} required /><Field label="Registered mobile number" type="tel" inputMode="tel" autoComplete="tel" placeholder="+91 98765 43210" value={form.mobileNumber} onChange={(event) => set("mobileNumber", event.target.value.replace(/[^\d+\s()-]/g, "").slice(0, 24))} required /><Field label="New password" type="password" autoComplete="new-password" minLength="8" value={form.password} onChange={(event) => set("password", event.target.value)} required /><Field label="Confirm new password" type="password" autoComplete="new-password" minLength="8" value={form.confirmPassword} onChange={(event) => set("confirmPassword", event.target.value)} required />{error && <p className="error" role="alert">{error}</p>}<Button loading={loading}>Verify and update password</Button></form><p>Remembered it? <Link to="/login">Log in</Link></p></AuthShell>;
}

export function RegisterPage() {
  const { register } = useContext(AuthContext);
  const { user, sessionLoading, location } = useSignedInRedirect();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", mobileNumber: "", password: "", confirmPassword: "" });
  const [country, setCountry] = useState("IN");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const set = (key, value) => setForm({ ...form, [key]: value });
  function phoneNumber() { return parseSignupPhone(form.mobileNumber, country)?.number || ""; }
  async function submit(event) {
    event.preventDefault();
    const mobileNumber = phoneNumber();
    if (!form.name.trim() || !form.email.trim()) return setError("Enter your name and email address.");
    if (form.password.length < 8) return setError("Password must be at least 8 characters.");
    if (form.password !== form.confirmPassword) return setError("Passwords do not match.");
    if (!mobileNumber) return setError("Enter a valid international mobile number.");
    setLoading(true); setError("");
    try { const signedIn = await register({ ...form, name: form.name.trim(), email: form.email.trim(), mobileNumber, country }); showToast("Your account is ready."); navigate(nextPath(signedIn, location), { replace: true }); }
    catch (err) { setError(err.message); } finally { setLoading(false); }
  }
  if (sessionLoading || user) return <p className="state">Preparing your account...</p>;
  return <AuthShell title="Create your account"><p className="auth-note">Add your pickup address only when you place an order.</p><form className="auth-register-form" onSubmit={submit} noValidate><Field label="Name" autoComplete="name" value={form.name} onChange={(event) => set("name", event.target.value)} required /><Field label="Email" type="email" autoComplete="email" value={form.email} onChange={(event) => set("email", event.target.value)} required /><div className="international-phone-field"><span>Mobile number</span><div className="international-phone-controls"><label className="country-select"><span className="sr-only">Country</span><select aria-label="Country" value={country} onChange={(event) => { setCountry(event.target.value); set("mobileNumber", ""); }}>{signupCountries.map((entry) => <option value={entry.country} key={entry.country}>{entry.flag} {entry.name} (+{entry.callingCode})</option>)}</select></label><input type="tel" inputMode="tel" autoComplete="tel-national" placeholder="Mobile number" value={form.mobileNumber} onChange={(event) => set("mobileNumber", event.target.value.replace(/[^\d+\s()-]/g, "").slice(0, 24))} required /></div><small className="phone-hint">Used only for your account and order updates.</small></div><Field label="Password" type="password" autoComplete="new-password" minLength="8" value={form.password} onChange={(event) => set("password", event.target.value)} required /><Field label="Confirm password" type="password" autoComplete="new-password" minLength="8" value={form.confirmPassword} onChange={(event) => set("confirmPassword", event.target.value)} required />{error && <p className="error" role="alert">{error}</p>}<Button loading={loading}>Create account</Button></form><p>Already registered? <Link to="/login" state={{ from: location.state?.from }}>Log in</Link></p></AuthShell>;
}
