import { useContext, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CartContext } from "../context/CartContext";
import { AuthContext } from "../context/AuthContext";
import { BookingContext } from "../context/BookingContext";
import { shopService } from "../services/shopService";
import { Button, Field, Status } from "../components/common";

const rupees = (value) => `Rs ${Number(value || 0).toFixed(0)}`;
const PICKUP_FEE = 30;
const DROP_DISCOUNT = 20;
const READY_DAYS = 3;
const timeSlots = ["08:00 - 10:00", "10:00 - 12:00", "12:00 - 14:00", "14:00 - 16:00", "16:00 - 18:00", "18:00 - 20:00"];
const pause = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));
async function loadPublicProducts() {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try { return await shopService.products(); }
    catch (error) { lastError = error; if (attempt < 2) await pause(800 * (attempt + 1)); }
  }
  throw lastError;
}
function savedAddressKey(user) { return user?.id ? `ppl_addresses:${user.id}` : null; }
function formatDate(date) { return date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }); }
function daysFromToday(count = 6) { return Array.from({ length: count }, (_, index) => { const date = new Date(); date.setHours(12, 0, 0, 0); date.setDate(date.getDate() + index); return date; }); }
function readyDate(date) { const next = new Date(date); next.setDate(next.getDate() + READY_DAYS); return formatDate(next); }
function addressLabel(address) { return [address?.line1, address?.line2, address?.city, address?.state, address?.pincode].filter(Boolean).join(", "); }
function hasCompleteAddress(address) { return Boolean(address?.line1 && address?.city && address?.state && /^\d{6}$/.test(String(address?.pincode || ""))); }
function addressFromUser(user) { return hasCompleteAddress(user?.address) ? { ...user.address, label: "Home" } : null; }
function storedAddresses(user) { try { const key = savedAddressKey(user); return key ? JSON.parse(localStorage.getItem(key) || "[]") : []; } catch { return []; } }
function saveStoredAddresses(user, addresses) { const key = savedAddressKey(user); if (key) localStorage.setItem(key, JSON.stringify(addresses)); }
function savedAddresses(user) { const home = addressFromUser(user); const stored = storedAddresses(user); return home ? [home, ...stored] : stored; }
function totals(itemsTotal, mode) { const deliveryCharge = mode === "drop" ? -DROP_DISCOUNT : itemsTotal >= 300 ? 0 : PICKUP_FEE; return { deliveryCharge, total: Math.max(0, itemsTotal + deliveryCharge) }; }
function BookingTotal({ itemsTotal, mode }) { const value = totals(itemsTotal, mode); return <div className="booking-total"><div><span>Items</span><b>{rupees(itemsTotal)}</b></div><div><span>{mode === "drop" ? "Shop drop-off discount" : "Pickup & delivery"}</span><b>{value.deliveryCharge < 0 ? `-${rupees(Math.abs(value.deliveryCharge))}` : value.deliveryCharge ? rupees(value.deliveryCharge) : "Free"}</b></div><div className="booking-grand"><span>Total</span><b>{rupees(value.total)}</b></div></div>; }

export function HomePage() {
  const { items } = useContext(CartContext); const { user } = useContext(AuthContext);
  const [services, setServices] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => { let live = true; setLoading(true); setError(""); loadPublicProducts().then(({ products }) => { if (live) setServices((products || []).slice(0, 4)); }).catch(() => { if (live) setError("We could not load today's services."); }).finally(() => { if (live) setLoading(false); }); return () => { live = false; }; }, [reloadKey]);
  return <section className="home"><div className="home-welcome"><p>Hello, {user?.name?.split(" ")[0] || "there"}</p>{user ? <Link to="/cart">Your bag {items.length ? `(${items.length})` : "is empty"}</Link> : <Link to="/login">Log in to place an order</Link>}</div><div className="home-title"><p className="eyebrow">Prem Power Laundry</p><h1>Fresh clothes, right at your door.</h1><p>Trusted laundry care from Gurlal Bazar, Amritsar.</p></div><div className="quick-grid">{services.map((service) => <Link key={service.id} to="/products" className="quick-service"><span>{service.name}</span><strong>{rupees(service.price)}{service.from && "+"}<small>/{service.unit}</small></strong></Link>)}</div>{loading && <p className="state">Loading today&apos;s services...</p>}{error && <p className="state error">{error} <button className="text-button" onClick={() => setReloadKey((value) => value + 1)}>Try again</button></p>}{!loading && !error && !services.length && <p className="state">No services are currently available.</p>}<Link className="rate-list-link" to="/products"><span>Rate list</span><b>See full rate list &gt;</b></Link><article className="shop-card"><div><span className="open-pill">Open today</span><h2>Prem Power Laundry</h2><p>House 1328C, Gali No. 4, New Partap Nagar<br />Gurlal Bazar, Amritsar, Punjab 143001</p><strong>8:00 am - 8:30 pm</strong></div><a href="https://www.google.com/maps/search/?api=1&query=New%20Partap%20Nagar%20Gali%20No%204%20Gurlal%20Bazar%20Amritsar%20143001" target="_blank" rel="noreferrer">Directions</a></article><div className="how"><p className="eyebrow">How it works</p><div className="how-grid"><article><b>1</b><h2>Pick clothes and rates</h2><p>Select every garment and service.</p></article><article><b>2</b><h2>We collect your bag</h2><p>Confirm your pickup booking.</p></article><article><b>3</b><h2>Fresh clothes return</h2><p>Track progress from Orders.</p></article><article><b>4</b><h2>Pay cash or UPI</h2><p>Use the payment QR after booking.</p></article></div></div></section>;
}

