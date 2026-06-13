"""
Cookie-based auth regression tests for iteration 13.

Verifies that:
1. /api/v1/auth/login sets dt_access_token + dt_refresh_token cookies (HttpOnly, Secure, SameSite=lax).
2. Protected /api/v1/auth/me works with COOKIE ONLY (no Authorization header).
3. Protected /api/v1/auth/me still works with Authorization Bearer header (backward compat).
4. /api/v1/auth/logout clears both cookies (Max-Age=0).
5. /api/v1/client/login also sets dt_access_token cookie.
6. /api/v1/auth/login/challenge (no 2FA path) also sets dt_access_token cookie.
"""
import os
import uuid
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
ADMIN_EMAIL = os.environ.get("TEST_ADMIN_EMAIL", "admin@cmgeorges.com")
ADMIN_PASSWORD = os.environ.get("TEST_ADMIN_PASSWORD", "strongpassword123")


def _get_set_cookie_headers(resp) -> list[str]:
    """Return all raw Set-Cookie header lines from a response."""
    # requests.Response.raw.headers may collapse multi-headers; use msg.get_all
    headers = []
    try:
        headers = resp.raw.headers.get_all("Set-Cookie")  # urllib3 HTTPHeaderDict
    except Exception:
        pass
    if not headers:
        # Fallback: best effort split (won't split inside attributes)
        sc = resp.headers.get("Set-Cookie")
        if sc:
            headers = [sc]
    return headers or []


# === 1. /auth/login sets cookies with HttpOnly, Secure, SameSite=lax ===
def test_login_sets_httponly_cookies():
    sess = requests.Session()
    r = sess.post(
        f"{BASE_URL}/api/v1/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=20,
    )
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"

    set_cookies = _get_set_cookie_headers(r)
    joined = "\n".join(set_cookies)
    assert "dt_access_token=" in joined, f"dt_access_token cookie not set. Got: {joined!r}"
    assert "dt_refresh_token=" in joined, f"dt_refresh_token cookie not set. Got: {joined!r}"

    # Both cookies should have HttpOnly and Secure flags + SameSite=lax
    access_lines = [l for l in set_cookies if l.lower().startswith("dt_access_token=")]
    refresh_lines = [l for l in set_cookies if l.lower().startswith("dt_refresh_token=")]
    assert access_lines and refresh_lines

    for line in access_lines + refresh_lines:
        low = line.lower()
        assert "httponly" in low, f"HttpOnly missing on: {line}"
        assert "secure" in low, f"Secure missing on: {line}"
        assert "samesite=lax" in low, f"SameSite=lax missing on: {line}"

    # Also confirm session jar now has the cookies
    assert sess.cookies.get("dt_access_token"), "Session jar missing dt_access_token"
    assert sess.cookies.get("dt_refresh_token"), "Session jar missing dt_refresh_token"


# === 2. /auth/me works with COOKIE only (no Authorization header) ===
def test_auth_me_with_cookie_only():
    sess = requests.Session()
    r = sess.post(
        f"{BASE_URL}/api/v1/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=20,
    )
    assert r.status_code == 200

    # No Authorization header — rely on cookie only
    me = sess.get(f"{BASE_URL}/api/v1/auth/me", timeout=15)
    assert me.status_code == 200, f"/auth/me with cookie failed: {me.status_code} {me.text}"
    body = me.json()
    assert body.get("email") == ADMIN_EMAIL
    assert body.get("role") == "admin"


# === 3. /auth/me still works with Bearer header (backward compatibility) ===
def test_auth_me_with_bearer_header():
    # Fresh session WITHOUT the cookie — Bearer only
    r = requests.post(
        f"{BASE_URL}/api/v1/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=20,
    )
    assert r.status_code == 200
    token = r.json().get("access_token")
    assert token

    me = requests.get(
        f"{BASE_URL}/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
        timeout=15,
    )
    assert me.status_code == 200, f"/auth/me with bearer failed: {me.status_code} {me.text}"
    assert me.json().get("email") == ADMIN_EMAIL


# === 4. /auth/logout clears both cookies ===
def test_logout_clears_cookies():
    sess = requests.Session()
    r = sess.post(
        f"{BASE_URL}/api/v1/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=20,
    )
    assert r.status_code == 200
    assert sess.cookies.get("dt_access_token")

    out = sess.post(f"{BASE_URL}/api/v1/auth/logout", timeout=15)
    assert out.status_code == 200, f"logout failed: {out.status_code} {out.text}"

    set_cookies = _get_set_cookie_headers(out)
    joined = "\n".join(set_cookies).lower()
    # FastAPI delete_cookie issues Set-Cookie with Max-Age=0 (or expires=epoch)
    assert "dt_access_token=" in joined, "logout should re-set dt_access_token with empty value"
    assert "dt_refresh_token=" in joined, "logout should re-set dt_refresh_token with empty value"
    assert ("max-age=0" in joined) or ("expires=thu, 01 jan 1970" in joined), (
        f"logout did not invalidate cookies: {set_cookies}"
    )

    # Session jar should have been instructed to clear the cookies
    # (Either removed, or set to empty string with expired date)
    access_after = sess.cookies.get("dt_access_token")
    assert not access_after, f"dt_access_token still present after logout: {access_after!r}"


# === 5. /client/login also sets dt_access_token cookie ===
def test_client_login_sets_cookie():
    # Register a fresh client first
    email = f"TEST_cookie_{uuid.uuid4().hex[:8]}@example.com"
    password = "ClientPass123!"
    reg = requests.post(
        f"{BASE_URL}/api/v1/client/register",
        json={
            "email": email,
            "password": password,
            "full_name": "Cookie Test Client",
            "phone": "514-555-0000",
        },
        timeout=20,
    )
    assert reg.status_code in (200, 201), f"client register failed: {reg.status_code} {reg.text}"

    sess = requests.Session()
    r = sess.post(
        f"{BASE_URL}/api/v1/client/login",
        json={"email": email, "password": password},
        timeout=20,
    )
    assert r.status_code == 200, f"client login failed: {r.status_code} {r.text}"

    set_cookies = _get_set_cookie_headers(r)
    joined = "\n".join(set_cookies).lower()
    assert "dt_access_token=" in joined, f"client login did not set dt_access_token: {set_cookies}"
    assert sess.cookies.get("dt_access_token"), "session jar missing dt_access_token after client login"


# === 6. /auth/login/challenge (no 2FA) sets dt_access_token cookie ===
def test_login_challenge_no_2fa_sets_cookie():
    sess = requests.Session()
    r = sess.post(
        f"{BASE_URL}/api/v1/auth/login/challenge",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=20,
    )
    assert r.status_code == 200, f"login/challenge failed: {r.status_code} {r.text}"
    body = r.json()

    # If 2FA is NOT enabled on the admin, we should get access_token + cookie set.
    if body.get("requires_2fa"):
        # The admin happens to have 2FA enabled — skip the cookie assertion path
        # but still ensure the endpoint is OK.
        assert "challenge_token" in body
        return

    assert body.get("access_token"), f"login/challenge should return access_token when no 2FA. Body: {body}"

    set_cookies = _get_set_cookie_headers(r)
    joined = "\n".join(set_cookies).lower()
    assert "dt_access_token=" in joined, f"login/challenge did not set dt_access_token: {set_cookies}"
    assert sess.cookies.get("dt_access_token"), "session jar missing dt_access_token after challenge login"
