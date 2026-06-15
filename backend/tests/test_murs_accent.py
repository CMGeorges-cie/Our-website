"""Tests for the murs-accent ServiceType added in this session."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://serviceflow-preview.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = os.environ.get("TEST_ADMIN_EMAIL", "admin@cmgeorges.com")
ADMIN_PASSWORD = os.environ.get("TEST_ADMIN_PASSWORD", "strongpassword123")


@pytest.fixture(scope="module")
def admin_token():
    s = requests.Session()
    r = s.post(
        f"{BASE_URL}/api/v1/auth/login/challenge",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=15,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    # No-2FA path returns access_token
    token = data.get("access_token") or data.get("token")
    if not token:
        # Fallback to /auth/login
        r2 = s.post(
            f"{BASE_URL}/api/v1/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            timeout=15,
        )
        assert r2.status_code == 200, r2.text
        token = r2.json().get("access_token")
    assert token, f"No token in login response: {data}"
    return token


@pytest.mark.skip(
    reason="Iter15: reCAPTCHA re-enabled on POST /api/v1/leads — cannot obtain valid token in CI. "
    "The murs-accent enum acceptance is still covered by the public lead schema validation; "
    "see test_router_refactor.py for end-to-end recaptcha enforcement coverage."
)
def test_lead_create_with_murs_accent_service_type():
    """POST /api/v1/leads accepts service_type='murs-accent'."""
    unique = uuid.uuid4().hex[:8]
    payload = {
        "full_name": f"TEST Murs Accent {unique}",
        "email": f"test_murs_{unique}@example.com",
        "phone": "+15145550199",
        "service_type": "murs-accent",
        "message": "Test création lead service murs-accent",
    }
    r = requests.post(f"{BASE_URL}/api/v1/leads", json=payload, timeout=20)
    assert r.status_code == 200, f"Unexpected {r.status_code}: {r.text}"
    body = r.json()
    assert body["service_type"] == "murs-accent"
    assert body["full_name"] == payload["full_name"]
    assert body["email"] == payload["email"]
    assert "id" in body and isinstance(body["id"], str)
    pytest.created_lead_id = body["id"]
    pytest.created_lead_email = payload["email"]


@pytest.mark.skip(reason="Iter15: depends on skipped lead-create test (reCAPTCHA re-enabled).")
def test_admin_can_list_lead_with_murs_accent(admin_token):
    """GET /api/v1/admin/leads returns the lead we just created with service_type='murs-accent'."""
    assert getattr(pytest, "created_lead_id", None), "Previous test must create lead first"
    headers = {"Authorization": f"Bearer {admin_token}"}
    # Filter by service_type for efficiency
    r = requests.get(
        f"{BASE_URL}/api/v1/admin/leads",
        headers=headers,
        params={"service_type": "murs-accent"},
        timeout=15,
    )
    assert r.status_code == 200, r.text
    leads = r.json()
    assert isinstance(leads, list)
    ids = [l.get("id") for l in leads]
    assert pytest.created_lead_id in ids, (
        f"Created lead {pytest.created_lead_id} not present. Sample: {leads[:2]}"
    )
    found = next(l for l in leads if l["id"] == pytest.created_lead_id)
    assert found["service_type"] == "murs-accent"
    assert found["email"] == pytest.created_lead_email


def test_invalid_service_type_rejected():
    """POST /api/v1/leads with an unknown service_type must be rejected (422)."""
    payload = {
        "full_name": "TEST Invalid",
        "email": "test_invalid@example.com",
        "phone": "+15145550100",
        "service_type": "not-a-real-service",
        "message": "x",
    }
    r = requests.post(f"{BASE_URL}/api/v1/leads", json=payload, timeout=15)
    assert r.status_code in (400, 422), f"Expected validation error, got {r.status_code}: {r.text}"


def test_legacy_api_leads_path_does_not_exist():
    """Sanity: there is NO /api/leads — only /api/v1/leads."""
    r = requests.post(
        f"{BASE_URL}/api/leads",
        json={"full_name": "x", "email": "x@x.com", "phone": "1", "service_type": "murs-accent"},
        timeout=10,
    )
    # Expected 404 / 405 since route does not exist
    assert r.status_code in (404, 405), f"Unexpected route: {r.status_code} -> {r.text[:200]}"
