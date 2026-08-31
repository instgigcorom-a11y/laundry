# Rates database update

This build makes MongoDB the source of truth for the laundry rate overrides.

## Admin account

Set this in `server/.env`:

```env
ADMIN_EMAILS=rahulkanojiya8146@gmail.com
```

The admin flow is: register/login with that email -> verify the Push OTP -> enter the owner PIN.

## What changed

- Frontend rate keys now use `category/index/kind` (example: `men/0/dc`).
- Backend accepts both old dot keys (`men.0.dc`) and canonical slash keys and migrates them.
- `PUT /api/admin/rates` stores the validated rates in MongoDB `shops.rates`.
- `GET /api/shop` reads those rates from MongoDB for all users/devices.
- Browser caching is disabled for API reads so new prices are not hidden by a stale GET cache.
- The frontend no longer uses localStorage as the source of truth for price overrides.
- Old `localStorage.rates` data is deleted on startup.
- User profile information can still be cached locally as before.

## Test

1. Start the backend with `npm start`.
2. Register/login as `rahulkanojiya8146@gmail.com`.
3. Verify the 4-digit Push OTP.
4. Enter the owner PIN.
5. Go to Account -> Shop setup -> Edit rate list.
6. Change a price and save it.
7. In MongoDB Atlas, open the `shops` collection and inspect the document with `key: "main"`. The `rates` object should contain the changed value.
8. Open the application in an incognito window or another browser/device. The updated price should be loaded from `GET /api/shop` and shown there too.
