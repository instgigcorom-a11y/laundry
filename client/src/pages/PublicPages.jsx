import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { rateCategories } from '../data/starterCatalog.js';
import { formatPublicRate, isDryClean, rateGroups } from '../data/publicRates.js';
import { areaGroups, areaPages } from '../data/publicPages.js';
import { AreaContent } from '../components/AreaContent.jsx';
import { BusinessFaqs } from '../components/BusinessFaqs.jsx';
import { SHOP_ADDRESS, SHOP_HOURS, SHOP_MAP_URL, SHOP_PHONE, SHOP_PHONE_TEL } from '../data/shopDetails.js';
import { HomeLanding } from '../components/HomeLanding.jsx';
import { breadcrumbs, pricingAnchor } from '../data/seo.js';

const standardGroups = [{ id: 'everyday', label: 'Everyday laundry' }, ...rateCategories];

function Actions({ page }) {
  const message = `Hi Prem Power Laundry, I want to enquire about ${page.label.toLowerCase()} in Amritsar.`;
  const whatsapp = `https://wa.me/918146099396?text=${encodeURIComponent(message)}`;
  return <div className="hero-actions"><a className="button" data-conversion="whatsapp" data-service={page.path} href={whatsapp} target="_blank" rel="noreferrer">{page.intro ? `Ask about ${page.label.toLowerCase()}` : 'Book Pickup on WhatsApp'}</a><a className="text-link" data-conversion="call" data-service={page.path} href={`tel:${SHOP_PHONE_TEL}`}>Call Now: {SHOP_PHONE}</a></div>;
}

function RateCard({ rates }) {
  const groups = new Map(rateGroups(rates).map(group => [group.id, group]));
  const sections = standardGroups.map(category => {
    const items = groups.get(category.id)?.items || [];
    groups.delete(category.id);
    return { ...category, items };
  }).concat([...groups.values()]);
  return <>
    <nav className="pricing-jumps" aria-label="Price list sections">{sections.map(section => <a key={section.id} href={`#${section.id}`}>{section.label}</a>)}</nav>
    {sections.map(section => <RateTable id={section.id} key={section.id} caption={section.label} items={section.items} />)}
  </>;
}

function RateTable({ items, caption, id }) {
  if (!items.length) return <div className="rate-note" id={id}><strong>{caption}</strong> <Link to="/products/">See current rates</Link> or ask the shop.</div>;
  return <div className="public-table" id={id}><table><caption>{caption}</caption><thead><tr><th scope="col">Item</th><th scope="col">Service</th><th scope="col">Rate</th></tr></thead><tbody>{items.map(item => <tr key={item.id} id={item.id}><th scope="row">{item.name}</th><td>{item.service}</td><td>{formatPublicRate(item)}</td></tr>)}</tbody></table></div>;
}

