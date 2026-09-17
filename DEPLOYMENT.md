# Production deployment

## Render backend

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

## Check after deployment

1. Open `https://pplwash.in` and log in.
2. In browser DevTools, confirm API requests go to `https://laundry-backend-pokh.onrender.com/api/...`.
3. Sign in, open Account, and use Change password with the current password and a new password.
