# Production deployment

## Render backend

Set these environment variables in the Render service, then trigger a new deploy:

```text
NODE_ENV=production
CORS_ORIGINS=https://pplwash.in,https://www.pplwash.in
SESSION_SECRET=<a random secret with at least 32 characters>
MONGODB_URI=<your MongoDB connection string>
```

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
