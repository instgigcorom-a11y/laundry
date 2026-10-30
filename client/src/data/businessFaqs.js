import { SHOP_ADDRESS, SHOP_PHONE } from './shopDetails.js';
import { starterCatalog } from './starterCatalog.js';

const rate = id => {
  const item = starterCatalog.find(item => item.id === id);
  return `${item.from ? 'from ' : ''}Rs ${item.price} per ${item.unit}`;
};

// Answers describe verified catalogue and application features. Availability
// questions are referred to the shop instead of making unconfirmed promises.
export const businessFaqs = [
  {
    question: 'What is dry cleaning, and how do I choose it at Prem Power Laundry?',
    answer: 'Dry cleaning generally uses a cleaning solvent rather than water as the main cleaning medium. Our catalogue lists Dry clean separately from Wash & fold, Wash & press and pressing. Share the care label, fabric and any stains with the shop to confirm the suitable service for your item.',
    path: '/dry-cleaning-amritsar/', link: 'Explore dry cleaning services',
  },
  {
    question: 'Which laundry and dry cleaning services does Prem Power Laundry offer in Amritsar?',
    answer: 'The published catalogue includes wash & fold, wash & press, dry cleaning, press only and garment-wise steam pressing. It also lists household items, shoes and bags. Check the specific item and service before booking, and contact the shop if you cannot find a match.',
    path: '/products', link: 'Browse the live service catalogue',
  },
  {
    question: 'Where is Prem Power Laundry, and can I bring my clothes to the shop?',
    answer: `Prem Power Laundry is at ${SHOP_ADDRESS}. Shop drop-off is available in the booking flow. Use our directions link and call ${SHOP_PHONE} to confirm opening hours and handover arrangements before travelling.`,
    path: '/contact/', link: 'Find the shop and get directions',
  },
  {
    question: 'Can I arrange laundry pickup and delivery from my area in Amritsar?',
    answer: 'Contact the shop with your full address, landmark or map pin, and the items you need cleaned. Our areas directory lists 39 candidate nearby areas with approximate distance bands. Listing an area does not guarantee pickup at every address; confirm coverage, collection arrangements and any charges before booking.',
    path: '/areas-we-serve/', link: 'Find your area and confirm coverage',
  },
  {
    question: 'What are the laundry and dry cleaning prices at Prem Power Laundry?',
    answer: `Our published rate card lists wash & fold at ${rate('starter_everyday_wash-fold')}, wash & press at ${rate('starter_everyday_wash-press')} and the everyday dry clean entry ${rate('starter_everyday_dry-clean')}. Item-wise rates differ, and From prices depend on the work after inspection. Confirm current prices, collection charges and the final total with the shop.`,
    path: '/pricing/', link: 'Compare the published prices',
  },
  {
    question: 'How can I book laundry online with Prem Power Laundry?',
    answer: 'Open the live service catalogue, log in or register, choose the relevant items and add them to your bag. Continue through the booking steps to select shop drop-off or arrange collection. Confirm pickup coverage with the shop first, and use the Orders page after booking to follow your order.',
    path: '/products', link: 'Start an online order',
  },
  {
    question: 'Does Prem Power Laundry offer same-day or next-day cleaning?',
    answer: 'Contact the shop to ask about same-day, next-day or express availability for your items. Tell us the date you need them back before booking and ask for a confirmed return date. Urgent cleaning and delivery are subject to confirmation.',
    path: '/contact/', link: 'Ask about your required return date',
  },
  {
    question: 'Can Prem Power Laundry clean curtains, carpets and blankets?',
    answer: 'Yes, the published household catalogue includes lined and unlined curtains, carpets, single and double blankets, quilts or razai and duvets. Curtains and some bedding entries have starting prices; carpets are priced by square foot. Share the size, material and quantity so the shop can confirm the right entry and quote.',
    path: '/pricing/', link: 'Check the household rate card',
  },
  {
    question: 'Are shoe cleaning and bag cleaning available at Prem Power Laundry?',
    answer: 'The catalogue lists sports shoes, non-leather canvas or sneakers, leather shoes, suede leather shoes and boots per pair. Bag entries include handbags, leather handbags, canvas or jute or cloth bags, suitcases and wallets. Share photos to confirm suitability and price. Cleaning entries do not promise repairs or restoration.',
    path: '/shoe-cleaning-amritsar/', link: 'View shoe cleaning options and prices',
  },
  {
    question: 'How should I prepare clothes and other items before handover?',
    answer: 'Empty pockets and bag compartments, count the items, and point out stains, damage or delicate trim. Share care labels and any special instructions before booking. If you have specific handling or hygiene requirements, discuss them directly with the shop before handover.',
    path: '/contact/', link: 'Discuss item care with the shop',
  },
];
