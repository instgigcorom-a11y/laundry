import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { preview } from 'vite';
import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';
import { startLocalSessionServer } from './local-session-server.mjs';

const output = resolve('node_modules/.cache/ppl-performance');
await mkdir(output, { recursive: true });
const session = await startLocalSessionServer();
const server = await preview({ preview: { host: '127.0.0.1', port: 0, open: false, proxy: { '/api/auth': session.target } } });
const browser = await launch({ chromePath: process.env.BROWSER_BIN || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', chromeFlags: ['--headless=new', '--disable-gpu', '--no-first-run'] });
try {
  const url = `http://127.0.0.1:${server.httpServer.address().port}/`;
  for (const mobile of [false, true]) {
    const name = mobile ? 'mobile' : 'desktop';
    const result = await lighthouse(url, { port: browser.port, output: ['json', 'html'], logLevel: 'error', onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo', 'agentic-browsing'] }, mobile ? undefined : desktopConfig);
    await writeFile(resolve(output, `lighthouse-${name}.json`), result.report[0]);
    await writeFile(resolve(output, `lighthouse-${name}.html`), result.report[1]);
    const { audits, categories } = result.lhr;
    console.log(JSON.stringify({ name, scores: Object.fromEntries(Object.entries(categories).map(([key, value])=>[key,Math.round(value.score*100)])), lcp: audits['largest-contentful-paint'].displayValue, bytes: audits['total-byte-weight'].numericValue, contrast: audits['color-contrast'].details?.items, errors: audits['errors-in-console'].details?.items, unusedCss: audits['unused-css-rules'].displayValue, unusedJs: audits['unused-javascript'].displayValue }, null, 2));
  }
} finally {
  await browser.kill();
  await new Promise(resolve => server.httpServer.close(resolve));
  await session.close();
}
