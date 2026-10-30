import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { preview } from 'vite';
import { areaGroups, areaPages, primaryPublicPages, publicPages, SITE_URL } from '../src/data/publicPages.js';
import { starterCatalog } from '../src/data/starterCatalog.js';
import { serviceTags } from '../src/data/serviceGuides.js';
import { businessFaqs } from '../src/data/businessFaqs.js';
import { SHOP_ADDRESS } from '../src/data/shopDetails.js';

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
  '/steam-press-amritsar/': 'Choose pressing or washing with pressing',
  '/shoe-cleaning-amritsar/': 'Match the shoes to the right catalogue entry',
  '/curtain-dry-cleaning-amritsar/': 'Lined and unlined curtains',
  '/carpet-cleaning-amritsar/': 'Measure the carpet before asking for a quote',
  '/blanket-dry-cleaning-amritsar/': 'Blankets, quilts and duvets have different entries',
  '/suit-dry-cleaning-amritsar/': 'Two-piece or three-piece suit?',
  '/saree-dry-cleaning-amritsar/': 'Share fabric and embellishment details',
  '/bag-cleaning-amritsar/': 'Identify the material and bag type',
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
    const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)[1];
    assert.equal((main.match(/<h1[ >]/g) || []).length, 1);
    assert.equal(decode(main.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)[1]), page.h1);
    assert.ok(main.includes('https://wa.me/918146099396'));
    assert.ok(main.length > 1000, 'useful content missing');
    const visibleText = decode(main.replace(/<!--[\s\S]*?-->/g, '').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
    assert.ok(visibleText.includes(contentSamples[page.path] || page.enquiryTip), `page-specific body content missing for ${page.path}`);
    if (page.kind === 'area') {
      assert.ok(visibleText.includes(`${page.area}: ${page.band} approximate distance band`));
      assert.ok(visibleText.includes(SHOP_ADDRESS));
      assert.ok(visibleText.includes(`not a branch in ${page.area}`));
      assert.ok(decode(main).includes(page.whatsappUrl), 'area-specific WhatsApp action missing');
      assert.ok(decode(main).includes(page.directionsUrl), 'area-specific map directions missing');
      const directions = new URL(page.directionsUrl);
      assert.equal(directions.searchParams.get('origin'), `${page.area}, Amritsar, Punjab, India`);
      assert.equal(directions.searchParams.get('destination'), `Prem Power Laundry, ${SHOP_ADDRESS}`);
      assert.equal(directions.searchParams.get('api'), '1');
      assert.ok(new URL(page.whatsappUrl).searchParams.get('text').includes(page.area));
      assert.ok(main.includes('<input') && main.includes('<textarea'), 'address enquiry fields missing');
    }
    if (['/', '/areas-we-serve/', '/contact/'].includes(page.path)) {
      const faqSection = main.match(/<section id="faqs"[\s\S]*?<\/section>/)?.[0];
      assert.ok(faqSection, 'FAQ section missing');
      assert.equal((faqSection.match(/<details>/g) || []).length, 10);
      const faqText = decode(faqSection.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
      for (const faq of businessFaqs) {
        assert.ok(faqText.includes(faq.question), `FAQ question missing: ${faq.question}`);
        assert.ok(faqText.includes(faq.answer), `FAQ answer missing from initial HTML: ${faq.question}`);
      }
    }
    const tags = html.match(/<section class="service-tags"[\s\S]*?<\/section>/)?.[0];
    assert.ok(tags, `visible tag navigation missing for ${page.path}`);
    assert.equal((tags.match(/<li>/g) || []).length, 10);
    for (const tag of serviceTags) {
      assert.ok(tags.includes(`href="${tag.path}"`), `tag destination missing: ${tag.path}`);
      assert.ok(decode(tags).includes(tag.label), `tag label missing: ${tag.label}`);
    }
    if (page.intro) {
      assert.ok(visibleText.includes(page.intro), 'service introduction missing');
      assert.ok(visibleText.includes(page.detail), 'service details missing');
      assert.equal((main.match(/<th scope="row">/g) || []).length, starterCatalog.filter(page.matches).length);
      assert.ok(starterCatalog.filter(page.matches).length > 0, 'service has no verified rate entries');
      for (const [question, answer] of page.questions) {
        assert.ok(visibleText.includes(question), 'service question missing');
        assert.ok(visibleText.includes(answer), 'service answer missing');
      }
    }
    for (const link of primaryPublicPages) assert.ok(html.includes(`href="${link.path}"`), `missing link ${link.path}`);
    if (page.path === '/areas-we-serve/') {
      assert.equal(areaGroups.flatMap(([, areas]) => areas).length, 39);
      assert.equal((main.match(/<li>/g) || []).length, 39);
      for (const [band, areas] of areaGroups) {
        assert.ok(main.includes(band));
        for (const area of areas) {
          const target = areaPages.find(page => page.area === area);
          assert.ok(main.includes(`<li><a href="${target.path}"`), `area not clickable: ${area}`);
          assert.ok(visibleText.includes(area));
        }
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
  assert.equal(publicPages.length, 54);
  assert.equal(areaPages.length, 39);
  assert.equal(new Set(areaPages.map(page => page.enquiryTip)).size, 39);
  assert.equal(new Set(publicPages.map(page => page.path)).size, 54);
  assert.equal(businessFaqs.length, 10);
  assert.equal(titles.size, publicPages.length); assert.equal(descriptions.size, publicPages.length);
  const sitemapResponse = await fetch(origin + '/sitemap.xml');
  assert.equal(sitemapResponse.status, 200);
  const sitemap = await sitemapResponse.text();
  assert.ok(sitemap.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'));
  const expectedUrls = [...publicPages.map(page => SITE_URL + page.path), SITE_URL + '/products/'];
  const actualUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  assert.deepEqual(actualUrls.sort(), expectedUrls.sort(), 'sitemap must contain all public pages and the existing catalogue exactly once');
  assert.equal(new Set(actualUrls).size, actualUrls.length);
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
    const html = await response.text();
    const fragment = new URL(path, origin).hash.slice(1);
    if (fragment) assert.ok(html.includes(`id="${fragment}"`), `missing fragment target ${path}`);
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
  console.log(`PASS ${localLinks.size} local link destinations and ${localAssets.size} local assets; sitemap has exactly ${expectedUrls.length} URLs; robots.txt points to sitemap`);
  console.log('PASS 10 visible clickable service tags on all 54 public pages, 8 service guides with rates and FAQs');
  console.log('PASS 39 linked area pages with unique enquiry tips, map origins, WhatsApp enquiries and coverage notes');
  console.log('PASS 10 accessible FAQ accordions with answers in initial HTML on home, areas directory and contact');
  console.log('PASS unique metadata, 39 candidate areas, full published prices, sitemap and legacy app fallback');
} finally {
  await new Promise((resolve, reject) => server.httpServer.close(error => error ? reject(error) : resolve()));
}
