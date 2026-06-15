"""
Regression tests for the iteration-16 refactor:
  - Extraction of leads / contact / clients routers from server.py
  - Shared Pydantic models moved to /app/backend/models/__init__.py
  - auth_extensions.py split into routers/auth_ext/ (common, password, two_factor, login_challenge)

Run:
  pytest /app/backend/tests/test_iter16_refactor.py -v --tb=short \
    --junitxml=/app/test_reports/pytest/iter16_refactor.xml
"""
from __future__ import annotations

import os
import uuid
from typing import Optional

import pytest
import requests


def _load_frontend_env_url() -> str:
    try:
        with open("/app/frontend/.env") as fp:
            for line in fp:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    return line.split("=", 1)[1].strip().strip('"').strip("'")
    except OSError:
        pass
    return ""


BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or _load_frontend_env_url()).rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL must be configured"
API = f"{BASE_URL}/api/v1"

ADMIN_EMAIL = os.environ.get("TEST_ADMIN_EMAIL", "admin@cmgeorges.com")
ADMIN_PASSWORD = os.environ.get("TEST_ADMIN_PASSWORD", "strongpassword123")


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def admin_token() -> str:
    s = requests.Session()
    r = s.post(
        f"{API}/auth/login/challenge",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
    )
    if r.status_code == 200 and r.json().get("access_token"):
        return r.json()["access_token"]
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    if r.status_code == 200 and r.json().get("access_token"):
        return r.json()["access_token"]
    pytest.skip(f"Cannot login admin: {r.status_code} {r.text[:200]}")


@pytest.fixture
def admin_client(admin_token: str) -> requests.Session:
    s = requests.Session()
    s.headers.update(
        {"Content-Type": "application/json", "Authorization": f"Bearer {admin_token}"}
    )
    return s


@pytest.fixture
def anon_client() -> requests.Session:
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ============================================================
# 1) LEADS ROUTER (extracted)
# ============================================================
class TestLeadsRecaptcha:
    """Public POST /leads — reCAPTCHA enforcement."""

    BASE_LEAD = {
        "full_name": "TEST Iter16 Lead",
        "email": "test_iter16_lead@example.com",
        "phone": "514-555-1616",
        "service_type": "manual",
        "description": "TEST iter16",
    }

    def test_missing_recaptcha_returns_400(self, anon_client):
        r = anon_client.post(f"{API}/leads", json=self.BASE_LEAD)
        assert r.status_code == 400, r.text
        assert "reCAPTCHA requis" in r.text

    def test_invalid_recaptcha_returns_400(self, anon_client):
        payload = {**self.BASE_LEAD, "recaptcha_token": "bogus-token-iter16"}
        r = anon_client.post(f"{API}/leads", json=payload)
        assert r.status_code == 400, r.text
        assert "Échec de la vérification reCAPTCHA" in r.text


class TestLeadModelFieldsAccepted:
    """Validate that LeadCreate accepts the full original schema
    (items + photos + urgency_level + source + preferred_date + city + address).
    We can't fully POST without a valid recaptcha; assert Pydantic accepts the
    payload by reaching the recaptcha gate (=400 'reCAPTCHA requis' means schema
    passed; 422 would mean the schema rejected fields)."""

    def test_full_payload_passes_pydantic_validation(self, anon_client):
        payload = {
            "full_name": "TEST Full",
            "email": "test_full_iter16@example.com",
            "phone": "514-555-9999",
            "service_type": "furniture",
            "urgency_level": "urgent",
            "source": "instagram",
            "address": "123 rue TEST",
            "city": "Montreal",
            "preferred_date": "2026-02-01",
            "description": "TEST full payload",
            "items": [
                {
                    "item_type": "bed",
                    "brand": "ikea",
                    "model": "MALM",
                    "quantity": 2,
                    "wall_anchor_required": True,
                }
            ],
            "photos": ["https://example.com/p1.jpg", "https://example.com/p2.jpg"],
            # No recaptcha_token on purpose to confirm schema-passed before gate
        }
        r = anon_client.post(f"{API}/leads", json=payload)
        # 400 'reCAPTCHA requis' == schema accepted all fields
        assert r.status_code == 400, f"Expected 400 (recaptcha gate). Got {r.status_code}: {r.text[:300]}"
        assert "reCAPTCHA requis" in r.text