export function ProductsPage() {
  const { add, change, itemCount, items } = useContext(CartContext);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [category, setCategory] = useState("");
  const [notice, setNotice] = useState("Shop rate list. A + means the price starts there and depends on the work."); const [loading, setLoading] = useState(true); const [loadError, setLoadError] = useState(""); const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => { let live = true; setLoading(true); setLoadError(""); loadPublicProducts().then(({ products: next }) => { if (!live) return; setProducts(next || []); setCategory((current) => current || next?.[0]?.category || ""); setNotice("Shop rate list. A + means the price starts there and depends on the work."); }).catch(() => { if (live) { setLoadError("Services are temporarily unavailable. Please try again shortly."); setNotice("We are reconnecting to the laundry catalogue."); } }).finally(() => { if (live) setLoading(false); }); return () => { live = false; }; }, [reloadKey]);
  const categories = [...new Map(products.map((product) => [product.category || "everyday", { id: product.category || "everyday", label: product.categoryLabel || "Laundry services", days: product.readyDays || READY_DAYS }])).values()];
  const activeCategory = categories.some((item) => item.id === category) ? category : categories[0]?.id;
  const selected = products.filter((product) => product.category === activeCategory);
  const garments = selected.reduce((groups, product) => { const key = product.baseName || product.name; (groups[key] ||= []).push(product); return groups; }, {});
  const days = categories.find((item) => item.id === activeCategory)?.days || READY_DAYS;
  return <section className="services">
    <div className="page-intro"><div><p className="eyebrow">Rate list</p><h1>Care for every item</h1></div><Link className="bag-link" to="/cart">Bag <b>{itemCount}</b></Link></div>
    <div className="category-tabs">{categories.map((item) => <button className={item.id === activeCategory ? "active" : ""} key={item.id} onClick={() => setCategory(item.id)}>{item.label}</button>)}</div>
    <div className="rate-note"><b>Ready in {days} days</b><span>{notice}</span></div>
    <div className="rate-card-list">{Object.entries(garments).map(([name, variants]) => <article className="rate-card" key={name}>
      <h2>{name}</h2>
      <div className="rate-options">{variants.map((product) => {
        const cartItem = items.find((item) => item.productId === product.id);
        return <div className="service-row" key={product.id}>
          <div className="service-copy"><strong>{product.service || product.description}</strong><span>{product.from ? "Starting price. Final price may vary by work." : `${product.unit} rate`}</span></div>
          <b className="service-price">{rupees(product.price)}{product.from && "+"}<small>/{product.unit}</small></b>
          {cartItem ? <div className="service-stepper" aria-label={`${product.name} quantity`}><button aria-label={`Remove one ${product.name}`} onClick={() => change(product.id, cartItem.quantity - 1)}>-</button><span>{cartItem.quantity}</span><button aria-label={`Add one ${product.name}`} onClick={() => add(product)}>+</button></div> : <button className="add-service" onClick={() => user ? add(product) : navigate("/login", { state: { from: "/products" } })}>Add</button>}
        </div>;
      })}</div>
    </article>)}{loading && <p className="state">Loading services...</p>}{loadError && <p className="state error">{loadError} <button className="text-button" onClick={() => setReloadKey((value) => value + 1)}>Try again</button></p>}{!loading && !loadError && !products.length && <p className="state">No active services are available right now.</p>}</div>
    <Link className="floating-cart" to="/cart">View bag <span>{itemCount ? `${itemCount} item${itemCount > 1 ? "s" : ""}` : "empty"}</span></Link>
  </section>;
}

