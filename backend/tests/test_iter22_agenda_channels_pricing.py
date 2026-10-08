"""Iter 22 — agenda, test-data mark-real, catalog show_from_price, contact channels, new service pages."""
import os
import uuid
from datetime import datetime, timedelta, timezone

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://serviceflow-preview.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
V1 = f"{API}/v1"
V2 = f"{API}/v2"

ADMIN_EMAIL = "admin@cmgeorges.com"
ADMIN_PASSWORD = "strongpassword123"


def _read_cron_secret() -> str:
    try:
        for line in open("/app/backend/.env"):
            if line.startswith("WEBHOOK_CRON_SECRET="):
                return line.split("=", 1)[1].strip().strip('"')
    except Exception:
        pass
    return ""


CRON_SECRET = _read_cron_secret()


# ---- fixtures ----
@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{V1}/auth/login/challenge", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    tok = data.get("access_token") or data.get("token")
    if not tok and data.get("challenge_token"):
        pytest.skip("2FA enabled — skipping")
    assert tok
    return tok


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def client_token():
    email = f"TEST_iter22_{uuid.uuid4().hex[:8]}@example.com"
    r = requests.post(
        f"{V1}/client/register",
        json={"email": email, "password": "ClientPass123!", "full_name": "TEST_iter22 Client", "phone": "5141234567"},
        timeout=15,
    )
    if r.status_code not in (200, 201):
        pytest.skip(f"client register failed {r.status_code}")
    tok = r.json().get("access_token") or r.json().get("token")
    return tok


# ---- catalog show_from_price ----
class TestCatalogShowFromPrice:
    def test_patch_show_from_price_persists(self, admin_headers):
        # pick a QUOTE pricing_type service from public catalog
        r = requests.get(f"{V2}/catalog/public", timeout=15)
        assert r.status_code == 200
        services = r.json()
        quote_svc = next((s for s in services if s.get("pricing_type") == "quote"), None)
        if not quote_svc:
            pytest.skip("no quote-pricing service to toggle")
        sid = quote_svc["id"]
        original = bool(quote_svc.get("show_from_price", False))

        # Toggle via PATCH
        r = requests.patch(f"{V2}/catalog/{sid}", json={"show_from_price": not original}, headers=admin_headers, timeout=15)
        assert r.status_code == 200, r.text
        assert r.json().get("show_from_price") == (not original)

        # Restore
        r = requests.patch(f"{V2}/catalog/{sid}", json={"show_from_price": original}, headers=admin_headers, timeout=15)
        assert r.status_code == 200
        assert r.json().get("show_from_price") == original


# ---- test-data mark-real + purge ----
class TestTestDataMarkReal:
    def _create_test_client(self, admin_headers) -> str:
        name = f"TEST_iter22_{uuid.uuid4().hex[:6]}"
        r = requests.post(
            f"{V1}/admin/clients",
            json={"full_name": name, "email": f"{name}@example.com", "phone": "5141234567", "address": "123 TEST"},
            headers=admin_headers,
            timeout=15,
        )
        assert r.status_code in (200, 201), r.text
        return r.json()["id"]

    def test_preview_lists_name_only_candidates_without_activity(self, admin_headers):
        cid = self._create_test_client(admin_headers)
        r = requests.get(f"{V1}/admin/test-data", headers=admin_headers, timeout=20)
        assert r.status_code == 200
        groups = {g["collection"]: g["items"] for g in r.json()}
        assert any(it["id"] == cid for it in groups.get("clients", [])), "new TEST_ client should appear"

        # Mark real -> should disappear
        r = requests.post(f"{V1}/admin/test-data/mark-real", json={"collection": "clients", "id": cid}, headers=admin_headers, timeout=15)
        assert r.status_code == 200

        r = requests.get(f"{V1}/admin/test-data", headers=admin_headers, timeout=20)
        groups = {g["collection"]: g["items"] for g in r.json()}
        assert not any(it["id"] == cid for it in groups.get("clients", [])), "marked-real client must disappear"

        # cleanup — directly delete
        requests.delete(f"{V1}/admin/clients/{cid}", headers=admin_headers, timeout=15)

    def test_mark_real_errors(self, admin_headers):
        r = requests.post(f"{V1}/admin/test-data/mark-real", json={"collection": "unknown_coll", "id": "x"}, headers=admin_headers, timeout=10)
        assert r.status_code == 400
        r = requests.post(f"{V1}/admin/test-data/mark-real", json={"collection": "clients", "id": "nonexistent-xyz"}, headers=admin_headers, timeout=10)
        assert r.status_code == 404

    def test_purge_requires_ids_and_scopes(self, admin_headers):
        cid = self._create_test_client(admin_headers)
        # empty ids -> deletes 0
        r = requests.post(f"{V1}/admin/test-data/purge", json={"ids": {}}, headers=admin_headers, timeout=15)
        assert r.status_code == 200
        assert r.json().get("total", 0) == 0

        # Purge with id -> deletes
        r = requests.post(f"{V1}/admin/test-data/purge", json={"ids": {"clients": [cid]}}, headers=admin_headers, timeout=15)
        assert r.status_code == 200
        assert r.json().get("deleted", {}).get("clients", 0) == 1


