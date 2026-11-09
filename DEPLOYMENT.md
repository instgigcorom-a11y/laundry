# Production deployment

## Render backend

### Local development DNS workaround

`server/dns-fix.cjs` is preloaded only by `npm run dev` in `server`.
It sets the Node promise DNS resolver to Google DNS (`8.8.8.8` and `8.8.4.4`)
before the MongoDB driver starts. This can work around local DNS failures when
the driver resolves SRV/TXT records for a `mongodb+srv://` connection string.
It does not change the machine's DNS settings or Node's OS-backed `dns.lookup`.
It is unrelated to the frontend build or SEO. Production `npm start` does not
load this file; production should normally use the host's working DNS resolver.
The workaround sends DNS queries, including the database hostname, to Google
DNS; it does not send database credentials. It does not fix database credentials,
IP access-list rules, or blocked database connections.

Set these environment variables in the Render service, then trigger a new deploy:

```text
NODE_ENV=production
CORS_ORIGINS=https://pplwash.in,https://www.pplwash.in
SESSION_SECRET=<a random secret with at least 32 characters>
MONGODB_URI=<your MongoDB connection string>
```

## Admin order push alerts

Background order alerts use Web Push. This lets an enrolled admin device receive a
system notification even when the laundry tab is closed. Generate a VAPID key pair
once from the backend folder:

```text
npm run generate:vapid
```

Add the generated values to the Render backend environment, then redeploy it:

```text
VAPID_SUBJECT=mailto:your-email@example.com
VAPID_PUBLIC_KEY=<generated public key>
VAPID_PRIVATE_KEY=<generated private key>
```

After deployment, sign in as an admin and choose `Enable alerts`. Allow browser
notifications when asked. The device is then enrolled for new-order alerts. Browser
and operating-system notification permissions must remain enabled. Native background
notifications use the device's selected system sound; the louder three-note chime is
used while the admin page is open.

## Frontend

Set this build-time environment variable on the frontend host, then redeploy the frontend:

```text
VITE_API_URL=https://laundry-backend-pokh.onrender.com
```

Vite embeds `VITE_API_URL` during the build. Adding it after the build will not update the already-deployed site.

### Public pages and static hosting