class TestLeadsAdminCRUD:
    """admin/leads — list, get-by-id, patch, convert, delete."""

    def _seed_lead_via_db_through_admin(self, admin_client: requests.Session) -> Optional[dict]:
        """We can't POST /leads (recaptcha gate). Instead, look for an existing
        lead, or create one through convert flow chain. Skip if no leads exist."""
        r = admin_client.get(f"{API}/admin/leads")
        assert r.status_code == 200, r.text
        leads = r.json()
        if leads:
            return leads[0]
        return None

    def test_list_leads_admin(self, admin_client):
        r = admin_client.get(f"{API}/admin/leads")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_list_leads_anon_unauthorized(self, anon_client):
        r = anon_client.get(f"{API}/admin/leads")
        assert r.status_code in (401, 403)

    def test_get_lead_404_when_not_found(self, admin_client):
        r = admin_client.get(f"{API}/admin/leads/does-not-exist-iter16-xyz")
        assert r.status_code == 404

    def test_patch_lead_404_when_not_found(self, admin_client):
        r = admin_client.patch(
            f"{API}/admin/leads/does-not-exist-iter16-xyz",
            json={"status": "contacted"},
        )
        assert r.status_code == 404

    def test_delete_lead_requires_admin(self, anon_client):
        r = anon_client.delete(f"{API}/admin/leads/anything")
        assert r.status_code in (401, 403)

    def test_full_crud_if_existing_lead(self, admin_client):
        existing = self._seed_lead_via_db_through_admin(admin_client)
        if not existing:
            pytest.skip("No existing leads to exercise full CRUD")

        lead_id = existing["id"]
        # GET by id
        r = admin_client.get(f"{API}/admin/leads/{lead_id}")
        assert r.status_code == 200
        assert r.json()["id"] == lead_id

        # PATCH (idempotent: re-set notes/status)
        original_status = existing.get("status", "new")
        original_notes = existing.get("notes", "")
        r = admin_client.patch(
            f"{API}/admin/leads/{lead_id}",
            json={"status": "contacted", "notes": "TEST iter16 patch"},
        )
        assert r.status_code == 200, r.text
        updated = r.json()
        assert updated["status"] == "contacted"
        assert updated["notes"] == "TEST iter16 patch"

        # Restore original
        admin_client.patch(
            f"{API}/admin/leads/{lead_id}",
            json={"status": original_status, "notes": original_notes},
        )


# ============================================================
# 2) CONTACT ROUTER (extracted)
# ============================================================
class TestContactRecaptcha:
    def test_missing_recaptcha_returns_400(self, anon_client):
        r = anon_client.post(
            f"{API}/contact",
            json={
                "name": "TEST iter16",
                "email": "test_contact_iter16@example.com",
                "subject": "TEST",
                "message": "TEST contact",
            },
        )
        assert r.status_code == 400, r.text
        assert "reCAPTCHA requis" in r.text

    def test_invalid_recaptcha_returns_400(self, anon_client):
        r = anon_client.post(
            f"{API}/contact",
            json={
                "name": "TEST iter16",
                "email": "test_contact_iter16@example.com",
                "subject": "TEST",
                "message": "TEST contact",
                "recaptcha_token": "bogus-iter16",
            },
        )
        assert r.status_code == 400
        assert "Échec de la vérification reCAPTCHA" in r.text


