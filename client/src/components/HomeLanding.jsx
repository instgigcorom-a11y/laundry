import { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.jsx';
import { CartContext } from '../context/CartContext.jsx';
import { starterCatalog } from '../data/starterCatalog.js';
import { SHOP_ADDRESS, SHOP_MAP_URL, SHOP_PHONE, SHOP_PHONE_TEL, SHOP_WHATSAPP_URL } from '../data/shopDetails.js';
import { BusinessFaqs } from './BusinessFaqs.jsx';
import './homeLanding.css';

function CareIcon({ name, ...props }) {
  const paths = {
    wash: <><rect x="5" y="3" width="22" height="27" rx="3" /><path d="M5 10h22M9 6.5h1m4 0h1" /><circle cx="16" cy="20" r="7" /><path d="M11 21c3-4 6 4 10-1" /></>,
    shirt: <path d="m10 4-7 5 4 7 4-2v15h10V14l4 2 4-7-7-5c-1 5-11 5-12 0Z" />,
    hanger: <><path d="M13 8a3 3 0 1 1 5 2c-1 1-2 1-2 4M16 14 3 25c-1 1 0 3 2 3h22c2 0 3-2 2-3L16 14Z" /></>,
    iron: <><path d="M5 27h23l-3-13H12L4 24v3ZM13 9h8l2 5M4 23h23M18 18h3" /></>,
    leaf: <><path d="M16 29c-2-10 4-18 11-23 4 12-1 20-10 20M15 25C5 25 2 17 5 9c8 3 12 8 10 16ZM10 17l6 12M22 15l-6 14" /></>,
    shield: <><path d="M16 3c4 3 7 4 11 4v10c0 6-7 11-11 13-4-2-11-7-11-13V7c4 0 7-1 11-4Z" /><path d="m10 16 4 4 8-9" /></>,
    truck: <><path d="M3 8h16v16H3ZM19 13h6l5 6v5H19M22 14v6h7" /><circle cx="9" cy="25" r="3" /><circle cx="24" cy="25" r="3" /><path d="M1 13h8M1 18h6" /></>,
    user: <><circle cx="16" cy="9" r="5" /><path d="M7 28v-4a9 9 0 0 1 18 0v4H7Z" /></>,
  };
  return <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>;
}

const navItems = [['/', 'Home'], ['/products', 'Services'], ['/pricing/', 'Price List'], ['/about/', 'About'], ['/contact/', 'Contact']];

export function HomeHeader({ user, itemCount, onLogout }) {
  return <header className="landing-header">
    <Link to="/" className="landing-brand" aria-label="Prem Power Laundry home"><img src="/prem-power-laundry-logo.svg" width="188" height="56" alt="Prem Power Laundry" /></Link>
    <nav className="landing-desktop-links" aria-label="Primary navigation">{navItems.map(([path, label]) => <Link key={path} to={path} aria-current={path === '/' ? 'page' : undefined}>{label}</Link>)}</nav>
    <Link className="landing-login" to={user ? '/products' : '/login'}><CareIcon name="user" /><span>{user ? 'Place an Order' : 'Log in / Place an Order'}</span></Link>
    <details className="landing-mobile-menu"><summary>Menu <span aria-hidden="true">☰</span></summary><nav aria-label="More navigation">{navItems.map(([path, label]) => <Link key={path} to={path} onClick={event => event.currentTarget.closest('details')?.removeAttribute('open')}>{label}</Link>)}<Link to="/areas-we-serve/">Areas we serve</Link>{user && <><Link to="/cart">Your bag ({itemCount})</Link><Link to="/orders">Your orders</Link><Link to="/account">Your account</Link><button onClick={onLogout}>Log out</button></>}</nav></details>
  </header>;
}

const benefits = [
  ['leaf', 'Clean & Fresh', 'Care for your everyday clothes'],
  ['shield', 'Choose Your Care', 'Laundry, dry clean or pressing'],
  ['truck', 'Convenient Location', 'Gurlal Bazar, New Partap Nagar'],
  ['rupee', 'Clear Prices', 'Published rates before you book'],
];
const steps = [
  ['Bring / Place Order', 'Visit our shop or place an order online', '/products'],
  ['Choose Your Care', 'Match each item to its cleaning or pressing service', '/pricing/'],
  ['Confirm Arrangements', 'Check collection coverage and your return date', '/contact/'],
  ['Collect / Get Delivered', 'Follow your order and confirm handover with the shop', '/orders'],
];

export function HomeLanding({ page }) {
  const { user } = useContext(AuthContext);
  const { itemCount } = useContext(CartContext);
  const services = starterCatalog.filter(item => item.category === 'everyday');
  const destinations = ['/laundry-service-amritsar/', '/laundry-service-amritsar/', '/dry-cleaning-amritsar/', '/steam-press-amritsar/'];
  return <div className="home-landing">
    <section className="landing-hero" aria-labelledby="landing-title">
      <div className="landing-photo"><img src="/images/home-laundry-hero-768.webp" srcSet="/images/home-laundry-hero-480.webp 480w, /images/home-laundry-hero-768.webp 768w, /images/home-laundry-hero-1145.webp 1145w" sizes="(max-width: 560px) 90vw, (max-width: 850px) 38vw, 47vw" alt="Folded green and ivory laundry on a counter in a softly lit laundry room" width="1145" height="1374" fetchPriority="high" decoding="async" /><span className="landing-photo-caption">Laundry care, thoughtfully arranged.</span></div>
      <div className="landing-copy"><p className="landing-eyebrow">Prem Power Laundry · Amritsar</p><h1 id="landing-title">{page.h1}</h1><p className="landing-intro">Laundry, dry cleaning and pressing from our shop in Gurlal Bazar, New Partap Nagar. Choose care for your everyday clothes and compare our published rates before arranging an order.</p><div className="hero-actions landing-booking"><a className="button" data-conversion="whatsapp" data-service="/" href={SHOP_WHATSAPP_URL} target="_blank" rel="noreferrer">Book Pickup on WhatsApp</a><a className="text-link" data-conversion="call" href={`tel:${SHOP_PHONE_TEL}`}>Call Now</a></div><p className="landing-pickup-note">Send your address to confirm pickup availability, charges and return date.</p><span className="landing-handwritten" aria-hidden="true">Fresh<br />Clean<br />Confident<br /><i>Everyday</i></span></div>
      <div className="landing-services">{services.map((service, index) => <Link key={service.id} to={destinations[index]} className={`landing-service landing-service-${index + 1}`}><CareIcon name={['wash', 'shirt', 'hanger', 'iron'][index]} /><span className="landing-service-name">{service.name}</span><strong>{service.from ? 'From ' : ''}Rs {service.price} / {service.unit}</strong><span className="landing-card-arrow" aria-hidden="true">→</span></Link>)}</div>
    </section>
    <section className="landing-benefits" aria-label="Laundry care at Prem Power Laundry">{benefits.map(([icon, heading, text]) => <article key={heading}><span className="landing-benefit-icon">{icon === 'rupee' ? '₹' : <CareIcon name={icon} />}</span><div><h2>{heading}</h2><p>{text}</p></div></article>)}</section>
    <section className="landing-how" aria-labelledby="landing-how-title"><p className="landing-eyebrow">How it works</p><h2 id="landing-how-title">Easy, Quick &amp; Hassle-Free</h2><ol>{steps.map(([heading, text, path], index) => <li key={heading}><span className="landing-step-number">{index + 1}</span><h3><Link to={path}>{heading}</Link></h3><p>{text}</p></li>)}</ol></section>
    <div className="landing-lower">
      {user && <div className="landing-account"><p>Welcome back, {user.name?.split(' ')[0] || 'there'}.</p><Link to="/cart">Your bag ({itemCount})</Link><Link to="/orders">Track your orders</Link><Link to="/account">Your account</Link></div>}
      <section className="landing-shop" aria-labelledby="landing-shop-heading"><div><p className="landing-eyebrow">Your local laundry shop</p><h2 id="landing-shop-heading">Visit us in Gurlal Bazar</h2><address>{SHOP_ADDRESS}</address><p>Check our <Link to="/areas-we-serve/">39-area guide</Link> and contact us to confirm pickup for your full address, any collection charges and your return date.</p></div><div className="landing-shop-actions"><a className="button" data-conversion="whatsapp" href={SHOP_WHATSAPP_URL} target="_blank" rel="noreferrer">WhatsApp the shop</a><a data-conversion="call" href={`tel:${SHOP_PHONE_TEL}`}>Call {SHOP_PHONE}</a><a href={SHOP_MAP_URL} target="_blank" rel="noreferrer">Get directions →</a><Link data-conversion="pricing" to="/pricing/">See the full price list →</Link></div></section>
      <BusinessFaqs />
    </div>
  </div>;
}
