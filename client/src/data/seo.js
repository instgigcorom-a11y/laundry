import { localBusiness, publicPages, SITE_URL } from './publicPages.js';
import { SHOP_INSTAGRAM_URL } from './shopDetails.js';

export const SOCIAL_IMAGE = `${SITE_URL}/images/ppl-wash-social.jpg`;
export const isServicePage = page => Boolean(page.intro) || ['/laundry-service-amritsar/', '/dry-cleaning-amritsar/'].includes(page.path);
export const pricingAnchor = page => {
  if (page.path === '/laundry-service-amritsar/' || page.path === '/steam-press-amritsar/') return 'everyday';
  if (/shoe/.test(page.path)) return 'shoes';
  if (/bag/.test(page.path)) return 'bags';
  if (/saree/.test(page.path)) return 'women';
  if (/curtain/.test(page.path)) return 'starter_household_curtain-no-lining_dry-clean';
  if (/carpet/.test(page.path)) return 'starter_household_carpet_dry-clean';
  if (/blanket/.test(page.path)) return 'starter_household_blanket-single-1_dry-clean';
  return 'men';
};

export function breadcrumbs(page) {
  if (page.path === '/') return [];
  return [
    { name: 'Home', path: '/' },
    ...(page.kind === 'area' ? [{ name: 'Areas we serve', path: '/areas-we-serve/' }] : []),
    { name: page.h1, path: page.path },
  ];
}

export function structuredData(page) {
  const url = SITE_URL + page.path;
  const trail = breadcrumbs(page);
  const graph = [{ ...localBusiness, logo: `${SITE_URL}/prem-power-laundry-logo.svg`, image: SOCIAL_IMAGE, sameAs: [SHOP_INSTAGRAM_URL.split('?')[0]] }];
  graph.push({ '@type': 'WebSite', '@id': `${SITE_URL}/#website`, url: `${SITE_URL}/`, name: 'Prem Power Laundry', publisher: { '@id': localBusiness['@id'] } });
  graph.push({ '@type': 'WebPage', '@id': `${url}#webpage`, url, name: page.title, description: page.description, isPartOf: { '@id': `${SITE_URL}/#website` }, about: { '@id': localBusiness['@id'] }, ...(trail.length ? { breadcrumb: { '@id': `${url}#breadcrumb` } } : {}) });
  if (trail.length) graph.push({ '@type': 'BreadcrumbList', '@id': `${url}#breadcrumb`, itemListElement: trail.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.name, item: SITE_URL + item.path })) });
  if (isServicePage(page)) graph.push({ '@type': 'Service', '@id': `${url}#service`, url, name: page.h1, description: page.description, provider: { '@id': localBusiness['@id'] }, areaServed: { '@type': 'City', name: 'Amritsar' }, mainEntityOfPage: { '@id': `${url}#webpage` } });
  // Visible FAQs remain useful without claiming FAQ rich-result eligibility.
  return { '@context': 'https://schema.org', '@graph': graph.map(({ '@context': _context, ...entity }) => entity) };
}

export function socialMetadata(page) {
  return {
    'og:title': page.title, 'og:description': page.description, 'og:url': SITE_URL + page.path,
    'og:type': 'website', 'og:site_name': 'Prem Power Laundry', 'og:locale': 'en_IN',
    'og:image': SOCIAL_IMAGE, 'og:image:type': 'image/jpeg', 'og:image:width': '1200', 'og:image:height': '630',
    'og:image:alt': 'Folded laundry in green and ivory tones',
    'twitter:card': 'summary_large_image', 'twitter:title': page.title,
    'twitter:description': page.description, 'twitter:image': SOCIAL_IMAGE,
    'twitter:image:alt': 'Folded laundry in green and ivory tones',
  };
}

// Called on every client route change, including transitions into account pages.
// Keep route metadata in sync without touching verification or analytics tags.
export function updateRouteMetadata(path) {
  const normalized = path === '/' ? '/' : `${path.replace(/\/+$/, '')}/`;
  const page = publicPages.find(item => item.path === normalized);
  const catalogue = normalized === '/products/';
  const metadata = page || (catalogue ? { path: '/products/', title: 'Book Laundry & Dry Cleaning in Amritsar | Prem Power Laundry', description: 'Browse the live Prem Power Laundry catalogue and choose laundry, dry cleaning or pressing services in Amritsar. Confirm pickup availability before booking.' } : null);
  const setMeta = (attribute, key, content) => {
    const matches = [...document.head.querySelectorAll(`meta[${attribute}="${key}"]`)];
    const element = matches.shift() || document.createElement('meta');
    matches.forEach(node => node.remove());
    element.setAttribute(attribute, key); element.content = content;
    if (!element.parentNode) document.head.appendChild(element);
  };
  document.title = metadata?.title || 'Your Account & Booking | Prem Power Laundry';
  setMeta('name', 'description', metadata?.description || 'Manage your Prem Power Laundry account and booking.');
  setMeta('name', 'robots', metadata ? 'index, follow' : 'noindex, follow');
  document.head.querySelectorAll('link[rel="canonical"], script[data-page-schema], meta[property^="og:"], meta[name^="twitter:"]').forEach(node => node.remove());
  if (!metadata) return;
  const canonical = document.createElement('link'); canonical.rel = 'canonical'; canonical.href = SITE_URL + metadata.path; document.head.appendChild(canonical);
  for (const [key, content] of Object.entries(socialMetadata(metadata))) setMeta(key.startsWith('og:') ? 'property' : 'name', key, content);
  if (page) {
    const schema = document.createElement('script'); schema.type = 'application/ld+json'; schema.dataset.pageSchema = 'true'; schema.textContent = JSON.stringify(structuredData(page)); document.head.appendChild(schema);
  }
}
