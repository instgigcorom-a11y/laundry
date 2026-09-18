import { Link, useLocation, useNavigate } from "react-router-dom";
import { useContext, useEffect, useRef, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { CartContext } from "../context/CartContext";
import { BookingContext } from "../context/BookingContext";
import { GoogleTranslate } from "./GoogleTranslate";
import { shopService } from "../services/shopService";
import { showToast } from "../utils/toast";
import { io } from "socket.io-client";
import { API_URL } from "../services/api";

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

function samePushKey(currentKey, expectedKey) {
  if (!currentKey || !expectedKey || currentKey.byteLength !== expectedKey.byteLength) return false;
  const current = new Uint8Array(currentKey);
  return current.every((value, index) => value === expectedKey[index]);
}

function AdminOrderNotifier() {
  const [enabled, setEnabled] = useState(() => localStorage.getItem("ppl_order_alerts") === "on");
  const [backgroundReady, setBackgroundReady] = useState(false);
  const [liveConnected, setLiveConnected] = useState(false);
  const [diagnostics, setDiagnostics] = useState(null);
  const enabledRef = useRef(enabled);
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
      const applicationServerKey = vapidKeyBytes(config.publicKey);
      // A VAPID key rotation invalidates subscriptions created for the old public key.
      if (subscription && !samePushKey(subscription.options?.applicationServerKey, applicationServerKey)) {
        await shopService.deletePushSubscription(subscription.endpoint);
        await subscription.unsubscribe();
        subscription = null;
      }
      if (!subscription) subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
      await shopService.savePushSubscription(subscription.toJSON());
      setBackgroundReady(true);
      await refreshPushStatus();
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
      setDiagnostics((current) => current ? { ...current, backend: status } : current);
      return status;
    } catch {
      setBackgroundReady(false);
      return null;
    }
  }

  async function inspectPushState() {
    const support = {
      notifications: "Notification" in window,
      serviceWorker: "serviceWorker" in navigator,
      pushManager: "PushManager" in window
    };
    const permission = support.notifications ? Notification.permission : "unsupported";
    let worker = { registered: false, active: false, scope: "" };
    let browserSubscription = { exists: false, endpointHost: "", endpointTail: "", keyFingerprint: "" };
    try {
      if (support.serviceWorker) {
        const registration = await navigator.serviceWorker.getRegistration("/");
        worker = { registered: Boolean(registration), active: Boolean(registration?.active), scope: registration?.scope || "" };
        const subscription = await registration?.pushManager.getSubscription();
        if (subscription) {
          const key = subscription.options?.applicationServerKey;
          browserSubscription = {
            exists: true,
            endpointHost: endpointHost(subscription.endpoint),
            endpointTail: subscription.endpoint.slice(-18),
            keyFingerprint: key ? keyFingerprint(new Uint8Array(key)) : ""
          };
        }
      }
    } catch (error) {
      worker.error = error.message;
    }
    let backend = null;
    try { backend = await shopService.pushStatus(); } catch (error) { backend = { enabled: false, message: error.message }; }
    const next = { support, permission, worker, browserSubscription, backend };
    setDiagnostics(next);
    setBackgroundReady(Boolean(backend?.enabled && backend?.subscriptions && browserSubscription.exists));
    return next;
  }

  async function repairAlerts() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      showToast("This browser does not support background push alerts.", "error");
      return;
    }
    try {
      if (Notification.permission === "default") await Notification.requestPermission();
      if (Notification.permission !== "granted") {
        await inspectPushState();
        showToast("Allow notifications in browser site settings, then repair alerts again.", "error");
        return;
      }
      const registration = await navigator.serviceWorker.register("/push-sw.js", { updateViaCache: "none" });
      await registration.update();
      await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await shopService.deletePushSubscription(subscription.endpoint);
        await subscription.unsubscribe();
      }
      const push = await subscribeToPush(true);
      await inspectPushState();
      showToast(push.enabled ? "Background alerts repaired for this browser." : push.message, push.enabled ? "success" : "error");
    } catch (error) {
      await inspectPushState();
      showToast(error.message || "Could not repair background alerts.", "error");
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
      await shopService.testPushNotification(8);
      await inspectPushState();
      showToast("Close this tab now. The background test will arrive in 8 seconds.", "success");
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
    const token = localStorage.getItem("ppl_token");
    if (!token) return undefined;
    const socketUrl = API_URL.replace(/\/api\/?$/, "").replace(/\/$/, "");
    const socket = io(socketUrl || undefined, {
      auth: { token },
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000
    });
    function receiveOrder(order) {
      if (!enabledRef.current || !order?.id || announcedOrderIds.current.has(order.id)) return;
      announcedOrderIds.current.add(order.id);
      showToast(orderAlertCopy(order), "info");
      void playChime();
    }
    socket.on("connect", () => setLiveConnected(true));
    socket.on("disconnect", () => setLiveConnected(false));
    socket.on("connect_error", () => setLiveConnected(false));
    socket.on("order:new", receiveOrder);
    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.off("order:new", receiveOrder);
      socket.disconnect();
    };
  }, []);

  return <span className="admin-alert-controls"><small className={liveConnected ? "push-ready" : "push-not-ready"}>{liveConnected ? "Live connected" : "Live reconnecting"}</small><button className={`admin-alert-toggle ${enabled ? "on" : ""}`} type="button" onClick={enableAlerts} aria-pressed={enabled}>{enabled ? "Alerts on" : "Enable alerts"}</button>{enabled && <><button className="admin-alert-test" type="button" onClick={() => { void playChime(); showToast("Order alert sound played.", "info"); }}>Test sound</button><button className="admin-alert-test" type="button" onClick={() => void testBackgroundAlert()}>Test background</button><button className="admin-alert-test" type="button" onClick={() => void repairAlerts()}>Repair</button><button className="admin-alert-test" type="button" onClick={() => void inspectPushState()}>Check</button><small className={backgroundReady ? "push-ready" : "push-not-ready"}>{backgroundReady ? "Background ready" : "Background setup needed"}</small>{diagnostics && <span className="push-diagnostics" role="status"><b>Permission: {diagnostics.permission}</b><b>SW: {diagnostics.worker.active ? "active" : diagnostics.worker.registered ? "registered" : "missing"}</b><b>Browser sub: {diagnostics.browserSubscription.exists ? "yes" : "no"}</b><b>Backend sub: {diagnostics.backend?.subscriptions || 0}</b><b>Key: {diagnostics.backend?.publicKeyFingerprint || "none"}</b>{diagnostics.backend?.message ? <em>{diagnostics.backend.message}</em> : null}</span>}</>}</span>;
}

function endpointHost(endpoint) {
  try { return new URL(endpoint).host; } catch { return ""; }
}

function keyFingerprint(bytes) {
  let hash = 0;
  bytes.forEach((value) => { hash = ((hash << 5) - hash + value) | 0; });
  return Math.abs(hash).toString(16).slice(0, 8);
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