export function AccountPage() {
  const { user, changePassword, logout } = useContext(AuthContext); const navigate = useNavigate();
  const [form, setForm] = useState({ currentPassword: "", password: "", confirmPassword: "" }); const [error, setError] = useState(""); const [message, setMessage] = useState(""); const [saving, setSaving] = useState(false);
  async function leave() { await logout(); navigate("/login"); }
  async function savePassword(event) {
    event.preventDefault();
    if (!form.currentPassword) return setError("Enter your current password.");
    if (form.password.length < 8) return setError("New password must be at least 8 characters.");
    if (form.password !== form.confirmPassword) return setError("New passwords do not match.");
    setSaving(true); setError(""); setMessage("");
    try { await changePassword(form.currentPassword, form.password); setForm({ currentPassword: "", password: "", confirmPassword: "" }); setMessage("Password changed successfully."); }
    catch (err) { setError(err.message); } finally { setSaving(false); }
  }
  return <section className="account-page"><p className="eyebrow">Account</p><h1>{user?.name}</h1><article className="card"><strong>{user?.phone}</strong><p>{user?.address?.line1 || "Add your delivery address during registration."}</p><p>{user?.address?.city} {user?.address?.pincode}</p></article><section className="card account-password"><h2>Change password</h2><p>Use your current password to choose a new one.</p><form onSubmit={savePassword} noValidate><Field label="Current password" type="password" autoComplete="current-password" value={form.currentPassword} onChange={(event) => setForm({ ...form, currentPassword: event.target.value })} required /><Field label="New password" type="password" autoComplete="new-password" minLength="8" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required /><Field label="Confirm new password" type="password" autoComplete="new-password" minLength="8" value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} required />{error && <p className="error" role="alert">{error}</p>}{message && <p className="success" role="status">{message}</p>}<Button loading={saving}>Update password</Button></form></section><Link className="button" to="/orders">View your orders</Link><Button onClick={leave}>Sign out</Button></section>;
}

export function CartPage() {
  const { items, change, total } = useContext(CartContext); const { booking, update } = useContext(BookingContext); const { user } = useContext(AuthContext); const navigate = useNavigate();
  useEffect(() => { const profileAddress = addressFromUser(user); if (!booking.address && profileAddress) update({ address: profileAddress }); }, [booking.address, update, user]);
  if (!items.length) return <section><h1>Your bag</h1><p className="state">Your bag is empty. <Link to="/products">Browse services</Link></p></section>;
  const delivery = totals(total, booking.mode);
  const pickupText = hasCompleteAddress(booking.address) ? addressLabel(booking.address) : "Select your pickup address in the next step";
  return <section className="booking-page"><div className="booking-head"><p className="eyebrow">Items</p><h1>Your bag</h1><span>EN</span></div><div className="bag-list">{items.map((item) => <article className="bag-item" key={item.productId}><div><h2>{item.name}</h2><p>{item.service || "Laundry care"} · {item.unit}</p></div><div className="bag-controls"><div className="quantity"><button onClick={() => change(item.productId, item.quantity - 1)}>-</button><span>{item.quantity}</span><button onClick={() => change(item.productId, item.quantity + 1)}>+</button></div><b>{rupees(item.price * item.quantity)}</b></div></article>)}</div><h2 className="section-title">How should we collect?</h2><div className="choice-stack"><button className={`booking-choice ${booking.mode === "pickup" ? "selected" : ""}`} onClick={() => update({ mode: "pickup" })}><span className="choice-icon">PU</span><span><b>Pick up from my home</b><small>{pickupText}</small></span></button><button className={`booking-choice ${booking.mode === "drop" ? "selected" : ""}`} onClick={() => update({ mode: "drop" })}><span className="choice-icon">SH</span><span><b>I will drop at the shop</b><small>{rupees(DROP_DISCOUNT)} shop drop-off discount</small></span></button></div><BookingTotal itemsTotal={total} mode={booking.mode} /><p className="ready-note">Ready by - <b>{booking.dateLabel ? booking.readyBy : "3 days after collection"}</b></p><Button onClick={() => navigate(booking.mode === "pickup" ? "/schedule" : "/payment-method")}>Continue {rupees(delivery.total)} {booking.mode === "pickup" ? "Pickup" : "Drop-off"}</Button></section>;
}

