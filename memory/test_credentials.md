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
- **To recover access if locked out**: go to `/mot-de-passe-oublie` on production and enter the admin email — secure email link valid 60 min.

## Authentication flow (frontend)
- **Login admin**: `/admin/login` → uses `/api/v1/auth/login/challenge`
  - If no 2FA: returns access_token immediately
  - If 2FA enabled: returns `challenge_token` → user enters 6-digit code → `/api/v1/auth/login/verify-2fa`
- **Login client**: `/client/login` → uses `/api/v1/client/login`
- **Forgot password (admin)**: `/mot-de-passe-oublie` (public, rate-limited 3 req / 15 min)
- **Forgot password (client)**: `/mot-de-passe-oublie?from=client` (same endpoint, db.users supports both roles)
- **Reset password**: `/reinitialiser-mot-de-passe?token=...` (1-hour single-use token, emailed)
  - Returns `role` so the UI redirects to the right login page
- **Change password / email**: `/admin/profile` (authenticated)
- **2FA setup**: `/admin/profile` — TOTP (QR code) or Email 6-digit code

## AI Draft endpoints (admin only)
- `POST /api/v1/ai/draft-quote` — body `{ lead_id?, prompt?, extra_context? }`
- `POST /api/v1/ai/draft-invoice` — body `{ client_id?, quote_id?, project_id?, prompt?, extra_context? }`
- Powered by Claude Sonnet 4.5 via `EMERGENT_LLM_KEY` (env)

## URLs
- Preview: https://serviceflow-preview.preview.emergentagent.com
- Production: https://cmgeorges.ca

## Notes
- Brand info centralized: `/app/frontend/src/config/brand.js` & `/app/backend/config/brand.py`
- Stripe in LIVE mode — do not use test cards
- Resend `RESEND_API_KEY` required for password reset / 2FA email / admin welcome email
- `EMERGENT_LLM_KEY` required for AI draft endpoints
