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
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(740, context.currentTime);
      oscillator.frequency.setValueAtTime(988, context.currentTime + 0.16);
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.14, context.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.42);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.44);
    } catch {
      // A browser can block audio until the admin enables alerts with a click.
    }
  }

  async function enableAlerts() {
    const next = !enabled;
    setEnabled(next);
    localStorage.setItem("ppl_order_alerts", next ? "on" : "off");
    if (!next) return showToast("New order alerts paused.", "info");
    void playChime();
    if ("Notification" in window && Notification.permission === "default") await Notification.requestPermission();
    showToast("New order alerts enabled.");
  }

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