export function SchedulePage() {
  const { booking, update } = useContext(BookingContext); const { items, total } = useContext(CartContext); const navigate = useNavigate(); const dates = daysFromToday();
  const selected = dates.find((date) => formatDate(date) === booking.dateLabel) || dates[0];
  function selectDate(date) { update({ dateLabel: formatDate(date), readyBy: readyDate(date) }); }
  if (!items.length) return <CartPage />;
  return <section className="booking-page"><div className="booking-head"><p className="eyebrow">Pickup</p><h1>Pick a day</h1><span>Globe EN</span></div><div className="date-strip">{dates.map((date, index) => <button key={date.toISOString()} className={formatDate(date) === booking.dateLabel || (!booking.dateLabel && index === 0) ? "active" : ""} onClick={() => selectDate(date)}><b>{index === 0 ? "Today" : index === 1 ? "Tomorrow" : date.toLocaleDateString("en-IN", { weekday: "short" })}</b><span>{date.getDate()} {date.toLocaleDateString("en-IN", { month: "short" })}</span></button>)}</div><h2 className="section-title">Pick a time</h2><div className="slot-grid">{timeSlots.map((slot) => <button key={slot} className={booking.slot === slot ? "active" : ""} onClick={() => update({ slot, dateLabel: booking.dateLabel || formatDate(selected), readyBy: booking.readyBy || readyDate(selected) })}>{slot}</button>)}</div><p className="ready-note">Ready by - <b>{booking.readyBy || readyDate(selected)}</b></p><BookingTotal itemsTotal={total} mode="pickup" /><Button disabled={!booking.slot} onClick={() => navigate("/addresses")}>Continue</Button></section>;
}

export function AddressPage() {
  const { user } = useContext(AuthContext); const { booking, update } = useContext(BookingContext); const navigate = useNavigate(); const addresses = savedAddresses(user);
  const selectedExists = hasCompleteAddress(booking.address) && addresses.some((address) => addressLabel(address) === addressLabel(booking.address));
  useEffect(() => { if (selectedExists || (!booking.address && !addresses.length)) return; update({ address: addresses[0] || null }); }, [addresses, booking.address, selectedExists, update]);
  function remove(address) { const next = addresses.filter((entry, index) => index === 0 || addressLabel(entry) !== addressLabel(address)); saveStoredAddresses(user, next.slice(1)); if (addressLabel(booking.address) === addressLabel(address)) update({ address: addresses[0] || null }); }
  return <section className="booking-page"><div className="booking-head"><p className="eyebrow">Address</p><h1>Where should we come?</h1><span>Globe EN</span></div><div className="choice-stack">{addresses.map((address, index) => <article className={`address-choice ${addressLabel(booking.address) === addressLabel(address) ? "selected" : ""}`} key={`${addressLabel(address)}-${index}`}><button onClick={() => update({ address })}><span className="choice-icon">{address.label === "Shop / work" ? "P" : "H"}</span><span><b>{address.label || "Home"}</b><small>{addressLabel(address)}</small>{address.lat && <em>Map pin saved</em>}</span></button>{index > 0 && <button className="delete-address" onClick={() => remove(address)}>Delete</button>}</article>)}</div><button className="add-address" onClick={() => navigate("/addresses/new")}>+ Add a new address</button><Button disabled={!booking.address} onClick={() => navigate("/payment-method")}>Continue</Button></section>;
}

