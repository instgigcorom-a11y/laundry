import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { createServer } from 'vite';
import { publicPages, SITE_URL } from '../src/data/publicPages.js';
import { socialMetadata, structuredData } from '../src/data/seo.js';

// Use Vite's module loader to render the same React routes at build time.
// No browser, backend, database connection or new runtime dependency is needed.
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
const escape = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
try {
  const { render } = await vite.ssrLoadModule('/src/entry-server.jsx');
  const template = await readFile('dist/index.html', 'utf8');
  // Keep the original client app shell for private and existing interactive URLs.
  await writeFile('dist/app.html', template);
  // Preserve the existing indexable catalogue URL while keeping account shells noindex.
  const catalogue = { path: '/products/', title: 'Book Laundry & Dry Cleaning in Amritsar | Prem Power Laundry', description: 'Browse the live Prem Power Laundry catalogue and choose laundry, dry cleaning or pressing services in Amritsar. Confirm pickup availability before booking.' };
  const catalogueHead = Object.entries(socialMetadata(catalogue)).map(([key, value]) => `<meta ${key.startsWith('og:') ? 'property' : 'name'}="${key}" content="${escape(value)}" />`).join('\n');
  await mkdir('dist/products', { recursive: true });
  await writeFile('dist/products/index.html', template.replace(/<title>[\s\S]*?<\/title>/, `<title>${escape(catalogue.title)}</title>`).replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${escape(catalogue.description)}" />`).replace('content="noindex, follow"', 'content="index, follow"').replace('</head>', `<link rel="canonical" href="${SITE_URL}/products/" />\n${catalogueHead}\n</head>`));
  for (const page of publicPages) {
    const social = Object.entries(socialMetadata(page)).map(([key, value]) => `<meta ${key.startsWith('og:') ? 'property' : 'name'}="${key}" content="${escape(value)}" />`).join('\n');
    const html = template
      .replace(/<title>[\s\S]*?<\/title>/, `<title>${escape(page.title)}</title>`)
      .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${escape(page.description)}" />`)
      .replace('content="noindex, follow"', 'content="index, follow"')
      .replace('</head>', `<link rel="canonical" href="${SITE_URL}${page.path}" />\n${social}\n<script type="application/ld+json" data-page-schema="true">${JSON.stringify(structuredData(page)).replaceAll('<', '\\u003c')}</script>\n</head>`)
      .replace('<div id="root"></div>', `<div id="root" data-prerendered="true">${render(page.path)}</div>`);
    const output = resolve('dist', `.${page.path}`, 'index.html');
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, html);
    console.log(`Pre-rendered ${page.path}`);
  }
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...publicPages.map(page => page.path), '/products/'].map(path => `  <url><loc>${SITE_URL}${path}</loc></url>`).join('\n')}\n</urlset>\n`;
  await writeFile('dist/sitemap.xml', sitemap);
  // Keep canonical redirects in sync as new service guides are added.
  const redirects = publicPages.filter(page => page.path !== '/').map(page => `${page.path.slice(0, -1)} ${page.path} 301`);
  await writeFile('dist/_redirects', `# Canonical public URLs\n${redirects.join('\n')}\n# Existing files take precedence over the client app fallback.\n/* /app.html 200\n`);
} finally {
  await vite.close();
}
