"""
Backend sanity tests for the new password-reset + AI-drafts work
(Déco Touché — iteration 12).

Covers:
  • POST /api/v1/auth/forgot-password (admin email, client email)
  • Rate-limit (4 rapid requests → 4th should yield 429)
  • POST /api/v1/auth/reset-password (invalid + valid token via DB)
  • POST /api/v1/ai/draft-quote (unauth → 401/403, empty → 400, prompt-only → JSON)
  • POST /api/v1/ai/draft-invoice (prompt-only → JSON)
"""

import os
import time
import uuid
import asyncio
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fallback used only by tests run inside the container; the .env is the source of truth
    BASE_URL = "https://serviceflow-preview.preview.emergentagent.com"

API = f"{BASE_URL}/api/v1"

ADMIN_EMAIL = "admin@cmgeorges.com"
ADMIN_PASSWORD = "strongpassword123"


# ---------------------- fixtures ---------------------------------------------

@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def admin_token(session):
    """Authenticate the seeded admin via the challenge endpoint."""
    r = session.post(
        f"{API}/auth/login/challenge",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=15,
    )
    if r.status_code != 200:
        pytest.skip(f"Admin login failed: {r.status_code} {r.text[:200]}")
    data = r.json()
    if data.get("challenge_required"):
        pytest.skip("Admin has 2FA enabled — cannot complete login non-interactively")
    token = data.get("access_token")
    assert token, "No access_token in login response"
    return token


@pytest.fixture(scope="module")
def admin_client(session, admin_token):
    s = requests.Session()
    s.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {admin_token}",
    })
    return s


# ---------------------- Forgot password --------------------------------------

class TestForgotPassword:
    """Forgot-password generic responses + rate-limit."""

    def test_forgot_password_admin_email(self, session):
        r = session.post(f"{API}/auth/forgot-password", json={"email": ADMIN_EMAIL}, timeout=10)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("success") is True
        assert "courriel" in body.get("message", "").lower() or "compte" in body.get("message", "").lower()

    def test_forgot_password_unknown_email_is_generic(self, session):
        r = session.post(
            f"{API}/auth/forgot-password",
            json={"email": f"TEST_unknown_{uuid.uuid4().hex[:6]}@example.com"},
            timeout=10,
        )
        # Should still be 200 with the same generic message (no enumeration)
        assert r.status_code == 200, r.text
        assert r.json().get("success") is True

    def test_forgot_password_client_register_and_request(self, session):
        # Register a client (best-effort; tolerate already-exists)
        email = f"TEST_client_{uuid.uuid4().hex[:8]}@example.com"
        reg = session.post(
            f"{API}/client/register",
            json={
                "email": email,
                "password": "StrongPass!123",
                "full_name": "Test Client",
                "phone": "5145551234",
            },
            timeout=15,
        )
        if reg.status_code not in (200, 201, 409):
            pytest.skip(f"Client registration unavailable: {reg.status_code} {reg.text[:200]}")

        r = session.post(f"{API}/auth/forgot-password", json={"email": email}, timeout=10)
        assert r.status_code == 200, r.text
        assert r.json().get("success") is True

    def test_forgot_password_rate_limit(self, session):
        """4 rapid identical requests — 4th should be 429."""
        email = f"TEST_rl_{uuid.uuid4().hex[:8]}@example.com"
        statuses = []
        for _ in range(4):
            r = session.post(f"{API}/auth/forgot-password", json={"email": email}, timeout=10)
            statuses.append(r.status_code)
        # First 3 should be 200, the 4th should be 429
        assert statuses[:3] == [200, 200, 200], f"first 3 statuses unexpected: {statuses}"
        assert statuses[3] == 429, f"expected 429 on 4th, got {statuses}"


# ---------------------- Reset password ---------------------------------------

