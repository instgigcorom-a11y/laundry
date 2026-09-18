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
  const [backgroundReady, setBackgroundReady] = useState(false);
  const enabledRef = useRef(enabled);
  const knownOrderIds = useRef(null);
  const announcedOrderIds = useRef(new Set());
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
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return { enabled: false, message: "This browser does not support background push alerts." };
    try {
      // Permission must be requested directly from the button tap. Waiting for an API
      // call first can make browsers reject the prompt as no longer user initiated.
      if (Notification.permission === "default" && requestPermission) await Notification.requestPermission();
      if (Notification.permission !== "granted") return { enabled: false, message: "Allow notifications in your browser site settings, then try again." };
      const config = await shopService.pushConfig();
      if (!config.enabled || !config.publicKey) return { enabled: false, message: config.message || "VAPID keys are not configured on the backend." };
      const registration = await navigator.serviceWorker.register("/push-sw.js");
      await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidKeyBytes(config.publicKey) });
      await shopService.savePushSubscription(subscription.toJSON());
      setBackgroundReady(true);
      return { enabled: true };
    } catch (error) {
      setBackgroundReady(false);
      return { enabled: false, message: error.message || "Could not register this device. Confirm the site uses HTTPS and retry after allowing notifications." };
    }
  }

  async function refreshPushStatus() {
    try {
      const status = await shopService.pushStatus();
      setBackgroundReady(Boolean(status.enabled && status.subscriptions));
    } catch {
      setBackgroundReady(false);
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

  async function testBackgroundAlert() {
    const push = await subscribeToPush(true);
    if (!push.enabled) return showToast(push.message, "error");
    try {
      await shopService.testPushNotification();
      await refreshPushStatus();
      showToast("Background test sent. Hide this tab now and look for the system notification.", "success");
    } catch (error) {
      showToast(error.message || "The backend could not deliver a background alert.", "error");
    }
  }

  async function enableAlerts() {
    const next = !enabled;
    setEnabled(next);
    localStorage.setItem("ppl_order_alerts", next ? "on" : "off");
    if (!next) { void unsubscribeFromPush(); return showToast("New order alerts paused.", "info"); }
    void playChime();
    const push = await subscribeToPush(true);
    showToast(push.enabled ? "Background order alerts are enabled for this device." : `In-page alerts are enabled. ${push.message}`, push.enabled ? "success" : "info");
  }

  useEffect(() => { if (enabled) { void subscribeToPush(false); void refreshPushStatus(); } }, [enabled]);

  useEffect(() => {
    function enableFromMobileMenu() {
      if (enabledRef.current) { void playChime(); showToast("Order alert sound played.", "info"); }
      else void enableAlerts();
    }
    window.addEventListener("ppl-enable-order-alerts", enableFromMobileMenu);
    return () => window.removeEventListener("ppl-enable-order-alerts", enableFromMobileMenu);
  }, [enabled]);

  useEffect(() => {
    const testFromMobileMenu = () => { void testBackgroundAlert(); };
    window.addEventListener("ppl-test-background-alert", testFromMobileMenu);
    return () => window.removeEventListener("ppl-test-background-alert", testFromMobileMenu);
  }, []);

  useEffect(() => {
    function receivePushMessage(event) {
      const data = event.data || {};
      if (data.type !== "ppl-order-alert" || !enabledRef.current || !data.orderId || announcedOrderIds.current.has(data.orderId)) return;
      announcedOrderIds.current.add(data.orderId);
      showToast(data.body || "A new laundry order has arrived.", "info");
      void playChime();
    }
    navigator.serviceWorker?.addEventListener("message", receivePushMessage);
    return () => navigator.serviceWorker?.removeEventListener("message", receivePushMessage);
  }, []);

  useEffect(() => {
    let active = true;
    async function checkOrders() {
      try {
        const { orders = [] } = await shopService.adminOrders();
        if (!active) return;
        const ids = new Set(orders.map((order) => order.id));
        if (knownOrderIds.current) {
          if (enabledRef.current && !document.hidden) orders.filter((order) => !knownOrderIds.current.has(order.id) && !announcedOrderIds.current.has(order.id)).forEach((order) => {
            announcedOrderIds.current.add(order.id);
            showToast(orderAlertCopy(order), "info");
            void playChime();
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

  return <span className="admin-alert-controls"><button className={`admin-alert-toggle ${enabled ? "on" : ""}`} type="button" onClick={enableAlerts} aria-pressed={enabled}>{enabled ? "Alerts on" : "Enable alerts"}</button>{enabled && <><button className="admin-alert-test" type="button" onClick={() => { void playChime(); showToast("Order alert sound played.", "info"); }}>Test sound</button><button className="admin-alert-test" type="button" onClick={() => void testBackgroundAlert()}>Test background</button><small className={backgroundReady ? "push-ready" : "push-not-ready"}>{backgroundReady ? "Background ready" : "Background setup needed"}</small></>}</span>;
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
      <Link to={admin ? "/admin" : "/"} className="brand" aria-label="Prem Power Laundry home"><img className="brand-logo" src="/prem-power-laundry-logo.svg" alt="Prem Power Laundry" /></Link>
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
        <button type="button" role="menuitem" onClick={() => window.dispatchEvent(new Event("ppl-test-background-alert"))}>Test background alert</button>
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
