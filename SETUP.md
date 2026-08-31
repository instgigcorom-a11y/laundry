# Prem Power Laundry — Express + MongoDB + Push OTP

This is the final combined build. It keeps the existing laundry UI and uses Express + MongoDB for users, orders, prices/shop settings, admin security, and PIN changes.

Customers can now register with **email or mobile number**. They may provide both, but at least one is required. Login accepts either identifier.

## Included behavior

- Registration: name + email and/or Indian mobile number.
- Email is optional when a valid mobile number is supplied.
- Mobile is optional when a valid email is supplied.
- Login field accepts either email or mobile.
- Existing email-only users keep working.
- 4-digit OTP is delivered using browser Web Push.
- Login session uses an HttpOnly cookie.
- Non-sensitive customer profile data is cached in localStorage.
- Returning logged-in users go directly to Home after `/api/me` succeeds.
- Prices/rates are stored in MongoDB and returned to every device.
- Admin access requires the allowlisted email + owner PIN.
- Changing the owner PIN revokes all previously issued admin tokens.

## 1. Install packages

Open PowerShell in `server`:

```powershell
npm install
```

## 2. Create `.env`

Copy `server/.env.example` to `server/.env`.

### MongoDB

Local MongoDB:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/prem_power_laundry
```

MongoDB Atlas example:

```env
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/prem_power_laundry?retryWrites=true&w=majority
```

Replace username/password/cluster with Atlas values. URL-encode reserved characters in the password.

### Session + OTP secrets

Run twice:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Use different values:

```env
SESSION_SECRET=...
OTP_PEPPER=...
```

### Owner/admin

The owner email is:

```env
ADMIN_EMAILS=rahulkanojiya8146@gmail.com
```

Only on the first successful MongoDB boot, if no PIN hash exists yet:

```env
OWNER_PIN=YOUR_4_TO_8_DIGIT_PIN
```

After the PIN hash is stored, remove `OWNER_PIN` from `.env`.

### Web Push

After `npm install`:

```powershell
npx web-push generate-vapid-keys
```

Put the generated values in `.env`:

```env
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:rahulkanojiya8146@gmail.com
```

Keep the VAPID private key only on the backend.

## 3. Run

```powershell
npm start
```

Open:

```text
http://localhost:8080
```

Do not run the frontend with VS Code Live Server for normal use. Express serves `public/index.html` and `/sw.js` from the same `localhost:8080` origin.

## 4. Registration tests

All three should work:

### Email-only customer

- Name: required
- Email: valid email
- Mobile: blank

Allow notifications, receive the 4-digit Push OTP, verify, and log in.

### Mobile-only customer

- Name: required
- Email: blank
- Mobile: valid 10-digit Indian number

Accepted examples include `9876543210`, `+91 98765 43210`, and `09876543210`. They are stored canonically as `9876543210`.

Allow notifications, receive the Push OTP, verify, and log in.

### Customer with both

Enter name + email + mobile. After registration that customer can log in using either the email or the mobile number.

## 5. Already-logged-in users

On reload the frontend first calls:

```text
GET /api/me
```

If the HttpOnly session cookie is valid, the user goes directly to Home and does not see registration/name/OTP pages again.

## 6. Account details

The Account screen lets a customer keep/update:

- name,
- email (optional),
- mobile (optional).

At least one login identifier must remain. A customer with both can remove either one, but not both.

## 7. MongoDB user indexes and existing database migration

Older builds required email and created a normal unique `email_1` index. Phone-only accounts need email to be absent.

This build starts MongoDB with automatic index creation disabled, then safely:

1. detects the old non-sparse user email index,
2. replaces it with a sparse unique email index,
3. creates a sparse unique phone index,
4. creates/confirms the OTP, order, and shop indexes.

Existing users and their data are not deleted.

## 8. MongoDB-backed prices

Owner login → Account → Shop setup → Edit rate list → change a rate → Save.

`PUT /api/admin/rates` stores the rate overrides in the `shops` collection. `GET /api/shop` returns them to every device. Browser localStorage is not the source of truth for prices.

## 9. Admin security

Admin access remains tied to:

```env
ADMIN_EMAILS=rahulkanojiya8146@gmail.com
```

A normal email or phone-only customer cannot unlock admin mode even if they know the PIN.

Changing the owner PIN increments `adminTokenVersion`, invalidating all old admin step-up tokens immediately.

## 10. Push OTP limitation

The email/mobile number is used to identify the MongoDB account. The OTP itself is delivered through Web Push to a registered browser/device.

This does not send an SMS to the mobile number and does not send an email to the email address. For a future production upgrade, you can add SMS/email fallback for new devices.
