import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { preview } from 'vite';
import { startLocalSessionServer } from './local-session-server.mjs';
import { starterCatalog } from '../src/data/starterCatalog.js';

// Uses an installed Chromium browser; does not install packages or browsers.
const candidates = [process.env.BROWSER_BIN, 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].filter(Boolean);
let browser;
for (const candidate of candidates) { try { await access(candidate); browser = candidate; break; } catch { /* Try the next installed browser. */ } }
assert.ok(browser, 'Set BROWSER_BIN to an installed Chromium browser.');
const artifacts = resolve('node_modules/.cache/ppl-homepage-qa');
const profile = resolve(artifacts, `profile-${Date.now()}`);
await mkdir(profile, { recursive: true });
const session = await startLocalSessionServer({ products: starterCatalog });
const server = await preview({ preview: { host: '127.0.0.1', port: 0, open: false, proxy: { '/api': session.target } } });
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
const processHandle = spawn(browser, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
let socket;
let launchError;
processHandle.on('error', error => { launchError = error; });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
try {
  let debugPort;
  for (let attempt = 0; attempt < 75; attempt++) {
    if (launchError) throw launchError;
    try { debugPort = (await readFile(resolve(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; break; } catch { await pause(200); }
  }
  assert.ok(debugPort, 'Browser debugging endpoint did not start.');
  const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
  socket = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  let nextId = 0;
  const pending = new Map();
  const exceptions = [];
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails.text);
    const entry = pending.get(message.id);
    if (entry) { pending.delete(message.id); clearTimeout(entry.timer); message.error ? entry.reject(new Error(JSON.stringify(message.error))) : entry.resolve(message.result); }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++nextId;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Browser command timed out: ${method}`)); }, 15000);
    pending.set(id, { resolve, reject, timer }); socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    assert.ok(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const waitFor = async expression => {
    for (let attempt = 0; attempt < 100; attempt++) { if (await evaluate(`Boolean(${expression})`)) return; await pause(100); }
    throw new Error(`Timed out waiting for ${expression}`);
  };
  await send('Runtime.enable');
  for (const [width, height] of [[1440, 1000], [1024, 900], [768, 1024], [390, 844], [320, 800]]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 });
    await send('Page.navigate', { url: origin + '/' });
    await waitFor('document.readyState === "complete" && document.querySelector(".landing-services") && document.querySelector(".landing-photo img").naturalWidth > 0');
    await evaluate('document.fonts.ready');
    await pause(250);
    const layout = await evaluate(`(() => {
      const cards = [...document.querySelectorAll('.landing-service')];
      return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth, cards: cards.length,
        columns: getComputedStyle(document.querySelector('.landing-services')).gridTemplateColumns.split(' ').length,
        cardsFit: cards.every(card => { const r = card.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth + 1; }),
        heading: document.querySelector('h1').textContent,
        faqs: document.querySelectorAll('#faqs details').length,
        login: document.querySelector('.landing-login').getAttribute('href'),
        overflow: [...document.querySelectorAll('body *')].filter(el => el.getBoundingClientRect().right > innerWidth + 1).slice(-8).map(el => el.tagName + '.' + el.className) };
    })()`);
    assert.equal(layout.width, width);
    assert.ok(layout.scrollWidth <= width, `Horizontal overflow at ${width}px: ${layout.scrollWidth}; ${layout.overflow.join(', ')}`);
    assert.equal(layout.cards, 4); assert.equal(layout.columns, width <= 560 ? 2 : 4);
    assert.ok(layout.cardsFit); assert.equal(layout.faqs, 10); assert.equal(layout.login, '/login');
    assert.equal(layout.heading, 'Laundry & Dry Cleaning in Amritsar');
    const resources = await evaluate('performance.getEntriesByType("resource").map(entry => entry.name)');
    assert.ok(!resources.some(url => /fonts\.(googleapis|gstatic)\.com|home-laundry-hero\.png|whatsapp-icon\.png/.test(url)), 'legacy image/font requests on homepage');
    assert.ok(!resources.some(url => /\/(AdminPages|CustomerPages|AuthPages|invoicePdf|phone|common|AdminOrderNotifier)-[^/]+\.(js|css)/.test(url)), 'app chunks were eagerly loaded on homepage');
    if ([1440, 390].includes(width)) {
      const screenshot = await send('Page.captureScreenshot', { format: 'png' });
      await writeFile(resolve(artifacts, `homepage-${width}.png`), Buffer.from(screenshot.data, 'base64'));
    }
    if (width <= 850) {
      assert.ok(await evaluate(`(() => { const menu = document.querySelector('.landing-mobile-menu'); menu.querySelector('summary').click(); return menu.open && getComputedStyle(menu.querySelector('nav')).display !== 'none'; })()`));
      await evaluate("document.querySelector('.landing-mobile-menu').removeAttribute('open')");
    }
    assert.ok(await evaluate(`(() => { const faq = document.querySelector('#faqs details'); faq.querySelector('summary').click(); return faq.open && faq.querySelector('p').getBoundingClientRect().height > 0; })()`));
    console.log(`PASS ${width}px: no overflow, ${layout.columns} card columns, image loaded, menu and FAQ interactions`);
  }
  // Exercise React navigation and hydration, rather than only server responses.
  await send('Page.navigate', { url: origin + '/' });
  await waitFor('document.querySelector(".landing-service-4")');
  await evaluate('document.querySelector(".landing-service-4").click()');
  await waitFor('location.pathname === "/steam-press-amritsar/" && document.querySelector("h1")?.textContent === "Steam Press & Ironing in Amritsar"');
  assert.ok(await evaluate(`document.querySelector('meta[property="og:url"]').content.endsWith('/steam-press-amritsar/')`), 'social metadata stale after React navigation');
  assert.equal(await evaluate(`document.querySelectorAll('link[rel="canonical"]').length`), 1);
  assert.ok(await evaluate(`JSON.parse(document.querySelector('script[data-page-schema]').textContent)['@graph'].some(entity => entity['@type'] === 'Service' && entity.url.endsWith('/steam-press-amritsar/'))`));
  const enquiry = await evaluate(`document.querySelector('main a[data-conversion="whatsapp"]').href`);
  assert.ok(new URL(enquiry).searchParams.get('text').includes('steam pressing'));
  await evaluate(`document.querySelector('main a[data-conversion="pricing"]').click()`);
  await waitFor('location.pathname === "/pricing/" && location.hash === "#everyday" && document.querySelector("#everyday")');
  for (const path of ['/pricing/', '/dry-cleaning-amritsar/', '/laundry-service-amritsar/', '/shoe-cleaning-amritsar/', '/areas-we-serve/']) {
    await send('Page.navigate', { url: origin + path });
    await waitFor('document.readyState === "complete" && document.querySelector("main h1")');
    const sizes = await evaluate('({ width: innerWidth, scroll: document.documentElement.scrollWidth })');
    assert.ok(sizes.scroll <= sizes.width, `Public page overflow: ${path}`);
    assert.equal(await evaluate(`document.querySelectorAll('meta[property="og:title"]').length`), 1);
  }
  await send('Page.navigate', { url: origin + '/areas-we-serve/azad-nagar/' });
  await waitFor('document.querySelector(\'a[href="/#faqs"]\')');
  await evaluate('document.querySelector(\'a[href="/#faqs"]\').click()');
  await waitFor('location.pathname === "/" && location.hash === "#faqs" && scrollY > 200');
  await evaluate('document.querySelector(\'.landing-login\').click()');
  await waitFor('location.pathname === "/login" && document.querySelector(\'input[type="password"]\')');
  assert.equal(await evaluate(`document.querySelector('meta[name="robots"]').content`), 'noindex, follow');
  assert.equal(await evaluate(`document.querySelectorAll('link[rel="canonical"],script[data-page-schema],meta[property^="og:"]').length`), 0, 'public metadata leaked into login');
  assert.ok(await evaluate('!![...document.styleSheets].find(sheet => sheet.href?.includes("common-"))'), 'lazy app stylesheet not loaded');
  await send('Page.navigate', { url: origin + '/products' });
  await waitFor('document.querySelector(".add-service") && document.querySelector(".service-price")');
  await evaluate('document.querySelector(".add-service").click()');
  await waitFor('location.pathname === "/login" && document.querySelector(\'input[type="password"]\')');
  assert.deepEqual(exceptions, [], 'Uncaught browser exceptions');
  console.log('PASS deferred app chunks, local fonts, responsive WebP images, login/catalogue routes, service-card navigation and FAQ anchor');
  console.log(`Screenshots: ${artifacts}`);
  await send('Browser.close');
} finally {
  socket?.close();
  if (processHandle.exitCode === null) processHandle.kill();
  await new Promise(resolve => server.httpServer.close(resolve));
  await session.close();
}
