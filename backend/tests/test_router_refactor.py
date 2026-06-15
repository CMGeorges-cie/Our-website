"""
Regression tests for the server.py router refactor (Iteration 15).

Covers:
  - Blog public + admin endpoints
  - Policies public + admin endpoints
  - Pricing items public + admin endpoints
  - Discount codes public + admin endpoints
  - Auth enforcement (401 / 403)
  - reCAPTCHA enforcement on /api/v1/leads and /api/v1/contact
  - CORS configuration (explicit origins, credentials, blocked origin)
  - Existing untouched routes still respond

Run:
  pytest /app/backend/tests/test_router_refactor.py -v \
    --tb=short --junitxml=/app/test_reports/pytest/router_refactor.xml
"""
from __future__ import annotations

import os
import time
import uuid
from typing import Optional

import pytest
import requests

def _load_frontend_env_url() -> str:
    # Allow running outside the container shell by reading frontend/.env
    try:
        with open("/app/frontend/.env") as fp:
            for line in fp:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    return line.split("=", 1)[1].strip().strip('"').strip("'")
    except OSError:
        pass
    return ""


BASE_URL = (
    os.environ.get("REACT_APP_BACKEND_URL") or _load_frontend_env_url()
).rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL must be configured"
API = f"{BASE_URL}/api/v1"
LOCAL_API = "http://localhost:8001/api/v1"  # direct backend (no ingress) for CORS header check

ADMIN_EMAIL = os.environ.get("TEST_ADMIN_EMAIL", "admin@cmgeorges.com")
ADMIN_PASSWORD = os.environ.get("TEST_ADMIN_PASSWORD", "strongpassword123")


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def session() -> requests.Session:
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_token(session: requests.Session) -> str:
    """Login as admin via challenge endpoint; falls back to /auth/login."""
    # Try challenge endpoint first (no 2FA -> returns access_token)
    r = session.post(
        f"{API}/auth/login/challenge",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
    )
    if r.status_code == 200 and r.json().get("access_token"):
        return r.json()["access_token"]
    # Fallback
    r = session.post(
        f"{API}/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
    )
    if r.status_code == 200 and r.json().get("access_token"):
        return r.json()["access_token"]
    pytest.skip(f"Cannot login as admin (status={r.status_code}, body={r.text[:200]})")


@pytest.fixture
def anon_client() -> requests.Session:
    """Fresh session with NO cookies/headers — used to verify auth is enforced."""
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture
def admin_client(session: requests.Session, admin_token: str) -> requests.Session:
    s = requests.Session()
    s.headers.update(
        {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {admin_token}",
        }
    )
    return s


# ============================================================
# BLOG
# ============================================================
class TestBlogPublic:
    def test_list_published(self, session):
        r = session.get(f"{API}/blog")
        assert r.status_code == 200, r.text
        assert isinstance(r.json(), list)

    def test_categories(self, session):
        r = session.get(f"{API}/blog-categories")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        if data:
            assert "category" in data[0] and "count" in data[0]


class TestBlogAdminCRUD:
    """Create -> read -> update -> publish -> public-read -> delete."""

    def _slug(self) -> str:
        return f"test-{uuid.uuid4().hex[:10]}"

    def test_admin_blog_requires_auth(self, anon_client):
        r = anon_client.get(f"{API}/admin/blog")
        # FastAPI HTTPBearer returns 403 by default when header missing, 401 when invalid
        assert r.status_code in (401, 403), r.text

    def test_admin_blog_full_cycle(self, admin_client):
        slug = self._slug()
        payload = {
            "title": "TEST Refactor Post",
            "slug": slug,
            "excerpt": "TEST excerpt",
            "content": "TEST content body",
            "category": "test",
            "tags": ["TEST"],
        }
        # CREATE
        r = admin_client.post(f"{API}/admin/blog", json=payload)
        assert r.status_code == 200, r.text
        created = r.json()
        post_id = created["id"]
        assert created["slug"] == slug
        assert created["author_id"]
        assert created["status"] == "draft"

        # LIST contains it
        r = admin_client.get(f"{API}/admin/blog")
        assert r.status_code == 200
        assert any(p["id"] == post_id for p in r.json())

        # PATCH -> publish
        r = admin_client.patch(
            f"{API}/admin/blog/{post_id}", json={"status": "published"}
        )
        assert r.status_code == 200, r.text
        updated = r.json()
        assert updated["status"] == "published"
        assert updated.get("published_at"), "published_at must be set on first publish"

        # Public GET by slug + view_count increments
        r1 = requests.get(f"{API}/blog/{slug}")
        assert r1.status_code == 200, r1.text
        v1 = r1.json().get("view_count", 0)
        r2 = requests.get(f"{API}/blog/{slug}")
        assert r2.status_code == 200
        v2 = r2.json().get("view_count", 0)
        assert v2 >= v1, "view_count should not decrease"

        # DELETE (require_admin)
        r = admin_client.delete(f"{API}/admin/blog/{post_id}")
        assert r.status_code == 200, r.text

        # Confirm gone (public)
        r = requests.get(f"{API}/blog/{slug}")
        assert r.status_code == 404