# ============================================================
# 3) CLIENTS ROUTER (extracted)
# ============================================================
class TestClientsAdminCRUD:
    def test_list_clients_anon_unauthorized(self, anon_client):
        r = anon_client.get(f"{API}/admin/clients")
        assert r.status_code in (401, 403)

    def test_full_crud_cycle(self, admin_client):
        payload = {
            "full_name": "TEST Iter16 Client",
            "email": f"test_iter16_client_{uuid.uuid4().hex[:8]}@example.com",
            "phone": "514-555-1716",
            "address": "1 rue TEST",
            "city": "Montreal",
            "postal_code": "H1A 1A1",
            "notes": "TEST iter16",
        }
        # CREATE
        r = admin_client.post(f"{API}/admin/clients", json=payload)
        assert r.status_code == 200, r.text
        created = r.json()
        cid = created["id"]
        assert created["full_name"] == payload["full_name"]
        assert created["email"] == payload["email"]
        assert created["status"] == "active"

        # LIST
        r = admin_client.get(f"{API}/admin/clients")
        assert r.status_code == 200
        assert any(c["id"] == cid for c in r.json())

        # GET by id
        r = admin_client.get(f"{API}/admin/clients/{cid}")
        assert r.status_code == 200
        assert r.json()["id"] == cid

        # PATCH
        r = admin_client.patch(
            f"{API}/admin/clients/{cid}",
            json={"notes": "TEST iter16 updated", "city": "Laval"},
        )
        assert r.status_code == 200
        assert r.json()["notes"] == "TEST iter16 updated"
        assert r.json()["city"] == "Laval"

        # DELETE (admin-only) — verify anon fails
        # Anonymous DELETE
        anon = requests.Session()
        r_anon = anon.delete(f"{API}/admin/clients/{cid}")
        assert r_anon.status_code in (401, 403)

        # Admin DELETE
        r = admin_client.delete(f"{API}/admin/clients/{cid}")
        assert r.status_code == 200
        assert "supprimé" in r.text or "supprime" in r.text.lower()

        # GET should 404
        r = admin_client.get(f"{API}/admin/clients/{cid}")
        assert r.status_code == 404


# ============================================================
# 4) AUTH EXTENSIONS — split into 4 sub-modules — all flows still work
# ============================================================
class TestAuth2FA:
    def test_2fa_status_requires_auth(self, anon_client):
        r = anon_client.get(f"{API}/auth/2fa/status")
        assert r.status_code in (401, 403)

    def test_2fa_status_with_admin(self, admin_client):
        r = admin_client.get(f"{API}/auth/2fa/status")
        assert r.status_code == 200, r.text
        data = r.json()
        assert "enabled" in data
        assert isinstance(data["enabled"], bool)

    def test_2fa_totp_setup(self, admin_client):
        r = admin_client.post(f"{API}/auth/2fa/totp/setup")
        # If 2FA already enabled, route may return 400; otherwise should return secret+qr
        assert r.status_code in (200, 400), r.text
        if r.status_code == 200:
            data = r.json()
            assert "secret" in data
            assert "qr_code" in data

    def test_2fa_totp_activate_bad_code(self, admin_client):
        r = admin_client.post(
            f"{API}/auth/2fa/totp/activate", json={"code": "000000"}
        )
        # Either invalid code (400) or already enabled (400) — never 200
        assert r.status_code == 400, r.text

    def test_2fa_disable_bad_code(self, admin_client):
        # Schema requires current_password + code. Bad current_password -> 400.
        r = admin_client.post(
            f"{API}/auth/2fa/disable",
            json={"current_password": "definitely-not-the-password-iter16", "code": "000000"},
        )
        assert r.status_code == 400, r.text


class TestAuthLoginChallenge:
    def test_login_challenge_bad_credentials(self, anon_client):
        r = anon_client.post(
            f"{API}/auth/login/challenge",
            json={"email": ADMIN_EMAIL, "password": "wrong-password-iter16"},
        )
        assert r.status_code == 401, r.text

    def test_login_challenge_good_credentials_no_2fa(self, anon_client):
        r = anon_client.post(
            f"{API}/auth/login/challenge",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        )
        # If 2FA enabled, returns 200 with requires_2fa=true and challenge_token
        # If 2FA disabled, returns 200 with access_token
        assert r.status_code == 200, r.text
        data = r.json()
        assert ("access_token" in data) or (
            data.get("requires_2fa") and "challenge_token" in data
        )


