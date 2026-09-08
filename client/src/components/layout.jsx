import { Link, useLocation, useNavigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { CartContext } from "../context/CartContext";
import { BookingContext } from "../context/BookingContext";
import { GoogleTranslate } from "./GoogleTranslate";

function MobileLink({ to, label, marker, active, badge }) {
  return <Link to={to} className={active ? "active" : ""}>
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
  </>;
}