export function AddressFormPage() {
  const { user } = useContext(AuthContext); const { update } = useContext(BookingContext); const navigate = useNavigate(); const [form, setForm] = useState(() => ({ ...addressFromUser(user), label: "Home", line1: "", line2: "", city: "", state: "", pincode: "" })); const [finding, setFinding] = useState(false); const [error, setError] = useState("");
  function set(key, value) { setForm((current) => ({ ...current, [key]: value })); }
  async function locate() { if (!navigator.geolocation) return setError("Location is not available in this browser."); setFinding(true); setError(""); navigator.geolocation.getCurrentPosition(async (position) => { const coords = { lat: position.coords.latitude, lng: position.coords.longitude }; try { const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&addressdetails=1&lat=${coords.lat}&lon=${coords.lng}`); const data = await response.json(); const place = data.address || {}; const locality = place.city || place.town || place.village || place.municipality || place.city_district || place.county || place.suburb || place.neighbourhood || ""; setForm((current) => ({ ...current, ...coords, line1: current.line1 || [place.house_number, place.road || place.pedestrian || place.neighbourhood].filter(Boolean).join(" "), line2: current.line2 || place.suburb || place.neighbourhood || "", city: locality || current.city, state: place.state || place.state_district || current.state, pincode: place.postcode?.replace(/\D/g, "").slice(0, 6) || current.pincode })); if (!locality) setError("We found your map pin, but could not identify the city. Please enter it before saving."); } catch { setForm((current) => ({ ...current, ...coords })); setError("We found your map pin, but could not fill the address. Please complete the fields below."); } finally { setFinding(false); } }, () => { setFinding(false); setError("We could not read your location. Please fill the address below."); }, { enableHighAccuracy: true, timeout: 10000 }); }
  function save(event) { event.preventDefault(); if (!form.line1 || !form.city || !form.state || !/^\d{6}$/.test(form.pincode || "")) return setError("Please fill house number, city, state and a 6-digit PIN code."); const address = { ...form }; saveStoredAddresses(user, [...storedAddresses(user), address]); update({ address }); navigate("/addresses"); }
  return <section className="booking-page"><div className="booking-head"><p className="eyebrow">Address</p><h1>Add a new address</h1><span>Globe EN</span></div><button className="location-button" onClick={locate}>{finding ? "Finding your location..." : "Use my current location"}</button><form className="address-form" onSubmit={save}><label>House / shop number<input value={form.line1} onChange={(event) => set("line1", event.target.value)} /></label><label>Street, gali, mohalla<input value={form.line2} onChange={(event) => set("line2", event.target.value)} /></label><label>Landmark (optional)<input value={form.landmark || ""} onChange={(event) => set("landmark", event.target.value)} /></label><label>Village / city<input value={form.city} onChange={(event) => set("city", event.target.value)} /></label><label>State<input value={form.state} onChange={(event) => set("state", event.target.value)} /></label><label>PIN code<input inputMode="numeric" value={form.pincode} onChange={(event) => set("pincode", event.target.value.replace(/\D/g, "").slice(0, 6))} /></label><p className="save-label">Save as</p><div className="label-tabs">{["Home", "Shop / work", "Other"].map((label) => <button type="button" className={form.label === label ? "active" : ""} onClick={() => set("label", label)} key={label}>{label}</button>)}</div>{error && <p className="error">{error}</p>}<Button type="submit">Save address</Button></form></section>;
}

export function PaymentMethodPage() {
  const { items, total, clear } = useContext(CartContext); const { booking, update, reset } = useContext(BookingContext); const navigate = useNavigate(); const [loading, setLoading] = useState(false); const [error, setError] = useState(""); const bill = totals(total, booking.mode);
  async function confirm() { if (booking.mode === "pickup" && !hasCompleteAddress(booking.address)) { setError("Choose a complete pickup address before confirming."); navigate("/addresses"); return; } setLoading(true); setError(""); try { const { order } = await shopService.createOrder({ items, mode: booking.mode, dateLabel: booking.mode === "drop" ? "Shop drop-off" : booking.dateLabel, slot: booking.mode === "drop" ? "At your convenience" : booking.slot, readyBy: booking.readyBy || "3 days after collection", deliveryAddress: booking.address, paidVia: booking.paidVia }); clear(); reset(); navigate(`/confirmation/${order.id}`); } catch (err) { setError(err.message); } finally { setLoading(false); } }
  if (!items.length) return <CartPage />;
  return <section className="booking-page"><div className="booking-head"><p className="eyebrow">Payment</p><h1>How will you pay?</h1><span>Globe EN</span></div><div className="choice-stack"><button className={`booking-choice ${booking.paidVia === "Cash" ? "selected" : ""}`} onClick={() => update({ paidVia: "Cash" })}><span className="choice-icon">C</span><span><b>Cash</b><small>Pay when the clothes come back</small></span></button><button className={`booking-choice ${booking.paidVia === "UPI" ? "selected" : ""}`} onClick={() => update({ paidVia: "UPI" })}><span className="choice-icon">U</span><span><b>UPI</b><small>Google Pay, PhonePe, Paytm, any app</small></span></button></div><BookingTotal itemsTotal={total} mode={booking.mode} /><article className="booking-details"><b>{booking.mode === "pickup" ? "Pickup" : "Drop-off"}</b><p>{booking.dateLabel} · {booking.slot}</p>{booking.mode === "pickup" && <p>{addressLabel(booking.address)}</p>}</article>{error && <p className="error">{error}</p>}<Button loading={loading} onClick={confirm}>Confirm order {rupees(bill.total)}</Button></section>;
}

export function ConfirmationPage() {
  const { id } = useParams(); const [order, setOrder] = useState(null); const [error, setError] = useState(""); useEffect(() => { shopService.order(id).then(({ order: next }) => setOrder(next)).catch((err) => setError(err.message)); }, [id]);
  return <section className="booking-page"><Status loading={!order && !error} error={error}>{order && <><div className="booking-head"><p className="eyebrow">Prem Power Laundry</p><h1>Order confirmed</h1></div><article className="token-slip"><span>Token number</span><strong>{order.token}</strong><div><p><b>Items</b><span>{order.items.reduce((sum, item) => sum + item.qty, 0)}</span></p><p><b>{order.mode === "pickup" ? "Pickup" : "Drop-off"}</b><span>{order.dateLabel}<br />{order.slot}</span></p><p><b>Ready by</b><span>{order.readyBy}</span></p><p><b>Paying by</b><span>{order.paidVia}</span></p><p className="token-total"><b>Total</b><span>{rupees(order.total)}</span></p></div></article><p className="token-note">Show this token when the clothes are collected or delivered.</p><Link className="button" to="/orders">Track this order</Link><button className="button secondary noprint" onClick={() => window.print()}>Print bill</button>{order.paidVia === "UPI" && <Link className="button secondary" to={`/payment/${order.id}`}>Pay with UPI</Link>}<Link className="text-link" to="/">Back to home</Link></>}</Status></section>;
}
export function OrdersPage() { const [orders, setOrders] = useState([]); const [error, setError] = useState(""); useEffect(() => { shopService.orders().then(({ orders: next }) => setOrders(next)).catch((err) => setError(err.message)); }, []); return <section><h1>Your orders</h1><Status error={error} empty={!error && !orders.length ? "You have not placed an order yet." : ""}>{<div className="list">{orders.map((order) => <Link className="line link" to={`/payment/${order.id}`} key={order.id}><div><strong>Order #{order.token}</strong><small>{new Date(order.createdAt).toLocaleDateString()} - {order.status}</small></div><strong>{rupees(order.total)}</strong></Link>)}</div>}</Status></section>; }
export function PaymentPage() {
  const { id } = useParams(); const [data, setData] = useState(null); const [error, setError] = useState(""); const [submitting, setSubmitting] = useState(false);
  useEffect(() => { shopService.payment(id).then(setData).catch((err) => setError(err.message)); }, [id]);
  async function submitPayment() { setSubmitting(true); setError(""); try { const next = await shopService.submitUpiPayment(id); setData((current) => ({ ...current, ...next, payment: { ...current.payment, ...next.payment } })); } catch (err) { setError(err.message); } finally { setSubmitting(false); } }
  const paymentStatus = data?.payment?.status;
  const statusCopy = paymentStatus === "paid" ? "Payment verified" : paymentStatus === "verification_pending" ? "Payment submitted for verification" : "Waiting for your UPI payment";
  return <section className="payment-page"><Link className="booking-back" to="/orders">Back to orders</Link><h1>Pay by UPI</h1><Status loading={!data && !error} error={error}>{data && <article className="payment card"><p className="eyebrow">Order #{data.order.token}</p><h2>{rupees(data.payment.amount)}</h2>{data.payment.upiId ? <><p>Scan the QR code with any UPI app, then confirm below.</p><img alt="UPI payment QR code" src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(data.payment.qrValue)}`} /><a className="button" href={data.payment.qrValue}>Open your UPI app</a></> : <p className="error">UPI is not configured for the shop yet. Please choose cash or contact the shop.</p>}<p className={`payment-status ${paymentStatus}`}><strong>{statusCopy}</strong></p>{paymentStatus === "pending" && data.payment.upiId && <Button loading={submitting} onClick={submitPayment}>I've completed payment</Button>}{paymentStatus === "verification_pending" && <small>The shop will verify your UPI transfer and update this order. This does not mark the payment as paid automatically.</small>}{paymentStatus === "paid" && <small>Your UPI payment has been verified by Prem Power Laundry.</small>}</article>}</Status></section>;
}
