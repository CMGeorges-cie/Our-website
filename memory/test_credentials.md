# Test Credentials — Déco Touché

## Admin (preview/dev)
- Email: `admin@cmgeorges.com`
- Password: `strongpassword123`

## Production admin
- Created at first deploy via `migrations/admin_seed.py` (idempotent)
- Default email: `cmgeorges.cie@gmail.com` (from `BRAND.EMAIL`)
- Temporary password generated randomly and emailed via Resend
- **Must be changed within 48h** at first login
- Optional override: env var `INITIAL_ADMIN_PASSWORD`

## Authentication flow (frontend)
- **Login**: `/admin/login` → uses `/api/v1/auth/login/challenge`
  - If no 2FA: returns access_token immediately
  - If 2FA enabled: returns `challenge_token` → user enters 6-digit code → `/api/v1/auth/login/verify-2fa`
- **Forgot password**: `/mot-de-passe-oublie` (public, rate-limited 3 req / 15 min)
- **Reset password**: `/reinitialiser-mot-de-passe?token=...` (1-hour single-use token, emailed)
- **Change password**: `/admin/profile` (authenticated)
- **2FA setup**: `/admin/profile` — TOTP (QR code) or Email 6-digit code

## URLs
- Preview: https://serviceflow-preview.preview.emergentagent.com
- Production: https://cmgeorges.ca

## Notes
- Brand info centralized: `/app/frontend/src/config/brand.js` & `/app/backend/config/brand.py`
- Stripe in LIVE mode — do not use test cards
- Resend `RESEND_API_KEY` required for password reset / 2FA email / admin welcome email