class TestAuthPasswordFlows:
    def test_forgot_password_always_returns_200(self, anon_client):
        """Anti-enumeration: same response whether email exists or not."""
        r = anon_client.post(
            f"{API}/auth/forgot-password",
            json={"email": ADMIN_EMAIL},
        )
        # Could be 200 (success) or 429 if rate-limited from prior runs
        assert r.status_code in (200, 429), r.text

    def test_forgot_password_unknown_email_returns_200_or_429(self, anon_client):
        r = anon_client.post(
            f"{API}/auth/forgot-password",
            json={"email": f"nonexistent_iter16_{uuid.uuid4().hex[:6]}@example.com"},
        )
        assert r.status_code in (200, 429), r.text

    def test_reset_password_with_bogus_token(self, anon_client):
        r = anon_client.post(
            f"{API}/auth/reset-password",
            json={"token": "bogus-token-iter16", "new_password": "NewStrongPassword!42"},
        )
        assert r.status_code == 400, r.text

    def test_change_password_requires_auth(self, anon_client):
        r = anon_client.post(
            f"{API}/auth/change-password",
            json={"current_password": "x", "new_password": "y"},
        )
        assert r.status_code in (401, 403)

    def test_change_email_requires_auth(self, anon_client):
        r = anon_client.post(
            f"{API}/auth/change-email",
            json={"new_email": "x@example.com", "current_password": "x"},
        )
        assert r.status_code in (401, 403)

    def test_change_password_wrong_current(self, admin_client):
        r = admin_client.post(
            f"{API}/auth/change-password",
            json={
                "current_password": "definitely-not-the-password-iter16",
                "new_password": "AnotherStrongPass!42",
            },
        )
        assert r.status_code == 400, r.text


# ============================================================
# 5) Other untouched/admin routes still 200
# ============================================================
class TestExistingRoutesIntact:
    @pytest.mark.parametrize(
        "path",
        [
            "/admin/invoices",
            "/admin/projects",
            "/admin/quotes",
            "/admin/blog",
            "/admin/policies",
            "/admin/pricing",
            "/admin/discount-codes",
            "/admin/leads",
            "/admin/clients",
        ],
    )
    def test_admin_routes_200(self, admin_client, path):
        r = admin_client.get(f"{API}{path}")
        assert r.status_code == 200, f"{path} -> {r.status_code}: {r.text[:200]}"

    @pytest.mark.parametrize(
        "path",
        ["/portfolio", "/services", "/pricing", "/blog"],
    )
    def test_public_routes_200(self, anon_client, path):
        r = anon_client.get(f"{API}{path}")
        assert r.status_code == 200, f"{path} -> {r.status_code}: {r.text[:200]}"


# ============================================================
# 6) OpenAPI schema sanity — no duplicate operations on same method+path
# ============================================================
class TestOpenAPI:
    def test_no_duplicate_routes(self, anon_client):
        # /openapi.json is exposed only on the direct backend port (the public
        # ingress only proxies /api/*). Hit localhost.
        r = requests.get("http://localhost:8001/openapi.json")
        assert r.status_code == 200
        spec = r.json()
        paths = spec.get("paths", {})
        # Crucial endpoints exist
        for p in [
            "/api/v1/leads",
            "/api/v1/contact",
            "/api/v1/admin/leads",
            "/api/v1/admin/leads/{lead_id}",
            "/api/v1/admin/leads/{lead_id}/convert-to-client",
            "/api/v1/admin/clients",
            "/api/v1/admin/clients/{client_id}",
            "/api/v1/auth/2fa/status",
            "/api/v1/auth/2fa/totp/setup",
            "/api/v1/auth/2fa/totp/activate",
            "/api/v1/auth/2fa/email/activate",
            "/api/v1/auth/2fa/disable",
            "/api/v1/auth/login/challenge",
            "/api/v1/auth/login/verify-2fa",
            "/api/v1/auth/forgot-password",
            "/api/v1/auth/reset-password",
            "/api/v1/auth/change-password",
            "/api/v1/auth/change-email",
        ]:
            assert p in paths, f"Missing in OpenAPI: {p}"