# ---- contact channels ----
class TestContactChannels:
    def test_patch_and_get_channels(self, admin_headers):
        name = f"TEST_iter22_{uuid.uuid4().hex[:6]}"
        r = requests.post(
            f"{V1}/admin/clients",
            json={"full_name": name, "email": f"{name}@example.com", "phone": "5141234567"},
            headers=admin_headers,
            timeout=15,
        )
        assert r.status_code in (200, 201)
        cid = r.json()["id"]

        payload = {
            "contact_channels": {
                "whatsapp": "15141234567",
                "instagram": "deco_touche",
                "snapchat": "snap_handle",
                "tiktok": "tiktok_handle",
                "signal": "+15141234567",
                "messenger": "msn_handle",
            },
            "preferred_channel": "whatsapp",
            "source": "Instagram ad",
        }
        r = requests.patch(f"{V1}/admin/clients/{cid}", json=payload, headers=admin_headers, timeout=15)
        assert r.status_code == 200, r.text

        r = requests.get(f"{V1}/admin/clients/{cid}", headers=admin_headers, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d.get("preferred_channel") == "whatsapp"
        assert d.get("source") == "Instagram ad"
        assert d.get("contact_channels", {}).get("instagram") == "deco_touche"
        assert d.get("contact_channels", {}).get("whatsapp") == "15141234567"

        # cleanup
        requests.delete(f"{V1}/admin/clients/{cid}", headers=admin_headers, timeout=15)


# ---- agenda actions ----
class TestAgenda:
    created_ids: list = []

    def test_create_requires_target(self, admin_headers):
        r = requests.post(
            f"{V1}/admin/actions",
            json={"title": "TEST_action", "due_at": datetime.now(timezone.utc).isoformat(), "kind": "call"},
            headers=admin_headers,
            timeout=10,
        )
        assert r.status_code == 400

    def test_full_action_crud(self, admin_headers):
        # Need a client to link to
        name = f"TEST_iter22_{uuid.uuid4().hex[:6]}"
        r = requests.post(f"{V1}/admin/clients", json={"full_name": name, "email": f"{name}@example.com", "phone": "5141234567"}, headers=admin_headers, timeout=15)
        cid = r.json()["id"]
        self.__class__.created_ids.append(("client", cid))

        due = (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()
        r = requests.post(
            f"{V1}/admin/actions",
            json={"title": "TEST_followup", "due_at": due, "kind": "call", "client_id": cid, "notes": "notes"},
            headers=admin_headers,
            timeout=15,
        )
        assert r.status_code == 200, r.text
        action = r.json()
        aid = action["id"]
        assert action["kind"] == "call"
        assert action["done"] is False
        assert action.get("contact_name") == name

        # List open actions
        r = requests.get(f"{V1}/admin/actions?open_only=true&client_id={cid}", headers=admin_headers, timeout=10)
        assert r.status_code == 200
        assert any(a["id"] == aid for a in r.json())

        # Patch: mark done
        r = requests.patch(f"{V1}/admin/actions/{aid}", json={"done": True}, headers=admin_headers, timeout=10)
        assert r.status_code == 200
        upd = r.json()
        assert upd["done"] is True
        assert upd.get("done_at")

        # Patch: change due_at — must reset reminded
        new_due = (datetime.now(timezone.utc) + timedelta(hours=5)).isoformat()
        r = requests.patch(f"{V1}/admin/actions/{aid}", json={"due_at": new_due, "done": False}, headers=admin_headers, timeout=10)
        assert r.status_code == 200
        assert r.json().get("reminded") is False

        # Agenda range
        start = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
        end = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        r = requests.get(f"{V1}/admin/agenda", params={"start": start, "end": end}, headers=admin_headers, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "projects" in d and "actions" in d
        assert any(a["id"] == aid for a in d["actions"])

        # Delete
        r = requests.delete(f"{V1}/admin/actions/{aid}", headers=admin_headers, timeout=10)
        assert r.status_code == 200

        # Delete 404
        r = requests.delete(f"{V1}/admin/actions/{aid}", headers=admin_headers, timeout=10)
        assert r.status_code == 404

        # cleanup client
        requests.delete(f"{V1}/admin/clients/{cid}", headers=admin_headers, timeout=10)

    def test_client_token_forbidden(self, client_token):
        if not client_token:
            pytest.skip()
        h = {"Authorization": f"Bearer {client_token}"}
        for url in [f"{V1}/admin/actions", f"{V1}/admin/agenda?start=2026-01-01&end=2026-02-01"]:
            r = requests.get(url, headers=h, timeout=10)
            assert r.status_code == 403, f"{url} returned {r.status_code}"


# ---- cron ----
class TestCron:
    def test_cron_requires_bearer(self):
        r = requests.post(f"{V1}/cron/agenda-reminders", json={}, timeout=10)
        assert r.status_code == 401

    def test_cron_accepted_and_duplicate(self):
        if not CRON_SECRET:
            pytest.skip("No CRON secret")
        run_id = f"TEST_run_{uuid.uuid4().hex[:8]}"
        h = {"Authorization": f"Bearer {CRON_SECRET}", "X-Webhook-Id": run_id, "Content-Type": "application/json"}
        r = requests.post(f"{V1}/cron/agenda-reminders", json={}, headers=h, timeout=15)
        assert r.status_code == 200
        assert r.json().get("status") == "accepted"
        # second time same run_id -> duplicate
        r = requests.post(f"{V1}/cron/agenda-reminders", json={}, headers=h, timeout=15)
        assert r.status_code == 200
        assert r.json().get("status") == "duplicate"


# ---- new service landing pages ----
class TestNewServicePages:
    def test_frontend_pages_load(self):
        for path in ["/services/climatiseurs", "/services/tv-tech"]:
            r = requests.get(f"{BASE_URL}{path}", timeout=15)
            assert r.status_code == 200, f"{path} -> {r.status_code}"
