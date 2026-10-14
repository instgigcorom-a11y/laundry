import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { preview } from 'vite';
import { areaGroups, publicPages, SITE_URL } from '../src/data/publicPages.js';
import { starterCatalog } from '../src/data/starterCatalog.js';

// Start the actual Vite production preview and inspect raw HTTP responses.
// Do not execute client JavaScript: SEO content must already be in the response.
const server = await preview({ preview: { host: '127.0.0.1', port: 0, strictPort: false, open: false } });
const { port } = server.httpServer.address();
const origin = `http://127.0.0.1:${port}`;
const decode = text => text.replaceAll('&amp;', '&').replaceAll('&#x27;', "'").replaceAll('&quot;', '"');
const titles = new Set();
const descriptions = new Set();
const localLinks = new Set();
const localAssets = new Set();
const contentSamples = {
  '/': 'Choose care for your everyday clothes',
  '/laundry-service-amritsar/': 'Choose the service based on whether you need pressing included.',
  '/dry-cleaning-amritsar/': 'Selected garment dry cleaning rates',
  '/areas-we-serve/': 'These 39 candidate nearby areas',
  '/pricing/': 'Use our published rate card to compare laundry',
  '/about/': 'Prem Power Laundry is based at Shop no. 4',
  '/contact/': 'Help us answer your enquiry',
};
try {
  for (const page of publicPages) {
    const response = await fetch(origin + page.path);
    assert.equal(response.status, 200, page.path);
    const html = await response.text();
    assert.ok(response.headers.get('content-type')?.includes('text/html'));
    for (const match of html.matchAll(/<a\b[^>]*href="([^"]+)"/g)) {
      const href = decode(match[1]);
      if (href.startsWith('/')) localLinks.add(href);
      else assert.ok(/^(https:\/\/|tel:|mailto:|#)/.test(href), `unexpected link ${href}`);
    }
    for (const match of html.matchAll(/<(?:script|img)\b[^>]*src="(\/[^\"]+)"/g)) localAssets.add(decode(match[1]));
    for (const match of html.matchAll(/<link\b[^>]*href="(\/[^\"]+)"/g)) localAssets.add(decode(match[1]));
    const head = html.match(/<head>([\s\S]*?)<\/head>/)[1];
    const title = decode(head.match(/<title>(.*?)<\/title>/)[1]);
    assert.equal(title, page.title);
    assert.equal((head.match(/<title>/g) || []).length, 1);
    const description = decode(head.match(/<meta name="description" content="([^"]*)"/)[1]);
    assert.equal(description, page.description);
    assert.ok(head.includes(`href="${SITE_URL}${page.path}"`), 'canonical missing');
    const business = JSON.parse(head.match(/<script type="application\/ld\+json">(.*?)<\/script>/)[1]);
    assert.equal(business.telephone, '+918146099396');
    assert.equal(business['@type'], 'DryCleaningOrLaundry');
    assert.equal(business.address.postalCode, '143001');
    assert.ok(!business.openingHours && !business.aggregateRating && !business.areaServed);
    const main = html.match(/<main>([\s\S]*?)<\/main>/)[1];
    assert.equal((main.match(/<h1[ >]/g) || []).length, 1);
    assert.ok(decode(main).includes(`<h1>${page.h1}</h1>`));
    assert.ok(main.includes('https://wa.me/918146099396'));
    assert.ok(main.length > 1000, 'useful content missing');
    const visibleText = decode(main.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
    assert.ok(visibleText.includes(contentSamples[page.path]), `page-specific body content missing for ${page.path}`);
    for (const link of publicPages) assert.ok(html.includes(`href="${link.path}"`), `missing link ${link.path}`);
    if (page.path === '/areas-we-serve/') {
      assert.equal(areaGroups.flatMap(([, areas]) => areas).length, 39);
      assert.equal((main.match(/<li>/g) || []).length, 39);
      for (const [band, areas] of areaGroups) {
        assert.ok(main.includes(band));
        for (const area of areas) assert.ok(main.includes(`<li>${area}</li>`));
      }
      assert.ok(main.includes('does not guarantee pickup at every address'));
    }
    if (page.path === '/pricing/') {
      assert.equal((main.match(/<tbody>/g) || []).length, 7);
      assert.equal((main.match(/<th scope="row">/g) || []).length, starterCatalog.length);
    }
    titles.add(title); descriptions.add(description);
    console.log(`PASS 200 ${page.path} | ${title} | initial H1 and body content, description, canonical, schema`);
    if (page.path !== '/') {
      const redirect = await fetch(origin + page.path.slice(0, -1), { redirect: 'manual' });
      assert.equal(redirect.status, 301);
      assert.equal(redirect.headers.get('location'), page.path);
      const noSlash = await fetch(origin + page.path.slice(0, -1));
      assert.equal(noSlash.status, 200);
      assert.ok(decode(await noSlash.text()).includes(`<h1>${page.h1}</h1>`));
    }
  }
  assert.equal(titles.size, 7); assert.equal(descriptions.size, 7);
  const sitemapResponse = await fetch(origin + '/sitemap.xml');
  assert.equal(sitemapResponse.status, 200);
  const sitemap = await sitemapResponse.text();
  assert.ok(sitemap.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'));
  const expectedUrls = [...publicPages.map(page => SITE_URL + page.path), SITE_URL + '/products/'];
  const actualUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  assert.deepEqual(actualUrls.sort(), expectedUrls.sort(), 'sitemap must have exactly eight unique canonical URLs');
  for (const url of actualUrls) localLinks.add(new URL(url).pathname);
  const app = await readFile('dist/app.html', 'utf8');
  assert.ok(app.includes('<div id="root"></div>'), 'existing routes need an unrendered app shell');
  assert.ok((await readFile('dist/_redirects', 'utf8')).includes('/* /app.html 200'));
  for (const path of ['/products', '/products/', '/login', '/cart', '/orders', '/admin']) {
    const response = await fetch(origin + path);
    assert.equal(response.status, 200);
    assert.equal(await response.text(), app, `existing app route ${path}`);
  }
  for (const path of localLinks) {
    const response = await fetch(origin + path);
    assert.equal(response.status, 200, `broken internal link ${path}`);
    assert.ok(response.headers.get('content-type')?.includes('text/html'), `invalid page response ${path}`);
    await response.text();
  }
  for (const path of localAssets) {
    const response = await fetch(origin + path);
    assert.equal(response.status, 200, `missing asset ${path}`);
    assert.ok(!response.headers.get('content-type')?.includes('text/html'), `asset returned SPA fallback ${path}`);
    await response.arrayBuffer();
  }
  const robots = await fetch(origin + '/robots.txt');
  assert.equal(robots.status, 200);
  assert.ok((await robots.text()).includes(`Sitemap: ${SITE_URL}/sitemap.xml`));
  console.log(`PASS ${localLinks.size} local link destinations and ${localAssets.size} local assets; sitemap has exactly 8 URLs; robots.txt points to sitemap`);
  console.log('PASS unique metadata, 39 candidate areas, full published prices, sitemap and legacy app fallback');
} finally {
  await new Promise((resolve, reject) => server.httpServer.close(error => error ? reject(error) : resolve()));
}