class TestResetPassword:
    def test_reset_password_invalid_token(self, session):
        r = session.post(
            f"{API}/auth/reset-password",
            json={"token": "not-a-real-token-1234567890", "new_password": "NewStrongP@ss1"},
            timeout=10,
        )
        assert r.status_code == 400, r.text

    def test_reset_password_with_real_token_returns_role(self, session):
        """End-to-end: monkey-patch a token directly in MongoDB so we can use it."""
        import bcrypt
        from motor.motor_asyncio import AsyncIOMotorClient

        mongo_url = os.environ.get("MONGO_URL")
        db_name = os.environ.get("DB_NAME")
        if not mongo_url or not db_name:
            pytest.skip("MONGO_URL/DB_NAME not available in this environment")

        async def _seed_and_call():
            client = AsyncIOMotorClient(mongo_url)
            db = client[db_name]
            try:
                user = await db.users.find_one({"email": ADMIN_EMAIL}, {"_id": 0})
                if not user:
                    return None, None
                # Generate a fresh token, insert hashed copy
                import secrets
                from datetime import datetime, timezone, timedelta
                token_value = secrets.token_urlsafe(32)
                token_hash = bcrypt.hashpw(token_value.encode(), bcrypt.gensalt()).decode()
                expires_at = (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()
                await db.password_reset_tokens.insert_one({
                    "user_id": user["id"],
                    "token_hash": token_hash,
                    "expires_at": expires_at,
                    "used_at": None,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                })
                return token_value, user.get("role")
            finally:
                client.close()

        token_value, expected_role = asyncio.get_event_loop().run_until_complete(_seed_and_call())
        if not token_value:
            pytest.skip("Admin user not seeded in DB")

        # Use the token — but DO NOT actually replace the admin password permanently;
        # we reset it back to the original password right after.
        new_pw = ADMIN_PASSWORD  # set it to the SAME value so admin login keeps working
        r = session.post(
            f"{API}/auth/reset-password",
            json={"token": token_value, "new_password": new_pw},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("success") is True
        assert "role" in data, f"role missing in reset-password response: {data}"
        # Role must be one of the staff roles or 'client'
        assert data["role"] in {"admin", "ceo", "manager", "staff", "client"}, data
        # Since we used the admin email, the role should be a staff-level role
        assert data["role"] in {"admin", "ceo", "manager", "staff"}, \
            f"Expected admin/staff role for admin@, got {data['role']}"


# ---------------------- AI drafts --------------------------------------------

class TestAIDrafts:
    def test_draft_quote_requires_auth(self, session):
        r = session.post(f"{API}/ai/draft-quote", json={"prompt": "test"}, timeout=10)
        assert r.status_code in (401, 403), f"expected 401/403, got {r.status_code}"

    def test_draft_quote_empty_body_returns_400(self, admin_client):
        r = admin_client.post(f"{API}/ai/draft-quote", json={}, timeout=15)
        assert r.status_code == 400, r.text

    def test_draft_quote_prompt_only_returns_valid_json(self, admin_client):
        r = admin_client.post(
            f"{API}/ai/draft-quote",
            json={"prompt": "Peinture du salon 200 pi² murs et plafond, deux couches, blanc mat."},
            timeout=90,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        # Required fields
        assert "summary" in data and isinstance(data["summary"], str) and data["summary"]
        assert "lines" in data and isinstance(data["lines"], list) and len(data["lines"]) >= 1
        assert "contingency_percent" in data
        assert "notes" in data
        # line_type validation
        for ln in data["lines"]:
            assert ln.get("line_type") in {"labor", "material", "delivery", "other"}, ln
            assert isinstance(ln.get("description", ""), str) and ln["description"]
            assert "unit_price" in ln
            assert "quantity" in ln

    def test_draft_invoice_prompt_only_returns_valid_json(self, admin_client):
        r = admin_client.post(
            f"{API}/ai/draft-invoice",
            json={"prompt": "Installation TV murale 55 pouces, support fixe, gestion des câbles."},
            timeout=90,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert "lines" in data and isinstance(data["lines"], list) and len(data["lines"]) >= 1
        assert "notes" in data
        assert "payment_terms" in data
        for ln in data["lines"]:
            assert ln.get("line_type") in {"service", "material", "delivery", "other"}, ln
            assert ln.get("description")
            assert "unit_price" in ln