# ============================================================
# POLICIES
# ============================================================
class TestPolicies:
    def test_public_policies(self, session):
        r = session.get(f"{API}/policies-public")
        assert r.status_code == 200
        assert isinstance(r.json(), dict)

    def test_admin_policies_requires_auth(self, anon_client):
        r = anon_client.get(f"{API}/admin/policies")
        assert r.status_code in (401, 403)

    def test_admin_policies_crud(self, admin_client):
        payload = {
            "policy_type": "warranty",
            "title": "TEST Warranty",
            "content": "TEST content",
            "version": "9.99",
        }
        r = admin_client.post(f"{API}/admin/policies", json=payload)
        assert r.status_code == 200, r.text
        pid = r.json()["id"]

        r = admin_client.get(f"{API}/admin/policies?policy_type=warranty")
        assert r.status_code == 200
        assert any(p["id"] == pid for p in r.json())

        r = admin_client.patch(
            f"{API}/admin/policies/{pid}", json={"title": "TEST Warranty v2"}
        )
        assert r.status_code == 200
        assert r.json()["title"] == "TEST Warranty v2"

        r = admin_client.delete(f"{API}/admin/policies/{pid}")
        assert r.status_code == 200


# ============================================================
# PRICING
# ============================================================
class TestPricing:
    def test_public_pricing_grouped(self, session):
        r = session.get(f"{API}/pricing-public")
        assert r.status_code == 200
        assert isinstance(r.json(), dict)

    def test_admin_pricing_requires_auth(self, anon_client):
        r = anon_client.get(f"{API}/admin/pricing")
        assert r.status_code in (401, 403)

    def test_admin_pricing_crud(self, admin_client):
        payload = {
            "name": "TEST Item",
            "description": "TEST desc",
            "service_type": "manual",
            "category": "test",
            "unit": "h",
            "base_price": 99.5,
        }
        r = admin_client.post(f"{API}/admin/pricing", json=payload)
        assert r.status_code == 200, r.text
        iid = r.json()["id"]
        assert r.json()["base_price"] == 99.5

        r = admin_client.patch(
            f"{API}/admin/pricing/{iid}", json={"base_price": 123.45}
        )
        assert r.status_code == 200
        assert r.json()["base_price"] == 123.45

        r = admin_client.delete(f"{API}/admin/pricing/{iid}")
        assert r.status_code == 200


