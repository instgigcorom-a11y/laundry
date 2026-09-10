import { Link, useLocation, useNavigate } from "react-router-dom";
import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { CartContext } from "../context/CartContext";
import { BookingContext } from "../context/BookingContext";
import { GoogleTranslate } from "./GoogleTranslate";

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
        {admin ? <><Link to="/admin">Dashboard</Link><Link to="/admin/orders">Orders</Link><Link to="/admin/customers">Parties</Link><Link to="/admin/invoices">Invoices</Link><Link to="/admin/services">Services</Link><Link to="/admin/settings">Settings</Link></> : user ? <><Link to="/products">Services</Link><Link to="/cart">Cart ({items.length})</Link><Link to="/orders">Orders</Link></> : <><Link to="/products">Services</Link><Link to="/login">Log in</Link></>}
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
