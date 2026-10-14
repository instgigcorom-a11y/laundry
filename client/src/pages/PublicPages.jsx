import { useContext, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { starterCatalog, rateCategories } from '../data/starterCatalog.js';
import { areaGroups, SITE_URL } from '../data/publicPages.js';
import { SHOP_ADDRESS, SHOP_MAP_URL, SHOP_PHONE, SHOP_PHONE_TEL, SHOP_WHATSAPP_URL } from '../data/shopDetails.js';
import { AuthContext } from '../context/AuthContext.jsx';
import { CartContext } from '../context/CartContext.jsx';

const everyday = starterCatalog.filter(item => item.category === 'everyday');
const price = item => `${item.from ? 'From ' : ''}Rs ${item.price} / ${item.unit}`;

function Actions() {
  return <div className="hero-actions"><a className="button" href={SHOP_WHATSAPP_URL} target="_blank" rel="noreferrer">WhatsApp the shop</a><a className="text-link" href={`tel:${SHOP_PHONE_TEL}`}>Call {SHOP_PHONE}</a></div>;
}

function RateTable({ items, caption }) {
  return <div className="public-table"><table><caption>{caption}</caption><thead><tr><th scope="col">Item</th><th scope="col">Service</th><th scope="col">Rate</th></tr></thead><tbody>{items.map(item => <tr key={item.id}><th scope="row">{item.baseName}</th><td>{item.service}</td><td>{price(item)}</td></tr>)}</tbody></table></div>;
}

export function PublicContentPage({ page }) {
  const { user } = useContext(AuthContext);
  const { items } = useContext(CartContext);
  useEffect(() => {
    document.title = page.title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', page.description);
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
    canonical.href = SITE_URL + page.path;
    window.scrollTo(0, 0);
  }, [page]);
  const path = page.path;
  return <section className="public-page home">
    {path === '/' && <div className="home-welcome"><p>Hello, {user?.name?.split(' ')[0] || 'there'}</p>{user ? <Link to="/cart">Your bag {items.length ? `(${items.length})` : 'is empty'}</Link> : <Link to="/login">Log in to place an order</Link>}</div>}
    <div className="home-title"><p className="eyebrow">Prem Power Laundry · Amritsar</p><h1>{page.h1}</h1></div>
    {path === '/' && <>
      <p>Laundry, dry cleaning and pressing from our shop in Gurlal Bazar, New Partap Nagar. Choose care for your everyday clothes or check item-wise rates before arranging an order.</p>
      <div className="quick-grid">{everyday.map(item => <Link key={item.id} to={item.service === 'Dry clean' ? '/dry-cleaning-amritsar/' : '/laundry-service-amritsar/'} className="quick-service"><span>{item.name}</span><strong>{price(item)}</strong></Link>)}</div>
      <Link className="rate-list-link" to="/pricing/"><span>Published rate card</span><b>View pricing &gt;</b></Link>
      <Actions />
      <div className="how public-section"><p className="eyebrow">Arrange your order</p><div className="how-grid"><article><h2>Choose a service</h2><p>Compare laundry by weight with item-wise dry cleaning and pressing.</p></article><article><h2>Confirm collection</h2><p>Visit the shop or contact us to check pickup coverage for your address.</p></article><article><h2>Book online</h2><p><Link to="/products">Browse the live catalogue</Link>, log in and add items to your bag.</p></article><article><h2>Track your order</h2><p>Use <Link to="/orders">Orders</Link> after booking to follow progress and payment.</p></article></div></div>
      <p>See our <Link to="/areas-we-serve/">nearby area guide</Link> or <Link to="/contact/">contact and directions</Link> before planning collection.</p>
    </>}
    {path === '/laundry-service-amritsar/' && <>
      <p>For everyday laundry in Amritsar, our published catalogue includes wash &amp; fold and wash &amp; press by weight. Choose the service based on whether you need pressing included.</p>
      <div className="public-grid"><article className="card"><h2>Wash &amp; fold</h2><p>Laundry by weight at {price(everyday[0])}. Select this service when you want washing and folding.</p></article><article className="card"><h2>Wash &amp; press</h2><p>Laundry by weight with pressing at {price(everyday[1])}. Choose this option when you need clothes pressed as well.</p></article></div>
      <h2>Before you arrange collection</h2><p>Tell us what you need cleaned and share any care labels or specific concerns. Ask the shop to confirm suitability, collection arrangements and the expected return date for your order.</p>
      <p>Check <Link to="/areas-we-serve/">candidate nearby areas</Link> and confirm pickup for your full address. You can also bring your clothes to our shop in Gurlal Bazar.</p>
      <Actions /><p>Need item-wise care? See <Link to="/dry-cleaning-amritsar/">dry cleaning</Link>, <Link to="/pricing/">all published rates</Link> or <Link to="/products">book from the live catalogue</Link>.</p>
    </>}
    {path === '/dry-cleaning-amritsar/' && <>
      <p>Our Amritsar rate card lists dry cleaning for men’s wear, women’s wear, winter wear, household items, shoes and bags. Find the specific item before choosing a service.</p>
      <RateTable caption="Selected garment dry cleaning rates" items={starterCatalog.filter(item => item.category === 'men' && item.service === 'Dry clean').slice(0, 5)} />
      <h2>Discuss the item with the shop</h2><p>Share the garment type, fabric or care label and any stains or concerns. Rates marked “From” depend on the work after inspection. Contact us to confirm the treatment, final price and return date for your item.</p>
      <p>The catalogue also lists steam pressing for selected garments. Review <Link to="/pricing/">the full rate card</Link> to compare the available options for each item.</p>
      <Actions /><p><Link to="/contact/">Visit our Gurlal Bazar shop</Link> or confirm pickup availability before <Link to="/products">placing an online order</Link>.</p>
    </>}
    {path === '/areas-we-serve/' && <>
      <p>These 39 candidate nearby areas are grouped by approximate distance from our shop to mapped area points. The bands are a guide, rather than exact travel distances to individual addresses.</p>
      <div className="rate-note"><b>Confirm coverage before booking pickup</b><span>Listing an area does not guarantee pickup at every address. Send your full address, landmark and laundry requirements so we can confirm availability and collection arrangements.</span></div>
      <div className="public-grid">{areaGroups.map(([band, areas]) => <article className="card" key={band}><h2>{band}</h2><ul className="area-list">{areas.map(area => <li key={area}>{area}</li>)}</ul></article>)}</div>
      <Actions /><h2>Prefer to visit?</h2><p>You can contact us about shop drop-off at {SHOP_ADDRESS}. <Link to="/contact/">Get directions and visit details</Link>.</p>
      <p>Compare <Link to="/laundry-service-amritsar/">laundry</Link>, <Link to="/dry-cleaning-amritsar/">dry cleaning</Link> and <Link to="/pricing/">published prices</Link> before getting in touch.</p>
    </>}
    {path === '/pricing/' && <>
      <p>Use our published rate card to compare laundry, dry cleaning and pressing. Rates below come from the project’s public catalogue. Check the <Link to="/products">live ordering catalogue</Link> or contact the shop to confirm current rates before booking.</p>
      <div className="rate-note"><b>How to read the rates</b><span>“From” means a starting price, with the final price depending on the work after inspection. kg = kilogram; pc = piece; set and pair apply where shown. Confirm pickup charges and the final order total with the shop.</span></div>
      <RateTable caption="Everyday laundry" items={everyday} />
      {rateCategories.map(category => <RateTable key={category.id} caption={category.label} items={starterCatalog.filter(item => item.category === category.id)} />)}
      <Actions />
    </>}
    {path === '/about/' && <>
      <p>Prem Power Laundry is based at Shop no. 4 in New Partap Nagar Maine, Gurlal Bazar, Amritsar. Our public catalogue brings laundry, dry cleaning and pressing options together so you can compare services before placing an order.</p>
      <h2>Care options in one catalogue</h2><p>Choose wash &amp; fold or wash &amp; press by weight, or check item-wise rates for garments and household items. Selected shoes and bags also appear in the dry cleaning rate card.</p>
      <h2>Talk to the shop or book online</h2><p>Call or WhatsApp us about your items and address. Online customers can browse services, add items to their bag and follow the existing booking and order tracking steps.</p>
      <p>Find <Link to="/pricing/">published prices</Link>, read our <Link to="/areas-we-serve/">nearby area guide</Link>, or <Link to="/contact/">plan a visit</Link>.</p><Actions />
    </>}
    {path === '/contact/' && <>
      <p>Contact Prem Power Laundry about a service, a rate or a visit to our Amritsar shop. For pickup enquiries, share your full address so we can confirm coverage.</p>
      <article className="shop-card"><div><p className="eyebrow">Visit our shop</p><h2>Prem Power Laundry</h2><address>{SHOP_ADDRESS}</address><p><a href={`tel:${SHOP_PHONE_TEL}`}>{SHOP_PHONE}</a></p></div><a href={SHOP_MAP_URL} target="_blank" rel="noreferrer">Get directions</a></article>
      <Actions /><h2>Help us answer your enquiry</h2><p>Include the service you need, the garment or item type and the quantity or approximate laundry weight. For collection, include your area and landmark. For an existing order, have your order number ready.</p>
      <h2>Planning a visit</h2><p>Call or WhatsApp to confirm opening hours and arrangements before travelling. Use the directions link to locate the shop in Gurlal Bazar.</p>
      <p>See <Link to="/pricing/">pricing</Link> or <Link to="/products">the live catalogue</Link> before booking.</p>
    </>}
  </section>;
}
