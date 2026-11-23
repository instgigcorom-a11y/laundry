const cataloguePath = '/api/services/public';

export function hasPublicRates(page) {
  return Boolean(page?.intro) || ['/', '/pricing/', '/laundry-service-amritsar/', '/dry-cleaning-amritsar/'].includes(page?.path);
}

export async function fetchPublicRates(origin, signal) {
  const response = await fetch(origin.replace(/\/$/, '') + cataloguePath, { signal, cache: 'no-store' });
  if (!response.ok) throw new Error(`Catalogue returned HTTP ${response.status}`);
  const { products } = await response.json();
  if (!Array.isArray(products)) throw new Error('The catalogue response is missing its product list.');
  return products.filter(item => item.active !== false && item.id && item.name && Number.isFinite(item.price))
    .map(({ id, name, baseName, category, categoryLabel, service, price, unit, from }) => ({
      id, name, baseName, category, categoryLabel, service, price, unit, from
    }));
}

export function formatPublicRate(item) {
  return item ? `${item.from ? 'From ' : ''}Rs ${item.price} / ${item.unit}` : 'View current rates';
}

export const isDryClean = item => item.service?.trim().toLowerCase() === 'dry clean';
export const isSteamPress = item => ['steam press', 'steam iron', 'press only'].includes(item.service?.trim().toLowerCase())
  || item.id === 'starter_everyday_press-only';

export function rateGroups(rates) {
  const groups = new Map();
  for (const item of rates) {
    const key = (item.category || 'other').trim().toLowerCase().replace(/\s+/g, '-').replace(/^everyday-laundry$/, 'everyday');
    if (!groups.has(key)) groups.set(key, { id: key, label: key === 'everyday' ? 'Everyday laundry' : item.categoryLabel || item.category || 'Other services', items: [] });
    groups.get(key).items.push(item);
  }
  return [...groups.values()];
}
