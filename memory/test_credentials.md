# Test Credentials — Déco Touché

## Admin (preview/dev)
- Email: `admin@cmgeorges.com` (override via `TEST_ADMIN_EMAIL`)
- Password: `strongpassword123` (override via `TEST_ADMIN_PASSWORD`)

## Production admin
- Created at first deploy via `migrations/admin_seed.py` (idempotent)
- Default email: `cmgeorges.cie@gmail.com` (from `BRAND.EMAIL`)
- Temporary password generated randomly and emailed via Resend
- **Must be changed within 48h** at first login
- Optional override: env var `INITIAL_ADMIN_PASSWORD`
- **To recover access if locked out**: go to `/mot-de-passe-oublie` on production and enter the admin email — secure email link valid 60 min.

## Authentication architecture (httpOnly cookies + backward-compatible Bearer)
- **Token storage**: backend now sets `dt_access_token` + `dt_refresh_token` cookies (HttpOnly, Secure, SameSite=Lax) on every login endpoint. Browser sends them automatically — **XSS-safe**.
- **Backward compat**: `Authorization: Bearer <token>` header still works (some legacy SDK clients rely on it). Server prefers header over cookie.
- Frontend axios is configured with `withCredentials: true` so browser cookies are sent on every API call.
- Logout endpoints (`POST /api/v1/auth/logout` & `/api/v1/client/logout`) clear the cookies via `Set-Cookie ...; Max-Age=0`.

## Authentication flow (frontend)
- **Login admin**: `/admin/login` → `/api/v1/auth/login/challenge`
  - No 2FA: returns access_token + sets cookies → user redirected to dashboard
  - 2FA enabled: returns `challenge_token` → 6-digit code via `/api/v1/auth/login/verify-2fa` (sets cookies on success)
- **Login client**: `/client/login` → `/api/v1/client/login` (sets cookies)
- **Forgot password (admin)**: `/mot-de-passe-oublie` (public, rate-limited 3 req / 15 min)
- **Forgot password (client)**: `/mot-de-passe-oublie?from=client`
- **Reset password**: `/reinitialiser-mot-de-passe?token=...` (1-hour single-use token)
  - Returns `role` for redirect to correct login page
- **Change password / email**: `/admin/profile`
- **2FA setup**: `/admin/profile` (TOTP QR or Email 6-digit)
- **Logout**: clears cookies on both server and browser, navigates to login

## AI Draft endpoints (admin only)
- `POST /api/v1/ai/draft-quote` — body `{ lead_id?, prompt?, extra_context? }`
- `POST /api/v1/ai/draft-invoice` — body `{ client_id?, quote_id?, project_id?, prompt?, extra_context? }`
- Powered by Claude Sonnet 4.5 via `EMERGENT_LLM_KEY`

## URLs
- Preview: https://serviceflow-preview.preview.emergentagent.com
- Production: https://cmgeorges.ca

## Cookie env vars (backend)
- `COOKIE_SECURE` (default `true`) — set to `false` only for local HTTP testing
- `COOKIE_SAMESITE` (default `lax`)
- `COOKIE_DOMAIN` (default: host-only) — leave empty unless you serve frontend + API on different subdomains

## Notes
- Brand info centralized: `/app/frontend/src/config/brand.js` & `/app/backend/config/brand.py`
- Stripe in LIVE mode — do not use test cards
- Resend `RESEND_API_KEY` required for password reset / 2FA email / admin welcome email
- `EMERGENT_LLM_KEY` required for AI draft endpoints