export function PublicContentPage({ page, rates }) {
  const { hash } = useLocation();
  const washFold = rates.find(item => item.id === 'starter_everyday_wash-fold');
  const washPress = rates.find(item => item.id === 'starter_everyday_wash-press');
  const guideAnchor = pricingAnchor(page);
  const rateAnchor = guideAnchor.startsWith('starter_') && !rates.some(item => item.id === guideAnchor) ? 'household' : guideAnchor;
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0);
  }, [page, hash]);
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [page, hash, rates]);
  const path = page.path;
  if (path === '/') return <HomeLanding page={page} rates={rates} />;
  return <section className="public-page home">
    <nav className="breadcrumbs" aria-label="Breadcrumb">{breadcrumbs(page).map((item, index, trail) => <span key={item.path}>{index > 0 && ' / '}{index === trail.length - 1 ? <span aria-current="page">{item.name}</span> : <Link to={item.path}>{item.name}</Link>}</span>)}</nav>
    <div className="home-title"><p className="eyebrow">Prem Power Laundry · Amritsar</p><h1>{page.h1}</h1></div>
    {page.kind === 'area' && <AreaContent key={page.path} page={page} areaPages={areaPages} />}
    {page.intro && <>
      <p>{page.intro}</p>
      <Actions page={page} />
      <h2>{page.sectionTitle}</h2><p>{page.detail}</p>
      <RateTable caption={page.rateCaption} items={rates.filter(page.matches)} />
      <p className="rate-note">These are the published catalogue rates. “From” indicates a starting price, with the final price depending on the work. Confirm current prices and any collection charge with the shop before booking.</p>
      <h2>{page.preparationTitle}</h2><p>{page.preparation}</p>
      <h2>Questions about {page.label.toLowerCase()}</h2>
      <div className="service-faq">{page.questions.map(([question, answer]) => <article key={question}><h3>{question}</h3><p>{answer}</p></article>)}</div>
      <article className="card"><h2>Visit Prem Power Laundry in Amritsar</h2><p>{SHOP_ADDRESS}</p><p><Link to="/contact/">Shop contact and directions</Link>. Share your full address to confirm pickup coverage; our <Link to="/areas-we-serve/">nearby area guide</Link> does not guarantee collection at every address.</p><Actions page={page} /></article>
      <p><Link to={page.related}>{page.relatedLabel}</Link>, <Link data-conversion="pricing" to={`/pricing/#${rateAnchor}`}>view {page.label.toLowerCase()} prices</Link> or <Link to="/products">choose items in the live booking catalogue</Link>.</p>
    </>}
    {path === '/laundry-service-amritsar/' && <>
      <p>For everyday laundry in Amritsar, our published catalogue includes wash &amp; fold and wash &amp; press by weight. Choose the service based on whether you need pressing included.</p>
      <div className="public-grid"><article className="card"><h2>Wash &amp; fold</h2><p>Laundry by weight. {washFold && <><strong>{formatPublicRate(washFold)}</strong>. </>}Select this service when you want washing and folding.</p></article><article className="card"><h2>Wash &amp; press</h2><p>Laundry by weight with pressing. {washPress && <><strong>{formatPublicRate(washPress)}</strong>. </>}Choose this option when you need clothes pressed as well.</p></article></div>
      <h2>Before you arrange collection</h2><p>Tell us what you need cleaned and share any care labels or specific concerns. Ask the shop to confirm suitability, collection arrangements and the expected return date for your order.</p>
      <h2>Preparing everyday clothing</h2><p>Count your items, empty pockets and point out stains or damage. Share care labels for delicate or embellished clothing before choosing a weight-based service. Garments needing individual care can be checked against the dry cleaning rate card.</p>
      <h2>How to arrange laundry</h2><ol><li>Choose wash &amp; fold or wash &amp; press and share the approximate weight.</li><li>Send your address on WhatsApp to confirm collection availability and any charges, or arrange shop drop-off.</li><li>Confirm the order total and return date with the shop before handover.</li></ol>
      <h2>Laundry questions</h2><div className="service-faq"><article><h3>Is pressing included?</h3><p>Wash &amp; press includes pressing. Choose wash &amp; fold when you need washing and folding, or <Link to="/steam-press-amritsar/">pressing only</Link> for clothes that are already clean.</p></article><article><h3>How much does laundry cost?</h3><p>Check <Link data-conversion="pricing" to="/pricing/#everyday">laundry prices</Link> and confirm the current total, collection charges and return date before booking.</p></article></div>
      <p>Check <Link to="/areas-we-serve/">nearby areas</Link> and confirm pickup for your full address. You can also bring your clothes to our shop in Gurlal Bazar.</p>
      <Actions page={page} /><p>Need item-wise care? See <Link to="/dry-cleaning-amritsar/">dry cleaning</Link>, <Link to="/pricing/">all published rates</Link> or <Link to="/products">book from the live catalogue</Link>.</p>
    </>}
    {path === '/dry-cleaning-amritsar/' && <>
      <p>Our Amritsar rate card lists dry cleaning for men’s wear, women’s wear, winter wear, household items, shoes and bags. Find the specific item before choosing a service.</p>
      <RateTable caption="Selected garment dry cleaning rates" items={rates.filter(item => item.category === 'men' && isDryClean(item)).slice(0, 5)} />
      <h2>Discuss the item with the shop</h2><p>Share the garment type, fabric or care label and any stains or concerns. Rates marked “From” depend on the work after inspection. Contact us to confirm the treatment, final price and return date for your item.</p>
      <h2>Garments and household items</h2><p>The published catalogue includes shirts, trousers, suits, coats, jackets, kurtas, sarees and lehengas. Check the individual entry and fabric suitability before booking. For household care, see <Link to="/blanket-dry-cleaning-amritsar/">blanket and quilt cleaning</Link> or <Link to="/curtain-dry-cleaning-amritsar/">lined and unlined curtain cleaning</Link>.</p>
      <h2>Arrange care for your items</h2><p>Send an item list and care-label photos, describe any marks or delicate details, and ask the shop to assess the appropriate care. Confirm the final quote, expected return date and shop drop-off or collection arrangements before handing items over.</p>
      <p>Send your full address to confirm pickup availability. Our <Link to="/areas-we-serve/">Amritsar area guide</Link> helps you prepare an enquiry.</p>
      <h2>Dry cleaning questions</h2><div className="service-faq"><article><h3>Are all garments the same price?</h3><p>No. The rate card separates garment types, sets and household items. Check <Link data-conversion="pricing" to="/pricing/#men">garment dry cleaning prices</Link>; entries marked From need a confirmed quote.</p></article><article><h3>Can I book an urgent return?</h3><p>Share the date you need the items before booking. Ask the shop to confirm availability and a return date for your particular order.</p></article></div>
      <p>The catalogue also lists steam pressing for selected garments. Review <Link to="/pricing/">the full rate card</Link> to compare the available options for each item.</p>
      <Actions page={page} /><p><Link to="/contact/">Visit our Gurlal Bazar shop</Link> or confirm pickup availability before <Link to="/products">placing an online order</Link>.</p>
    </>}
    {path === '/areas-we-serve/' && <>
      <p>These 39 nearby Amritsar areas are grouped by approximate distance from our shop to mapped area points. The bands are a guide, rather than exact travel distances to individual addresses.</p>
      <div className="rate-note"><b>Confirm coverage before booking pickup</b><span>Listing an area does not guarantee pickup at every address. Send your full address, landmark and laundry requirements so we can confirm availability and collection arrangements.</span></div>
      <p>Select an area for directions to our shop and an enquiry with your area filled in.</p>
      <div className="public-grid">{areaGroups.map(([band, areas]) => <article className="card" key={band}><h2>{band}</h2><ul className="area-list">{areas.map(area => <li key={area}><Link to={areaPages.find(page => page.area === area).path}>{area}</Link></li>)}</ul></article>)}</div>
      <Actions page={page} /><h2>Prefer to visit?</h2><p>You can contact us about shop drop-off at {SHOP_ADDRESS}. <Link to="/contact/">Get directions and visit details</Link>.</p>
      <p>Compare <Link to="/laundry-service-amritsar/">laundry</Link>, <Link to="/dry-cleaning-amritsar/">dry cleaning</Link> and <Link to="/pricing/">published prices</Link> before getting in touch.</p>
    </>}
    {path === '/pricing/' && <>
      <p>Use our published rate card to compare laundry, dry cleaning and pressing. These rates come from the <Link to="/products/">same catalogue used for online orders</Link>.</p>
      <div className="rate-note"><b>How to read the rates</b><span>“From” means a starting price, with the final price depending on the work after inspection. kg = kilogram; pc = piece; set and pair apply where shown. Confirm pickup charges and the final order total with the shop.</span></div>
      <RateCard rates={rates} />
      <Actions page={page} />
    </>}
    {path === '/about/' && <>
      <p>Prem Power Laundry is based at Shop no. 4 in New Partap Nagar Maine, Gurlal Bazar, Amritsar. Our public catalogue brings laundry, dry cleaning and pressing options together so you can compare services before placing an order.</p>
      <h2>Care options in one catalogue</h2><p>Choose wash &amp; fold or wash &amp; press by weight, or check item-wise rates for garments and household items. Selected shoes and bags also appear in the dry cleaning rate card.</p>
      <h2>Talk to the shop or book online</h2><p>Call or WhatsApp us about your items and address. Online customers can browse services, add items to their bag and follow the existing booking and order tracking steps.</p>
      <p>Find <Link to="/pricing/">published prices</Link>, read our <Link to="/areas-we-serve/">nearby area guide</Link>, or <Link to="/contact/">plan a visit</Link>.</p><Actions page={page} />
    </>}
    {path === '/contact/' && <>
      <p>Contact Prem Power Laundry about a service, a rate or a visit to our Amritsar shop. For pickup enquiries, share your full address so we can confirm coverage.</p>
      <article className="shop-card"><div><p className="eyebrow">Visit our shop</p><h2>Prem Power Laundry</h2><address>{SHOP_ADDRESS}</address><p>Open daily: {SHOP_HOURS}</p><p><a href={`tel:${SHOP_PHONE_TEL}`}>{SHOP_PHONE}</a></p></div><a href={SHOP_MAP_URL} target="_blank" rel="noreferrer">Get directions</a></article>
      <Actions page={page} /><h2>Help us answer your enquiry</h2><p>Include the service you need, the garment or item type and the quantity or approximate laundry weight. For collection, include your area and landmark. For an existing order, have your order number ready.</p>
      <h2>Planning a visit</h2><p>Call or WhatsApp to confirm opening hours and arrangements before travelling. Use the directions link to locate the shop in Gurlal Bazar.</p>
      <p>See <Link to="/pricing/">pricing</Link> or <Link to="/products">the live catalogue</Link> before booking.</p>
    </>}
    {['/', '/areas-we-serve/', '/contact/'].includes(path) && <BusinessFaqs />}
  </section>;
}
