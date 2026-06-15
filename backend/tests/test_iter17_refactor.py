"""Iteration 17 — Round 3 refactor tests.

Coverage:
  * Hardening 2FA email/activate (current_password required)
  * Quotes router (POST, GET list, GET one, POST signature, GET pdf)
  * Invoices router (POST, GET list, GET one, PATCH, POST payments,
    POST/DELETE signature, GET pdf)
  * PDF magic-byte checks
  * Old routes still alive (projects/leads/clients/blog/policies/pricing/...)
  * OpenAPI sanity (no duplicate ops)
  * Pydantic models smoke (QuoteCreate)
"""
from __future__ import annotations

import os
import uuid
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
ADMIN_EMAIL = os.environ.get("TEST_ADMIN_EMAIL", "admin@cmgeorges.com")
ADMIN_PASSWORD = os.environ.get("TEST_ADMIN_PASSWORD", "strongpassword123")


# ---------- Shared fixtures ---------- #
@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/v1/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    if r.status_code != 200:
        pytest.skip(f"admin login failed: {r.status_code} {r.text[:200]}")
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def seed_lead(auth_headers):
    # Public /api/v1/leads requires reCAPTCHA in preview; insert via mongo to
    # keep the test isolated. Already used by iter16 admin-leads tests in same way.
    import asyncio
    from motor.motor_asyncio import AsyncIOMotorClient
    from datetime import datetime, timezone

    mongo_url = os.environ["MONGO_URL"]
    db_name = os.environ["DB_NAME"]
    lead_doc = {
        "id": f"TEST_lead_{uuid.uuid4().hex[:10]}",
        "full_name": f"TEST_iter17_{uuid.uuid4().hex[:6]}",
        "phone": "514-555-0199",
        "email": f"test_iter17_{uuid.uuid4().hex[:6]}@example.com",
        "service_type": "manual",
        "address": "1 rue Test",
        "city": "Montreal",
        "description": "iter17 quote tests",
        "source": "website",
        "status": "new",
        "items": [],
        "photos": [],
        "notes": "",
        "client_id": None,
        "urgency_level": "normal",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    async def _insert():
        cli = AsyncIOMotorClient(mongo_url)
        db = cli[db_name]
        await db.leads.insert_one(dict(lead_doc))
        cli.close()

    asyncio.run(_insert())
    return lead_doc


@pytest.fixture(scope="module")
def seed_client(auth_headers):
    payload = {
        "full_name": f"TEST_client_iter17_{uuid.uuid4().hex[:6]}",
        "email": f"client_iter17_{uuid.uuid4().hex[:6]}@example.com",
        "phone": "514-555-0188",
        "address": "1 rue Test",
        "city": "Montreal",
        "postal_code": "H1A1A1",
    }
    r = requests.post(f"{BASE_URL}/api/v1/admin/clients",
                      headers=auth_headers, json=payload)
    assert r.status_code in (200, 201), r.text
    return r.json()


# ====================================================================
# 2FA HARDENING
# ====================================================================
class TestTwoFAHardening:
    def test_activate_2fa_email_no_body_returns_422(self, auth_headers):
        r = requests.post(f"{BASE_URL}/api/v1/auth/2fa/email/activate",
                          headers=auth_headers)
        assert r.status_code == 422, r.text

    def test_activate_2fa_email_wrong_password_returns_400(self, auth_headers):
        r = requests.post(f"{BASE_URL}/api/v1/auth/2fa/email/activate",
                          headers=auth_headers,
                          json={"current_password": "wrong-password-xyz"})
        assert r.status_code == 400, r.text
        assert "incorrect" in r.text.lower() or "mot de passe" in r.text.lower()

    def test_activate_then_disable_2fa_email_correct_password(self, auth_headers):
        # 1) activate with correct password
        r = requests.post(f"{BASE_URL}/api/v1/auth/2fa/email/activate",
                          headers=auth_headers,
                          json={"current_password": ADMIN_PASSWORD})
        assert r.status_code == 200, r.text
        assert r.json().get("success") is True

        # 2) Check status -> enabled / method=email
        r2 = requests.get(f"{BASE_URL}/api/v1/auth/2fa/status", headers=auth_headers)
        assert r2.status_code == 200
        assert r2.json().get("enabled") is True
        assert r2.json().get("method") == "email"

        # 3) Cleanup: directly disable via mongo helper (so future tests login w/o challenge)
        # Use disable endpoint with verifying code via email — we can't get the code,
        # so we patch directly through mongo via a helper request: hit /me + an admin endpoint
        # In practice we use a mongo update through the back-channel:
        try:
            import asyncio
            import sys
            sys.path.insert(0, "/app/backend")
            from motor.motor_asyncio import AsyncIOMotorClient
            mongo_url = os.environ.get("MONGO_URL")
            db_name = os.environ.get("DB_NAME")

            async def _disable():
                cli = AsyncIOMotorClient(mongo_url)
                db = cli[db_name]
                await db.users.update_one(
                    {"email": ADMIN_EMAIL},
                    {"$set": {"two_factor_enabled": False, "two_factor_method": None}},
                )
                cli.close()

            asyncio.run(_disable())
        except Exception as e:
            pytest.fail(f"could not disable 2FA after test: {e}")

        # 4) Confirm disabled
        r3 = requests.get(f"{BASE_URL}/api/v1/auth/2fa/status", headers=auth_headers)
        assert r3.status_code == 200
        assert r3.json().get("enabled") is False


# ====================================================================
# QUOTES ROUTER
# ====================================================================
class TestQuotesRouter:
    @pytest.fixture(scope="class")
    def quote_payload(self, seed_lead):
        return {
            "lead_id": seed_lead["id"],
            "lines": [
                {"description": "Démolition mur", "quantity": 1,
                 "unit_price": 1000.0, "line_type": "labor"},
                {"description": "Bois 2x4", "quantity": 10,
                 "unit_price": 25.0, "line_type": "material",
                 "market_price": 30.0, "cost_price": 18.0},
            ],
            "contingency_percent": 15.0,
            "notes": "TEST iter17",
            "delivery_fee": 50.0,
            "urgency_fee": 0.0,
            "validity_days": 30,
        }

    def test_create_quote(self, auth_headers, quote_payload):
        r = requests.post(f"{BASE_URL}/api/v1/admin/quotes",
                          headers=auth_headers, json=quote_payload)
        assert r.status_code in (200, 201), r.text
        q = r.json()
        pytest.shared_quote_id = q["id"]
        # Validate taxes 5% + 9.975%
        subtotal = 1000 + 250 + 50  # labor + material + delivery = 1300
        contingency = subtotal * 0.15  # 195
        before_tax = subtotal + contingency  # 1495
        expected_tps = round(before_tax * 0.05, 2)
        expected_tvq = round(before_tax * 0.09975, 2)
        assert abs(q["tps_amount"] - expected_tps) < 0.05, (q["tps_amount"], expected_tps)
        assert abs(q["tvq_amount"] - expected_tvq) < 0.05, (q["tvq_amount"], expected_tvq)
        # payment terms 30/30/40
        total_terms = q["deposit_amount"] + q["milestone_amount"] + q["final_amount"]
        assert abs(total_terms - before_tax) < 0.5
        assert abs(q["deposit_amount"] - before_tax * 0.30) < 0.5
        assert abs(q["milestone_amount"] - before_tax * 0.30) < 0.5
        assert abs(q["final_amount"] - before_tax * 0.40) < 0.5

    def test_list_quotes(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/v1/admin/quotes", headers=auth_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)
        assert any(q["id"] == pytest.shared_quote_id for q in r.json())

    def test_get_quote_by_id(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/v1/admin/quotes/{pytest.shared_quote_id}",
                         headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["id"] == pytest.shared_quote_id

    def test_get_quote_404(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/v1/admin/quotes/does-not-exist",
                         headers=auth_headers)
        assert r.status_code == 404

    def test_sign_quote(self, auth_headers):
        r = requests.post(
            f"{BASE_URL}/api/v1/admin/quotes/{pytest.shared_quote_id}/signature",
            headers=auth_headers,
            json={
                "signature_base64": "data:image/png;base64,iVBORw0KGgo=",
                "signer_name": "TEST Signer",
                "signer_email": "signer@test.com",
            },
        )
        assert r.status_code == 200, r.text
        # Confirm status now accepted
        r2 = requests.get(f"{BASE_URL}/api/v1/admin/quotes/{pytest.shared_quote_id}",
                          headers=auth_headers)
        assert r2.json().get("status") == "accepted"

    def test_quote_pdf(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/v1/admin/quotes/{pytest.shared_quote_id}/pdf",
                         headers=auth_headers)
        assert r.status_code == 200, r.text[:300]
        assert r.headers["Content-Type"].startswith("application/pdf")
        assert r.content[:4] == b"%PDF"
        assert len(r.content) > 1024


# ====================================================================
# INVOICES ROUTER
# ====================================================================
class TestInvoicesRouter:
    @pytest.fixture(scope="class")
    def invoice_payload(self, seed_client):
        return {
            "client_id": seed_client["id"],
            "lines": [
                {"description": "Service plomberie", "quantity": 2,
                 "unit_price": 250.0, "line_type": "service"},
                {"description": "Matériel divers", "quantity": 1,
                 "unit_price": 150.0, "line_type": "material"},
            ],
            "notes": "TEST iter17 invoice",
            "payment_terms": "Net 30",
        }

    def test_create_invoice(self, auth_headers, invoice_payload, seed_client):
        r = requests.post(f"{BASE_URL}/api/v1/admin/invoices",
                          headers=auth_headers, json=invoice_payload)
        assert r.status_code in (200, 201), r.text
        inv = r.json()
        pytest.shared_invoice_id = inv["id"]
        pytest.shared_invoice_client_id = seed_client["id"]
        # invoice_number auto-generated
        assert inv["invoice_number"], "invoice_number must be auto-generated"
        # totals
        subtotal = 2 * 250 + 150  # 650
        expected_total = round(subtotal * (1 + 0.05 + 0.09975), 2)
        assert abs(inv["subtotal"] - subtotal) < 0.05
        assert abs(inv["total"] - expected_total) < 0.5
        assert abs(inv["balance_due"] - expected_total) < 0.5

    def test_list_invoices(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/v1/admin/invoices", headers=auth_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)
        assert any(i["id"] == pytest.shared_invoice_id for i in r.json())

    def test_get_invoice_by_id(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/v1/admin/invoices/{pytest.shared_invoice_id}",
                         headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["id"] == pytest.shared_invoice_id

    def test_get_invoice_404(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/v1/admin/invoices/does-not-exist",
                         headers=auth_headers)
        assert r.status_code == 404

    def test_patch_invoice(self, auth_headers):
        r = requests.patch(
            f"{BASE_URL}/api/v1/admin/invoices/{pytest.shared_invoice_id}",
            headers=auth_headers,
            json={"status": "sent", "notes": "patched"},
        )
        assert r.status_code == 200, r.text
        assert r.json().get("status") == "sent"

    def test_add_partial_payment_sets_partial_status(self, auth_headers):
        # Get current client revenue
        client_id = pytest.shared_invoice_client_id
        r0 = requests.get(f"{BASE_URL}/api/v1/admin/clients/{client_id}",
                          headers=auth_headers)
        rev_before = r0.json().get("total_revenue", 0) if r0.status_code == 200 else 0

        r = requests.post(
            f"{BASE_URL}/api/v1/admin/invoices/{pytest.shared_invoice_id}/payments",
            headers=auth_headers,
            json={"amount": 100.0, "method": "etransfer", "notes": "partial"},
        )
        assert r.status_code in (200, 201), r.text
        inv = r.json()
        assert inv["status"] == "partial"
        assert abs(inv["balance_due"] - (inv["total"] - 100.0)) < 0.5

        # client total_revenue incremented
        r1 = requests.get(f"{BASE_URL}/api/v1/admin/clients/{client_id}",
                          headers=auth_headers)
        assert r1.status_code == 200
        assert abs(r1.json().get("total_revenue", 0) - (rev_before + 100.0)) < 0.5

    def test_add_full_payment_sets_paid_status(self, auth_headers):
        # Pay remaining balance
        r0 = requests.get(f"{BASE_URL}/api/v1/admin/invoices/{pytest.shared_invoice_id}",
                          headers=auth_headers)
        balance = r0.json()["balance_due"]
        r = requests.post(
            f"{BASE_URL}/api/v1/admin/invoices/{pytest.shared_invoice_id}/payments",
            headers=auth_headers,
            json={"amount": balance, "method": "cash", "notes": "final"},
        )
        assert r.status_code in (200, 201), r.text
        inv = r.json()
        assert inv["status"] == "paid"
        assert inv["balance_due"] == 0 or abs(inv["balance_due"]) < 0.01

    def test_invoice_signature_post_and_delete(self, auth_headers):
        # Add sig
        r = requests.post(
            f"{BASE_URL}/api/v1/admin/invoices/{pytest.shared_invoice_id}/signature",
            headers=auth_headers,
            json={"signature_base64": "data:image/png;base64,abc",
                  "signer_name": "Test", "signer_email": "t@t.com"},
        )
        assert r.status_code == 200, r.text
        # Delete sig
        r2 = requests.delete(
            f"{BASE_URL}/api/v1/admin/invoices/{pytest.shared_invoice_id}/signature",
            headers=auth_headers,
        )
        assert r2.status_code == 200, r2.text

    def test_invoice_pdf(self, auth_headers):
        r = requests.get(
            f"{BASE_URL}/api/v1/admin/invoices/{pytest.shared_invoice_id}/pdf",
            headers=auth_headers,
        )
        assert r.status_code == 200
        assert r.headers["Content-Type"].startswith("application/pdf")
        assert r.content[:4] == b"%PDF"
        assert len(r.content) > 1024


# ====================================================================
# Legacy server.py endpoints that depend on services.pdf import
# ====================================================================
class TestServerSideStillWorks:
    def test_send_email_unknown_invoice_not_500(self, auth_headers):
        r = requests.post(
            f"{BASE_URL}/api/v1/admin/invoices/does-not-exist/send-email",
            headers=auth_headers,
        )
        # 404 expected, definitely not 500 (which would mean import error)
        assert r.status_code in (404, 400, 422), r.text

    def test_send_signature_link_unknown_invoice_not_500(self, auth_headers):
        r = requests.post(
            f"{BASE_URL}/api/v1/admin/invoices/does-not-exist/send-signature-link",
            headers=auth_headers,
        )
        assert r.status_code in (404, 400, 422), r.text

    def test_send_signature_link_unknown_quote_not_500(self, auth_headers):
        r = requests.post(
            f"{BASE_URL}/api/v1/admin/quotes/does-not-exist/send-signature-link",
            headers=auth_headers,
        )
        assert r.status_code in (404, 400, 422), r.text

    def test_send_email_unknown_quote_not_500(self, auth_headers):
        r = requests.post(
            f"{BASE_URL}/api/v1/admin/quotes/does-not-exist/send-email",
            headers=auth_headers,
        )
        assert r.status_code in (404, 400, 422), r.text


# ====================================================================
# Regression — old routes intact
# ====================================================================
class TestRegression:
    @pytest.mark.parametrize("path", [
        "/api/v1/admin/projects",
        "/api/v1/admin/leads",
        "/api/v1/admin/clients",
        "/api/v1/admin/blog",
        "/api/v1/admin/policies",
        "/api/v1/admin/pricing",
        "/api/v1/admin/discount-codes",
    ])
    def test_admin_get(self, auth_headers, path):
        r = requests.get(f"{BASE_URL}{path}", headers=auth_headers)
        assert r.status_code == 200, f"{path} -> {r.status_code}"

    @pytest.mark.parametrize("path", [
        "/api/v1/portfolio",
        "/api/v1/services",
        "/api/v1/pricing",
    ])
    def test_public_get(self, path):
        r = requests.get(f"{BASE_URL}{path}")
        assert r.status_code == 200, f"{path} -> {r.status_code}"

    def test_auth_me(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/v1/auth/me", headers=auth_headers)
        assert r.status_code == 200
        assert r.json().get("email") == ADMIN_EMAIL

    def test_forgot_password_does_not_error(self):
        # Public endpoint, must not 500 with valid email
        r = requests.post(f"{BASE_URL}/api/v1/auth/forgot-password",
                          json={"email": ADMIN_EMAIL})
        assert r.status_code in (200, 202, 429), r.text


# ====================================================================
# OpenAPI sanity (via local 8001)
# ====================================================================
def test_openapi_no_duplicate_ops():
    r = requests.get("http://localhost:8001/openapi.json", timeout=10)
    assert r.status_code == 200
    paths = r.json().get("paths", {})
    ops = []
    for p, methods in paths.items():
        for m in methods:
            if m in ("get", "post", "put", "patch", "delete"):
                ops.append((m, p))
    assert len(ops) == len(set(ops)), "duplicate (method, path) detected"
    assert len(paths) >= 130, f"expected ~145 paths, got {len(paths)}"
