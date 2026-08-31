# Final update — register/login with email or mobile

This build keeps all previous fixes (MongoDB prices, admin allowlist, PIN-change revocation) and adds flexible customer identifiers.

## Registration

A customer enters:

- Name (required)
- Email (optional)
- Mobile number (optional)

At least **one** of email or mobile is required. A customer may provide both.

Examples:

- Name + email only ✅
- Name + mobile only ✅
- Name + email + mobile ✅
- Name only ❌

Indian mobile numbers are normalized to a 10-digit number. Inputs such as `+91 98765 43210`, `09876543210`, and `9876543210` resolve to the same stored mobile number.

## Login

The login screen has one field: **Email or mobile number**.

If an account has both identifiers, either one can be used to request and verify the same 4-digit Push OTP.

The OTP is still delivered through the browser Push subscription saved at registration. The email/mobile value is the account lookup identifier; this version does not send the OTP by SMS or email.

## MongoDB users

User documents can now contain either or both:

```json
{
  "name": "Customer Name",
  "email": "customer@example.com",
  "phone": "9876543210"
}
```

`email` and `phone` each have a sparse unique MongoDB index. On startup, the server automatically replaces the older non-sparse email-only unique index, allowing multiple phone-only accounts while preserving uniqueness for real email addresses.

## Existing users

Existing email accounts continue to work without re-registering. Their existing HttpOnly sessions also continue to work until they expire/log out.

## LocalStorage

Only non-sensitive cached profile/UI data is kept locally:

- name
- email (if present)
- phone (if present)

Authentication continues to use the HttpOnly `ppl_session` cookie.

## Admin

Admin authorization is unchanged. The owner account is still allowlisted by:

```env
ADMIN_EMAILS=rahulkanojiya8146@gmail.com
```

A phone-only customer cannot become admin by knowing the owner PIN. Admin mode still requires:

1. login as the allowlisted email account,
2. the correct owner PIN,
3. a current admin token version.

## No new environment variables

This update adds no required `.env` setting. Keep your existing MongoDB, secrets, VAPID keys, and `ADMIN_EMAILS` values.
