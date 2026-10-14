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
`/areas-we-serve/`, `/pricing/`, `/about/`, and `/contact/`. Each directory
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

After building, run `npm run verify:seo` from `client`. This starts a temporary
Vite production preview and checks direct HTTP responses for all seven public
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

## Check after deployment

1. Open `https://pplwash.in` and log in.
2. In browser DevTools, confirm API requests go to `https://laundry-backend-pokh.onrender.com/api/...`.
3. Sign in, open Account, and use Change password with the current password and a new password.
4. Open Register, choose a country, enter a valid phone number, and confirm the account is created immediately.
5. Confirm the saved phone number includes its international calling code.
6. From an admin invoice, choose Share on a mobile device and confirm the share sheet contains one PNG plus the order text.
