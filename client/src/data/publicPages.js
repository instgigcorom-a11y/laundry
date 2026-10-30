import { SHOP_MAP_URL, SHOP_PHONE_TEL } from './shopDetails.js';
import { serviceGuides } from './serviceGuides.js';
import { createAreaPages } from './areaGuides.js';

export const SITE_URL = 'https://pplwash.in';
export const primaryPublicPages = [
  { path: '/', label: 'Home', title: 'Laundry & Dry Cleaning in Amritsar | Prem Power Laundry', h1: 'Laundry & Dry Cleaning in Amritsar', description: 'Prem Power Laundry in Gurlal Bazar, Amritsar. Explore laundry, dry cleaning and pressing rates, visit our shop or contact us to confirm pickup coverage.' },
  { path: '/laundry-service-amritsar/', label: 'Laundry', title: 'Laundry Service in Amritsar | Prem Power Laundry', h1: 'Laundry Service in Amritsar', description: 'Compare wash & fold and wash & press at Prem Power Laundry, Amritsar. Check weight-based rates and contact the shop about your clothes and pickup address.' },
  { path: '/dry-cleaning-amritsar/', label: 'Dry cleaning', title: 'Dry Cleaning in Amritsar | Prem Power Laundry', h1: 'Dry Cleaning in Amritsar', description: 'Find garment and household dry cleaning rates at Prem Power Laundry in Gurlal Bazar, Amritsar. Discuss the item, fabric and final price with our shop.' },
  { path: '/areas-we-serve/', label: 'Areas we serve', title: 'Areas We Serve in Amritsar | Prem Power Laundry', h1: 'Areas We Serve', description: 'Explore 39 candidate nearby areas around Prem Power Laundry, grouped by approximate distance. Contact us with your full address to confirm pickup coverage.' },
  { path: '/pricing/', label: 'Pricing', title: 'Laundry & Dry Cleaning Pricing | Prem Power Laundry Amritsar', h1: 'Laundry & Dry Cleaning Pricing', description: 'View Prem Power Laundry’s published rate card for laundry, dry cleaning and pressing in Amritsar, with per-kg, per-piece, per-set and starting prices.' },
  { path: '/about/', label: 'About', title: 'About Prem Power Laundry | Amritsar', h1: 'About Prem Power Laundry', description: 'Meet Prem Power Laundry in New Partap Nagar, Gurlal Bazar, Amritsar. Find our laundry and dry cleaning services, shop address and ways to arrange an order.' },
  { path: '/contact/', label: 'Contact', title: 'Contact & Visit Our Shop | Prem Power Laundry Amritsar', h1: 'Contact & Visit Our Shop', description: 'Call or WhatsApp Prem Power Laundry on +91 81460 99396. Visit Shop no. 4, New Partap Nagar Maine, Gurlal Bazar, Amritsar, Punjab 143001.' },
];

export const areaGroups = [
  ['Under 1 km', ['Azad Nagar', 'East Gobind Nagar', 'East Mohan Nagar', 'Gokal Ka Bagh', 'Kapoor Nagar', 'Mandir Wala Bazar', 'New Partap Nagar', 'Pratap Nagar', 'Sant Nagar']],
  ['1–2 km', ['City Centre', 'Golden Avenue', 'GTB Nagar', 'Jahaj Ghar', 'Maqbool Pura', 'Ram Talai', 'Shaheed Udham Singh Nagar', 'Sultanwind', 'Sultanwind Pind']],
  ['2–2.5 km', ['Amritsar Colony', 'Gurdial Nagar', 'Guru Amar Dass Nagar', 'Katra Ahluwalia', 'Mohkampura', 'Moni Chowk', 'Rasulpur', 'Sharifpura', 'Sunder Nagar']],
  ['2.5–3 km', ['Baba Phoola Singh', 'Bhagta Wala Gate', 'Bharat Nagar', 'Gilwali Gate', 'Himatpura', 'Ishwar Nagar', 'Krishna Square', 'Mehar Pura', 'New Amritsar Colony', 'Pawan Nagar', 'Preet Nagar', 'Shivala Colony']],
];

export const areaPages = createAreaPages(areaGroups);
export const publicPages = [...primaryPublicPages, ...serviceGuides, ...areaPages];

export const localBusiness = {
  '@context': 'https://schema.org', '@type': 'DryCleaningOrLaundry',
  '@id': `${SITE_URL}/#business`, name: 'Prem Power Laundry', url: `${SITE_URL}/`,
  telephone: SHOP_PHONE_TEL, hasMap: SHOP_MAP_URL,
  address: { '@type': 'PostalAddress', streetAddress: 'Shop no. 4, New Partap Nagar Maine, Gurlal Bazar, East Gobind Nagar, Pratap Nagar', addressLocality: 'Amritsar', addressRegion: 'Punjab', postalCode: '143001', addressCountry: 'IN' },
};

export function findPublicPage(path) {
  return publicPages.find(page => page.path === (path === '/' ? '/' : `${path.replace(/\/+$/, '')}/`));
}