Build from `client` with `npm run build` and publish **all of `client/dist`**.
The build uses React server rendering through Vite to generate initial HTML for
`/`, `/laundry-service-amritsar/`, `/dry-cleaning-amritsar/`,
`/areas-we-serve/`, `/pricing/`, `/about/`, and `/contact/`, plus the eight service
guide URLs listed below. Each directory
contains its own `index.html`, title, description, canonical URL, visible content,
and business JSON-LD. The browser hydrates the same React routes. No production
Node rendering server is required. See [Vite's SSR guide](https://vite.dev/guide/ssr.html).

Configure the host to serve existing files and directory indexes **before** the
SPA fallback. For unmatched customer/admin URLs, rewrite to `/app.html` with a
200 response. Do not force every URL to `/index.html`: that would return the home
page HTML for the other public pages. The included `_redirects` supports hosts
such as Netlify and Cloudflare Pages that respect file precedence. On Render
Static Sites, use a `/*` → `/app.html` rewrite; existing static files must take
precedence. On Nginx, use `try_files $uri $uri/ /app.html;` with `index index.html;`.
Keep `/products/` and all existing account, booking and admin routes available.
No existing public URL was replaced, so no replacement redirects are required.

The SEO update also generates `products/index.html`, an **indexable interactive
catalogue shell** with its own canonical and social metadata. Keep this file
ahead of the fallback. `app.html` now has `noindex, follow` for account, login,
booking and admin URLs. Never rewrite public pages or `/products/` to that
utility shell. Public pre-rendered pages have `index, follow`. Route metadata
also updates after React navigation, removing public schema from utility pages.
Deploy the complete output together so these templates remain consistent.

Page-specific Open Graph, Twitter/X metadata and connected JSON-LD are generated
from `client/src/data/seo.js`. The social image reuses the existing homepage
illustration and official logo; `npm run optimize:images` recreates it. See
`SEO-REPORT.md` for the implementation inventory, checks and remaining live-host
validation. HTTP-to-HTTPS and www-to-non-www redirects must be verified on the
actual domain host; no DNS or hosting configuration was changed by this update.

After building, run `npm run verify:seo` from `client`. This starts a temporary
Vite production preview and checks direct HTTP responses for all fifty-four public
pages, including their slashless variants, without executing client JavaScript.
It also checks all 39 candidate areas, price row counts, sitemap and business
schema. Repeat the URL checks against the live host after deployment to catch
host-specific rewrite issues.

Public content is in `client/src/pages/PublicPages.jsx`; metadata, candidate area
groups and business schema are in `client/src/data/publicPages.js`. Address and
phone details are shared with the existing app through `shopDetails.js`.
The pricing page renders the existing `starterCatalog.js` public rate card;
the live ordering catalogue still uses the backend. If admin rates change,
update the published rate card and rebuild to keep the static prices aligned.
The new pages ask customers to confirm hours, pickup coverage, charges and
return dates instead of publishing unverified schedules or promises.

### Clickable service tags

The visible Tags section above the footer links to ten distinct service topics:
laundry and dry cleaning use their existing pages; eight additional guides cover
steam pressing, shoes, curtains, carpets, blankets, suits, sarees and bags.
Their URLs are `/steam-press-amritsar/`, `/shoe-cleaning-amritsar/`,
`/curtain-dry-cleaning-amritsar/`, `/carpet-cleaning-amritsar/`,
`/blanket-dry-cleaning-amritsar/`, `/suit-dry-cleaning-amritsar/`,
`/saree-dry-cleaning-amritsar/` and `/bag-cleaning-amritsar/`.

Guide content, rate-card filters and tag labels live in
`client/src/data/serviceGuides.js`; the link component is
`client/src/components/ServiceTags.jsx`. Rates come from the existing public
catalogue rather than a second price list. Guides include distinct service
information, item preparation guidance, published rates, visible FAQs and
contact actions. The ten topics are an editorial selection from the verified
catalogue, without an assertion about measured keyword volumes or rankings.
The main footer keeps the original seven navigation links. The sitemap now
contains fifty-five URLs, including the existing `/products/` catalogue. The build
generates canonical redirects for every public page. `npm run verify:seo`
checks all fifty-four initial HTML responses, exactly ten clickable tags on each,
guide content, prices, FAQs, links, assets, sitemap and legacy route fallbacks.

### Area enquiry pages and business FAQs

All 39 entries in `/areas-we-serve/` now link to
`/areas-we-serve/<area-slug>/`. These are enquiry and directions pages for the
single existing shop, not new branches or guarantees of coverage. Each has its
own title, description, canonical URL, area-specific enquiry prompt, approximate
distance band, Google Maps directions originating from that named area, and a
WhatsApp enquiry with the area filled in. Optional address/item fields update
the WhatsApp message in the browser; the customer reviews and sends it in
WhatsApp. These fields are not saved and do not create a booking. Use the shop
pin and confirm the precise starting point in Maps before travelling. No exact
road distance, travel time or new local landmark is invented.

Area page data is built from the existing groups and
`client/src/data/areaGuides.js`; the enquiry interface is in
`client/src/components/AreaContent.jsx`. All area pages are pre-rendered and
included in the sitemap and canonical redirects. They link back to the areas
directory, service pages, prices, contact details and home FAQs. Other entries
in the same approximate band are labelled as such, without assuming adjacency.

The home, areas directory and contact pages include ten native HTML FAQ
accordions. All answers exist in the initial HTML and can be expanded without
JavaScript. Content lives in `client/src/data/businessFaqs.js`; prices in those
answers are derived from the existing public catalogue. The answers explain
services, location, booking, prices, pickup confirmation, turnaround enquiries,
household items, shoes/bags and item preparation without promising unverified
offers, express turnaround, certifications or free delivery.

## Check after deployment

### Responsive homepage

The homepage follows the supplied green-and-cream design reference. Its React
components and scoped responsive styles are in
`client/src/components/HomeLanding.jsx` and `homeLanding.css`. The four care
cards read prices from the existing public catalogue and link to service pages.
Mobile navigation uses a native details menu. The homepage retains the existing
business FAQs, shop address, account links, area directory and contact actions.
Other routes retain their layouts; a tablet footer adjustment prevents overflow.

Run `npm run verify:homepage` in `client` to check widths 320, 390, 768, 1024 and
1440 in an installed Chromium browser. It defaults to Windows Edge or Chrome;
set `BROWSER_BIN` to an installed browser elsewhere. The test checks layout,
image loading, menu/FAQ interactions, service-card navigation, homepage FAQ anchor
navigation and browser exceptions. It saves desktop and phone screenshots under
`client/node_modules/.cache/ppl-homepage-qa/` and closes its browser/server.
Run `npm run verify:seo` separately for all public pages and the sitemap.

The illustrative hero asset is `client/public/images/home-laundry-hero.png`,
created with the built-in `image_gen` tool using the user's homepage reference.
It is an illustration of laundry care, not a photograph of the actual shop.
Final image prompt:

> Create a website hero PHOTOGRAPH ASSET only, based on the photographic right-hand portion of the reference homepage image. No website UI, no text, no logos, no typography, no cards, no buttons. Square or portrait composition: neatly folded forest green cotton shirt on top of ivory and beige terry towels on a pale marble counter, soft sunlit laundry room with white front-load washer, warm light oak cabinetry, small leafy green plants, a few hanging forest-green and ivory shirts in background. Premium calm editorial product photography, realistic woven cotton and towel texture, warm cream sage and dark forest-green palette. Main folded stack foreground on right-center, washer background left-center. Natural depth of field and soft daylight. Full image photographic without graphic framing or decorations. This is illustrative laundry photography, not a photograph of the actual shop.

### PageSpeed improvements

The homepage uses responsive WebP images (480, 768 and 1145 px) instead of the
2.2 MiB source PNG, with matching `srcset`/`sizes`, correct intrinsic dimensions
and high fetch priority. The source PNG remains available for regeneration;
`npm run optimize:images` recreates the WebP variants and the 76 px WhatsApp icon.
The browser does not request the source PNG. The WebP hero variants are about
35, 76 and 135 KB, and the chat icon is about 1.5 KB.

Auth, customer and admin pages are lazy-loaded along with their application CSS.
Socket.IO and admin alerts load only for admins. PDF generation and the phone
input library are no longer part of the homepage entry bundle. Shared public
styles remain in `src/index.css`; app-only rules are in `src/app.css`. Fonts are
self-hosted under `public/fonts` with their Open Font License files; the Google
Fonts CSS import and the unused DM Sans download have been removed. Entry JS
is about 92 KB gzipped and entry CSS about 7.6 KB gzipped, compared with roughly
353 KB and 39 KB in the supplied report. Production source maps are emitted.
The primary WhatsApp button and floating chat label use darker backgrounds to
pass text contrast checks.

Deploy **both frontend and backend** for the anonymous-session fix. The public
`GET /api/auth/me` now returns HTTP 200 with `{ "user": null }` for a guest,
with `Cache-Control: no-store`. Cookie and bearer sessions are still supported;
protected operations continue to require authentication and return 401 when
needed. `node --test test/session.test.cjs` in `server` checks these cases with
fixtures and no database connection.

`public/.well-known/ard.json` and `ai-catalog.json` are real JSON manifests
with empty entries, accurately declaring that no AI tools are offered. The
discovery paths no longer fall through to the HTML app shell. `public/llms.txt`
lists public business pages and confirmation requirements without promising
search rankings or advertising nonexistent tools.

Run `npm run audit:pagespeed` from `client` for local desktop/mobile Lighthouse
reports. It uses an installed Edge browser (or `BROWSER_BIN`) and the real
anonymous session handler in an isolated local API, without starting MongoDB.
JSON/HTML reports are saved under `node_modules/.cache/ppl-performance/`.
Local scores are diagnostic and will differ from live PageSpeed measurements
due to hosting, network latency, backend cold starts and audit-version changes.
Lighthouse is pinned to 13.5.0; compatible dependency security fixes are locked.
Repeat live PageSpeed tests after deployment. The browser regression also checks
that homepage requests exclude the app/PDF/phone chunks and legacy PNG/font URLs,
and that the lazy login and catalogue routes still work.

### Live checks after deployment

1. Open `https://pplwash.in` and log in.
2. In browser DevTools, confirm API requests go to `https://laundry-backend-pokh.onrender.com/api/...`.
3. Sign in, open Account, and use Change password with the current password and a new password.
4. Open Register, choose a country, enter a valid phone number, and confirm the account is created immediately.
5. Confirm the saved phone number includes its international calling code.
6. From an admin invoice, choose Share on a mobile device and confirm the share sheet contains one PNG plus the order text.
