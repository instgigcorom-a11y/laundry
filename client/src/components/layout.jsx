import { Link, useLocation, useNavigate } from "react-router-dom";
import { useContext, useEffect, useRef, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { CartContext } from "../context/CartContext";
import { BookingContext } from "../context/BookingContext";
import { GoogleTranslate } from "./GoogleTranslate";
import { shopService } from "../services/shopService";
import { showToast } from "../utils/toast";

function orderAlertCopy(order) {
  const customer = order.deliveryAddress?.name || "Customer";
  return `New order #${order.token} from ${customer}.`;
}

function vapidKeyBytes(value) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const decoded = window.atob(base64);
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

function AdminOrderNotifier() {
  const [enabled, setEnabled] = useState(() => localStorage.getItem("ppl_order_alerts") === "on");
  const enabledRef = useRef(enabled);
  const knownOrderIds = useRef(null);
  const audioContext = useRef(null);

  useEffect(() => { enabledRef.current = enabled; }, [enabled]);

  async function playChime() {
    try {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) return;
      const context = audioContext.current || new Context();
      audioContext.current = context;
      if (context.state === "suspended") await context.resume();
      [[784, 0], [1047, 0.26], [1319, 0.52], [1047, 0.78]].forEach(([frequency, offset]) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const start = context.currentTime + offset;
        oscillator.type = "triangle";
        oscillator.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.52, start + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.24);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(start);
        oscillator.stop(start + 0.26);
      });
    } catch {
      // A browser can block audio until the admin enables alerts with a click.
    }
  }

  async function subscribeToPush(requestPermission = false) {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return false;
    try {
      const config = await shopService.pushConfig();
      if (!config.enabled || !config.publicKey) return false;
      if (Notification.permission === "default" && requestPermission) await Notification.requestPermission();
      if (Notification.permission !== "granted") return false;
      const registration = await navigator.serviceWorker.register("/push-sw.js");
      await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidKeyBytes(config.publicKey) });
      await shopService.savePushSubscription(subscription.toJSON());
      return true;
    } catch {
      return false;
    }
  }

  async function unsubscribeFromPush() {
    try {
      const registration = await navigator.serviceWorker?.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      if (!subscription) return;
      await shopService.deletePushSubscription(subscription.endpoint);
      await subscription.unsubscribe();
    } catch {
      // Local alerts can still be disabled if an old push subscription cannot be removed.
    }
  }

  async function enableAlerts() {
    const next = !enabled;
    setEnabled(next);
    localStorage.setItem("ppl_order_alerts", next ? "on" : "off");
    if (!next) { void unsubscribeFromPush(); return showToast("New order alerts paused.", "info"); }
    void playChime();
    const pushEnabled = await subscribeToPush(true);
    showToast(pushEnabled ? "New order alerts enabled, even when this browser is closed." : "New order alerts enabled while this page is open.", pushEnabled ? "success" : "info");
  }

  useEffect(() => { if (enabled) void subscribeToPush(false); }, [enabled]);

  useEffect(() => {
    function enableFromMobileMenu() {
      if (enabledRef.current) { void playChime(); showToast("Order alert sound played.", "info"); }
      else void enableAlerts();
    }
    window.addEventListener("ppl-enable-order-alerts", enableFromMobileMenu);
    return () => window.removeEventListener("ppl-enable-order-alerts", enableFromMobileMenu);
  }, [enabled]);

  useEffect(() => {
    let active = true;
    async function checkOrders() {
      try {
        const { orders = [] } = await shopService.adminOrders();
        if (!active) return;
        const ids = new Set(orders.map((order) => order.id));
        if (knownOrderIds.current) {
          if (enabledRef.current) orders.filter((order) => !knownOrderIds.current.has(order.id)).forEach((order) => {
            showToast(orderAlertCopy(order), "info");
            void playChime();
            if (document.hidden && "Notification" in window && Notification.permission === "granted") new Notification("Prem Power Laundry", { body: orderAlertCopy(order) });
          });
        }
        knownOrderIds.current = ids;
      } catch {
        // The Orders page retains its own visible API error state.
      }
    }
    void checkOrders();
    const timer = window.setInterval(checkOrders, 20000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  return <span className="admin-alert-controls"><button className={`admin-alert-toggle ${enabled ? "on" : ""}`} type="button" onClick={enableAlerts} aria-pressed={enabled}>{enabled ? "Alerts on" : "Enable alerts"}</button>{enabled && <button className="admin-alert-test" type="button" onClick={() => { void playChime(); showToast("Order alert sound played.", "info"); }}>Test sound</button>}</span>;
}

function MobileLink({ to, label, marker, active, badge, onClick }) {
  return <Link to={to} className={active ? "active" : ""} onClick={onClick}>
    <span className="mobile-nav-icon" aria-hidden="true">{marker}</span>
    <span className="mobile-nav-label">{label}{badge ? <i className="mobile-bag-count">{badge}</i> : null}</span>
  </Link>;
}

export function Layout({ children }) {
  const { user, logout } = useContext(AuthContext);
  const { items } = useContext(CartContext);
  const { booking } = useContext(BookingContext);
  const location = useLocation();
  const navigate = useNavigate();
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const admin = user?.role === "admin";
  const path = location.pathname;
  const bookingBack = {
    "/cart": "/products", "/schedule": "/cart", "/addresses": "/schedule",
    "/addresses/new": "/addresses", "/payment-method": booking.mode === "drop" ? "/cart" : "/addresses"
  }[path];
  const bagActive = ["/cart", "/schedule", "/addresses", "/addresses/new", "/payment-method"].includes(path);

  async function leave() { await logout(); navigate("/login"); }

  return <>
    <header>
      <Link to={admin ? "/admin" : "/"} className="brand">Prem Power Laundry</Link>
      <nav className="desktop-nav" aria-label="Primary navigation">
        {admin ? <><Link to="/admin">Dashboard</Link><Link to="/admin/orders">Orders</Link><Link to="/admin/customers">Parties</Link><Link to="/admin/invoices">Invoices</Link><Link to="/admin/services">Services</Link><Link to="/admin/settings">Settings</Link><AdminOrderNotifier /></> : user ? <><Link to="/products">Services</Link><Link to="/cart">Cart ({items.length})</Link><Link to="/orders">Orders</Link></> : <><Link to="/products">Services</Link><Link to="/login">Log in</Link></>}
        {user && <><GoogleTranslate /><button onClick={leave}>Logout</button></>}
      </nav>
    </header>
    <main>{bookingBack && <Link className="booking-back" to={bookingBack}>Back</Link>}{children}</main>
    {user && !admin && <nav className="mobile-nav" aria-label="Mobile navigation">
      <MobileLink to="/" label="Home" marker="H" active={path === "/"} />
      <MobileLink to="/products" label="Rates" marker="R" active={path.startsWith("/products")} />
      <MobileLink to="/cart" label="Bag" marker="B" badge={items.length || null} active={bagActive} />
      <MobileLink to="/orders" label="Orders" marker="O" active={path.startsWith("/orders") || path.startsWith("/confirmation") || path.startsWith("/payment/")} />
      <MobileLink to="/account" label="Account" marker="A" active={path.startsWith("/account")} />
    </nav>}
    {admin && <>
      {adminMenuOpen && <div id="admin-more-menu" className="admin-mobile-menu" role="menu" aria-label="More admin navigation">
        <Link to="/admin/services" role="menuitem" onClick={() => setAdminMenuOpen(false)}>Services</Link>
        <Link to="/admin/settings" role="menuitem" onClick={() => setAdminMenuOpen(false)}>Invoice settings</Link>
        <button type="button" role="menuitem" onClick={() => window.dispatchEvent(new Event("ppl-enable-order-alerts"))}>Order alerts / test sound</button>
        <button type="button" role="menuitem" onClick={leave}>Logout</button>
      </div>}
      <nav className="mobile-nav admin-mobile-nav" aria-label="Admin mobile navigation">
        <MobileLink to="/admin" label="Home" marker="D" active={path === "/admin"} onClick={() => setAdminMenuOpen(false)} />
        <MobileLink to="/admin/orders" label="Orders" marker="O" active={path.startsWith("/admin/orders")} onClick={() => setAdminMenuOpen(false)} />
        <MobileLink to="/admin/customers" label="Parties" marker="P" active={path.startsWith("/admin/customers")} onClick={() => setAdminMenuOpen(false)} />
        <MobileLink to="/admin/invoices" label="Invoices" marker="I" active={path.startsWith("/admin/invoices")} onClick={() => setAdminMenuOpen(false)} />
        <button type="button" className={adminMenuOpen || path.startsWith("/admin/services") || path.startsWith("/admin/settings") ? "active" : ""} onClick={() => setAdminMenuOpen((open) => !open)} aria-expanded={adminMenuOpen} aria-controls="admin-more-menu">
          <span className="mobile-nav-icon" aria-hidden="true">M</span>
          <span className="mobile-nav-label">More</span>
        </button>
      </nav>
    </>}
  </>;
}