# ============================================================
# DISCOUNTS
# ============================================================
class TestDiscounts:
    def test_validate_unknown_code_returns_404(self, session):
        r = session.post(
            f"{API}/validate-discount",
            params={"code": "NOPE_DOESNOTEXIST_XYZ", "subtotal": 100},
        )
        assert r.status_code == 404

    def test_admin_discount_codes_requires_auth(self, anon_client):
        r = anon_client.get(f"{API}/admin/discount-codes")
        assert r.status_code in (401, 403)

    def test_create_uppercases_code_and_validates(self, admin_client):
        code = f"test{uuid.uuid4().hex[:6]}"
        payload = {
            "code": code,
            "description": "TEST",
            "discount_type": "percentage",
            "discount_value": 10,
            "min_order_amount": 0,
        }
        r = admin_client.post(f"{API}/admin/discount-codes", json=payload)
        assert r.status_code == 200, r.text
        created = r.json()
        assert created["code"] == code.upper(), "Code must be uppercased on create"
        code_id = created["id"]

        # Public validate (uses uppercased code)
        r = requests.post(
            f"{API}/validate-discount",
            params={"code": code.upper(), "subtotal": 200, "service_type": "manual"},
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["valid"] is True
        assert data["discount_amount"] == 20.0  # 10% of 200

        # PATCH
        r = admin_client.patch(
            f"{API}/admin/discount-codes/{code_id}", json={"discount_value": 25}
        )
        assert r.status_code == 200

        # DELETE
        r = admin_client.delete(f"{API}/admin/discount-codes/{code_id}")
        assert r.status_code == 200


# ============================================================
# reCAPTCHA enforcement
# ============================================================
class TestRecaptchaEnforcement:
    """RECAPTCHA_SECRET_KEY is set in .env so enforcement is ON."""

    LEAD_BASE = {
        "full_name": "TEST Recaptcha",
        "email": "test_recaptcha@example.com",
        "phone": "514-555-0000",
        "service_type": "manual",
        "description": "TEST",
    }

    def test_lead_missing_recaptcha_returns_400(self, session):
        r = session.post(f"{API}/leads", json=self.LEAD_BASE)
        assert r.status_code == 400, r.text
        assert "reCAPTCHA requis" in r.text

    def test_lead_invalid_recaptcha_returns_400(self, session):
        payload = {**self.LEAD_BASE, "recaptcha_token": "invalid-token-xyz"}
        r = session.post(f"{API}/leads", json=payload)
        assert r.status_code == 400, r.text
        assert "Échec de la vérification reCAPTCHA" in r.text

    def test_contact_missing_recaptcha_returns_400(self, session):
        r = session.post(
            f"{API}/contact",
            json={
                "name": "TEST",
                "email": "test_contact@example.com",
                "subject": "TEST",
                "message": "TEST",
            },
        )
        assert r.status_code == 400, r.text
        assert "reCAPTCHA requis" in r.text

    def test_contact_invalid_recaptcha_returns_400(self, session):
        r = session.post(
            f"{API}/contact",
            json={
                "name": "TEST",
                "email": "test_contact@example.com",
                "subject": "TEST",
                "message": "TEST",
                "recaptcha_token": "invalid-token-xyz",
            },
        )
        assert r.status_code == 400
        assert "Échec de la vérification reCAPTCHA" in r.text


# ============================================================
# CORS
# ============================================================
class TestCORS:
    """Hit direct backend (localhost:8001) so we observe FastAPI CORS middleware
    headers without ingress rewriting them."""

    def test_allowed_origin_login_sets_cookies(self):
        r = requests.post(
            f"{LOCAL_API}/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            headers={"Origin": "https://cmgeorges.ca", "Content-Type": "application/json"},
        )
        assert r.status_code == 200, r.text
        # CORS reflected
        assert r.headers.get("access-control-allow-origin") == "https://cmgeorges.ca"
        assert r.headers.get("access-control-allow-credentials", "").lower() == "true"
        # Cookies present
        cookies = r.headers.get("set-cookie", "")
        assert "dt_access_token" in cookies, f"missing dt_access_token in {cookies[:300]}"
        assert "dt_refresh_token" in cookies, f"missing dt_refresh_token in {cookies[:300]}"
        assert "HttpOnly" in cookies, "cookies must be HttpOnly"

    def test_disallowed_origin_no_acao(self):
        r = requests.options(
            f"{LOCAL_API}/auth/login",
            headers={
                "Origin": "https://malicious.example",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type",
            },
        )
        # Browser preflight: FastAPI CORS middleware must NOT echo an ACAO header
        acao = r.headers.get("access-control-allow-origin")
        assert acao != "https://malicious.example", (
            f"Disallowed origin was echoed back as ACAO! status={r.status_code} headers={dict(r.headers)}"
        )
        # Also assert not wildcard
        assert acao != "*", "ACAO must not be wildcard with allow_credentials"

    def test_preview_subdomain_regex_match(self):
        r = requests.options(
            f"{LOCAL_API}/auth/login",
            headers={
                "Origin": "https://serviceflow-preview.preview.emergentagent.com",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type",
            },
        )
        assert (
            r.headers.get("access-control-allow-origin")
            == "https://serviceflow-preview.preview.emergentagent.com"
        )


# ============================================================
# Existing untouched routes
# ============================================================
class TestUntouchedRoutes:
    @pytest.mark.parametrize(
        "path",
        [
            "/portfolio",
            "/services",
            "/pricing",
        ],
    )
    def test_public_route(self, session, path):
        r = session.get(f"{API}{path}")
        assert r.status_code == 200, f"{path} -> {r.status_code} {r.text[:200]}"

    @pytest.mark.parametrize(
        "path",
        [
            "/admin/leads",
            "/admin/clients",
            "/admin/invoices",
            "/admin/projects",
            "/auth/me",
        ],
    )
    def test_admin_route_with_token(self, admin_client, path):
        r = admin_client.get(f"{API}{path}")
        assert r.status_code == 200, f"{path} -> {r.status_code} {r.text[:200]}"

    def test_admin_route_without_token_unauthorized(self, anon_client):
        r = anon_client.get(f"{API}/admin/leads")
        assert r.status_code in (401, 403)

    def test_ai_draft_quote_endpoint_exists(self, admin_client):
        # We don't assert content (LLM call), just that route is registered.
        r = admin_client.post(f"{API}/ai/draft-quote", json={"prompt": "hi"})
        # Allow various non-404 outcomes (200 success, 400 validation, 500 LLM error,
        # 503 LLM unavailable). 404 would mean the route was lost in the refactor.
        assert r.status_code != 404, "AI draft-quote route is missing"
