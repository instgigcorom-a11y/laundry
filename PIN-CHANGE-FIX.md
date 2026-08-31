# Owner PIN change fix

This update makes changing the owner PIN behave as a full security revocation.

## Expected behaviour

1. Only an email listed in `ADMIN_EMAILS` can attempt owner PIN verification.
2. A correct PIN creates a temporary admin token.
3. Changing the PIN replaces the scrypt PIN hash in MongoDB.
4. The same save increments `shops.adminTokenVersion`.
5. Every admin token created before that change is rejected immediately, including tokens open in other browser tabs/devices.
6. The frontend exits Owner Mode immediately after a successful PIN change.
7. The old PIN is rejected on the next owner login; only the new PIN works.

No new environment variable is required.

Keep your existing:

```env
ADMIN_EMAILS=rahulkanojiya8146@gmail.com
```

`OWNER_PIN` is only a first-boot bootstrap value. If `ownerPinHash` already exists in MongoDB, remove `OWNER_PIN` from `.env`.

## Files changed

- `public/index.html`
- `server/models/Shop.js`
- `server/services/security.js`
- `server/services/bootstrap.js`
- `server/middleware/auth.js`
- `server/routes/admin.js`
- `server/routes/orders.js`

## Test after replacing files

1. Restart the server with `npm start`.
2. Login with the allowlisted admin email.
3. Enter the current owner PIN and open Owner Mode.
4. Change the PIN.
5. The app should immediately return to normal account mode.
6. Try entering the old PIN: it must return "That PIN is not right."
7. Enter the new PIN: Owner Mode must unlock.
8. If another tab was already in Owner Mode before the PIN change, any admin action there must now request the PIN again.
