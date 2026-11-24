// Permanent redirects for URLs that Google still knows from the previous
// website. The live Render static site ignores _redirects, so these must also
// be entered as Render dashboard rules (see DEPLOYMENT.md).
export const legacyRedirects = [
  ['/guides/Clean-Shoes', '/shoe-cleaning-amritsar/'],
  ['/laundry-for-professionals-amritsar', '/laundry-service-amritsar/'],
  ['/laundry-pickup-amritsar', '/areas-we-serve/'],
];

// The catalogue's canonical URL has a trailing slash; old links omit it.
export const catalogueRedirect = ['/products', '/products/'];
