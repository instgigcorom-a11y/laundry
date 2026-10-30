import { SHOP_ADDRESS, SHOP_PHONE_TEL } from './shopDetails.js';

// Practical enquiry prompts, not claims about local landmarks or branch locations.
const enquiryTips = {
  'Azad Nagar': 'Include your house or shop number as well as Azad Nagar, so the shop can check the exact collection address.',
  'East Gobind Nagar': 'Mention East Gobind Nagar in your enquiry and say whether you want collection or will bring the items to Gurlal Bazar.',
  'East Mohan Nagar': 'Keep East Mohan Nagar in the address and add your street or lane name to avoid relying on the area name alone.',
  'Gokal Ka Bagh': 'Send a map pin with your Gokal Ka Bagh address if the entrance is easier to identify on a map.',
  'Kapoor Nagar': 'For a Kapoor Nagar enquiry, list garment quantities and the care service you need before asking about collection.',
  'Mandir Wala Bazar': 'If collection is from a shop in Mandir Wala Bazar, include the shop name and number alongside the address.',
  'New Partap Nagar': 'Our address uses New Partap Nagar Maine. Use the full shop address below when planning your visit.',
  'Pratap Nagar': 'Specify your part of Pratap Nagar and a street or landmark so we can distinguish your address from the shop address.',
  'Sant Nagar': 'Add a lane or building reference to your Sant Nagar address and tell us which items you need cleaned.',
  'City Centre': 'For a City Centre collection enquiry, include the building or business name and the contact person for handover.',
  'Golden Avenue': 'Send the complete Golden Avenue address, including any building or floor details needed to find the handover point.',
  'GTB Nagar': 'Use GTB Nagar together with your full street address and a map pin if available when checking coverage.',
  'Jahaj Ghar': 'For Jahaj Ghar, confirm the exact handover address and mention if you are enquiring about garments or bulky household items.',
  'Maqbool Pura': 'Include Maqbool Pura, your lane and a contact number in the enquiry so collection arrangements can be discussed clearly.',
  'Ram Talai': 'Share the exact Ram Talai address and your preferred handover arrangement; ask the shop to confirm availability before booking.',
  'Shaheed Udham Singh Nagar': 'Keep the full name Shaheed Udham Singh Nagar in your address and include a pin or landmark for the collection point.',
  'Sultanwind': 'Specify Sultanwind and your exact street or locality. The directory also lists Sultanwind Pind separately.',
  'Sultanwind Pind': 'Use Sultanwind Pind in your enquiry rather than only Sultanwind, and confirm the complete collection address.',
  'Amritsar Colony': 'Use Amritsar Colony with the full address. New Amritsar Colony is a separate entry in this directory.',
  'Gurdial Nagar': 'For Gurdial Nagar, include an item count or approximate laundry weight so the shop can discuss both service and collection.',
  'Guru Amar Dass Nagar': 'Include the full Guru Amar Dass Nagar address and tell us about any date by which you need the items returned.',
  'Katra Ahluwalia': 'For a Katra Ahluwalia shop or residence, give the entrance or handover details along with the street address.',
  'Mohkampura': 'Share your Mohkampura map pin if available and identify a contact person who can confirm the items at handover.',
  'Moni Chowk': 'For Moni Chowk enquiries, specify the precise collection address and whether your items need washing, dry cleaning or pressing.',
  'Rasulpur': 'Include Rasulpur, Amritsar and a full address or map pin so the shop can confirm the intended location.',
  'Sharifpura': 'For Sharifpura, mention any bulky items separately, including the number and size of blankets, curtains or carpets.',
  'Sunder Nagar': 'Use Sunder Nagar with your house or shop number and confirm pickup availability before placing a collection order.',
  'Baba Phoola Singh': 'Add a precise address or pin to your Baba Phoola Singh enquiry, and ask about collection arrangements before handover.',
  'Bhagta Wala Gate': 'For Bhagta Wala Gate, describe the actual handover point rather than using only the area name.',
  'Bharat Nagar': 'Include Bharat Nagar and your street details, plus the service you need, when asking the shop to check coverage.',
  'Gilwali Gate': 'For Gilwali Gate enquiries, include the full address and a reachable phone number to discuss collection or a shop visit.',
  'Himatpura': 'Share your Himatpura address and any care-label photos for items you are unsure how to book.',
  'Ishwar Nagar': 'For Ishwar Nagar, list the items and any required return date before confirming collection with the shop.',
  'Krishna Square': 'Include the building or entrance details for Krishna Square if they are needed to identify your handover point.',
  'Mehar Pura': 'Send your full Mehar Pura address and say whether you prefer to visit Gurlal Bazar or enquire about pickup.',
  'New Amritsar Colony': 'Use New Amritsar Colony in full. Amritsar Colony appears separately in the directory, so include your pin or street details.',
  'Pawan Nagar': 'For Pawan Nagar, give the item quantities and the complete collection address so the shop can confirm the arrangements.',
  'Preet Nagar': 'Include Preet Nagar with your lane and building details, and ask the shop to confirm charges and timing before booking.',
  'Shivala Colony': 'For Shivala Colony, share an address or map pin and describe any large items that may affect handover arrangements.',
};

export function createAreaPages(groups) {
  return groups.flatMap(([band, areas]) => areas.map(area => {
    const slug = area.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const message = `Hello Prem Power Laundry, I am enquiring from ${area}, Amritsar. Please confirm service and pickup availability.\nFull address / map pin: \nItems and quantities: \nService required: \nRequired return date (please confirm): `;
    const directions = new URL('https://www.google.com/maps/dir/');
    directions.search = new URLSearchParams({ api: '1', origin: `${area}, Amritsar, Punjab, India`, destination: `Prem Power Laundry, ${SHOP_ADDRESS}` }).toString();
    return {
      kind: 'area', area, band, label: area,
      path: `/areas-we-serve/${slug}/`,
      title: `Laundry & Dry Cleaning for ${area}, Amritsar | Prem Power Laundry`,
      h1: `Laundry & Dry Cleaning for ${area}, Amritsar`,
      description: `Enquiring from ${area}, Amritsar? Find directions to Prem Power Laundry in Gurlal Bazar, compare services and contact the shop to confirm coverage for your address.`,
      enquiryTip: enquiryTips[area], directionsUrl: directions.href,
      whatsappUrl: `https://wa.me/${SHOP_PHONE_TEL.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`,
      sameBand: areas.filter(name => name !== area),
    };
  }));
}
