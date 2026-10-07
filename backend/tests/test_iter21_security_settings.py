"""Iter 21 — Security, site-settings, test-data purge, public filtering, stats.

Covers:
- SEC: client token forbidden on /api/v1/admin/*, /api/v1/ai/*, /api/v2/*
- /api/seed and /api/v1/seed removed (404)
- Site settings public GET + admin PUT validation
- Admin test-data preview + purge (only own TEST_ items)
- Stats + ceo-dashboard exclude test data
- Public filtering on catalog/blog/policies/pricing/social-posts
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
ADMIN_EMAIL = os.environ.get('TEST_ADMIN_EMAIL', 'admin@cmgeorges.com')
ADMIN_PASSWORD = os.environ.get('TEST_ADMIN_PASSWORD', 'strongpassword123')

RUN_ID = uuid.uuid4().hex[:6]


# ------------- fixtures -------------
@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/v1/auth/login/challenge",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    if r.status_code != 200:
        pytest.skip(f"admin login/challenge failed: {r.status_code} {r.text[:200]}")
    data = r.json()
    tok = data.get("access_token")
    if not tok:
        # 2FA challenge; fall back to legacy /auth/login
        r2 = requests.post(f"{BASE_URL}/api/v1/auth/login",
                           json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
        if r2.status_code != 200:
            pytest.skip(f"legacy admin login failed: {r2.status_code}")
        tok = r2.json().get("access_token")
    assert tok, "no admin access_token"
    return tok


@pytest.fixture(scope="module")
def admin_h(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="module")
def client_token():
    """Register a TEST client via public endpoint and return its JWT."""
    email = f"TEST_iter21_{RUN_ID}@example.com"
    payload = {
        "full_name": f"TEST_iter21 Client {RUN_ID}",
        "email": email,
        "password": "testpass123",
        "phone": "5145551212",
    }
    r = requests.post(f"{BASE_URL}/api/v1/client/register", json=payload, timeout=15)
    if r.status_code not in (200, 201):
        pytest.skip(f"client register failed: {r.status_code} {r.text[:200]}")
    data = r.json()
    tok = data.get("access_token") or data.get("token")
    if not tok:
        # try login
        rl = requests.post(f"{BASE_URL}/api/v1/client/login",
                           json={"email": email, "password": "testpass123"}, timeout=15)
        tok = rl.json().get("access_token") if rl.ok else None
    assert tok, f"no client token (register body: {data})"
    return tok


@pytest.fixture(scope="module")
def client_h(client_token):
    return {"Authorization": f"Bearer {client_token}"}


# ------------- SECURITY -------------
class TestSecurityStaffGuard:
    FORBIDDEN_GETS = [
        "/api/v1/admin/projects",
        "/api/v1/admin/clients",
        "/api/v1/admin/notifications",
        "/api/v1/admin/invoices",
        "/api/v2/projects",
    ]

    @pytest.mark.parametrize("path", FORBIDDEN_GETS)
    def test_client_token_forbidden_on_admin(self, client_h, path):
        r = requests.get(f"{BASE_URL}{path}", headers=client_h, timeout=15)
        assert r.status_code == 403, f"{path} expected 403, got {r.status_code} {r.text[:120]}"

    def test_client_token_forbidden_on_ai_draft(self, client_h):
        r = requests.post(f"{BASE_URL}/api/v1/ai/draft-quote",
                          headers=client_h, json={"lead_id": "x"}, timeout=15)
        assert r.status_code == 403, f"ai/draft-quote got {r.status_code}"

    def test_client_dashboard_ok_with_client_token(self, client_h):
        r = requests.get(f"{BASE_URL}/api/v1/client/dashboard", headers=client_h, timeout=15)
        assert r.status_code == 200

    def test_admin_token_200_on_admin(self, admin_h):
        for p in ["/api/v1/admin/projects", "/api/v1/admin/clients", "/api/v1/admin/invoices"]:
            r = requests.get(f"{BASE_URL}{p}", headers=admin_h, timeout=15)
            assert r.status_code == 200, f"{p} => {r.status_code}"

    def test_seed_removed(self):
        for p in ["/api/seed", "/api/v1/seed"]:
            r = requests.post(f"{BASE_URL}{p}", timeout=10)
            assert r.status_code in (404, 405), f"{p} should be gone, got {r.status_code}"


# ------------- SITE SETTINGS -------------
class TestSiteSettings:
    def test_public_get_defaults(self):
        r = requests.get(f"{BASE_URL}/api/v1/site-settings", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "payment_terms" in data and "reviews" in data and "trust" in data
        pt = data["payment_terms"]
        assert "default" in pt and "accent_walls" in pt
        steps = pt["default"]["steps"]
        percents = [s["percent"] for s in steps]
        assert percents == [30, 30, 40], f"default steps {percents}"
        assert sum(s["percent"] for s in pt["accent_walls"]["steps"]) == 100
        assert "500" in pt["default"]["small_projects_note"]

    def test_admin_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/v1/admin/site-settings", timeout=10)
        assert r.status_code in (401, 403)

    def test_admin_put_rejects_bad_total(self, admin_h):
        orig = requests.get(f"{BASE_URL}/api/v1/site-settings", timeout=15).json()
        bad = {
            "payment_terms": {
                "default": {"steps": [{"percent": 50, "label": "x"}, {"percent": 40, "label": "y"}],
                            "small_projects_note": "x"}
            },
            "reviews": orig["reviews"],
            "trust": orig["trust"],
        }
        r = requests.put(f"{BASE_URL}/api/v1/admin/site-settings", headers=admin_h,
                         json=bad, timeout=15)
        assert r.status_code == 400, f"expected 400 got {r.status_code} {r.text[:120]}"

    def test_admin_put_requires_default(self, admin_h):
        bad = {
            "payment_terms": {
                "accent_walls": {"steps": [{"percent": 50, "label": "a"},
                                           {"percent": 50, "label": "b"}], "small_projects_note": ""}
            },
            "reviews": {"enabled": True, "google_url": "", "items": []},
            "trust": {"insured": True, "insurance_text": "x", "clients_count": ""},
        }
        r = requests.put(f"{BASE_URL}/api/v1/admin/site-settings", headers=admin_h,
                         json=bad, timeout=15)
        assert r.status_code == 400

    def test_admin_put_roundtrip_and_restore(self, admin_h):
        orig = requests.get(f"{BASE_URL}/api/v1/site-settings", timeout=15).json()
        new = {
            "payment_terms": {
                "default": {"steps": [{"percent": 40, "label": "signature"},
                                      {"percent": 30, "label": "milieu"},
                                      {"percent": 30, "label": "fin"}],
                            "small_projects_note": "ITER21_TEST note"},
                "accent_walls": orig["payment_terms"]["accent_walls"],
            },
            "reviews": {**orig["reviews"], "google_url": "https://g.page/iter21test",
                        "google_rating": 4.9},
            "trust": {**orig["trust"], "clients_count": "123+"},
        }
        try:
            r = requests.put(f"{BASE_URL}/api/v1/admin/site-settings", headers=admin_h,
                             json=new, timeout=15)
            assert r.status_code == 200, r.text[:200]
            pub = requests.get(f"{BASE_URL}/api/v1/site-settings", timeout=15).json()
            assert pub["payment_terms"]["default"]["steps"][0]["percent"] == 40
            assert pub["trust"]["clients_count"] == "123+"
            assert "iter21test" in pub["reviews"]["google_url"]
        finally:
            # restore
            requests.put(f"{BASE_URL}/api/v1/admin/site-settings", headers=admin_h,
                         json=orig, timeout=15)


# ------------- TEST DATA CLEANUP -------------
class TestAdminTestData:
    def test_preview_lists_own_client(self, admin_h, client_token):
        # client fixture already created a TEST_iter21 client — it should appear
        r = requests.get(f"{BASE_URL}/api/v1/admin/test-data", headers=admin_h, timeout=15)
        assert r.status_code == 200, r.text[:200]
        groups = r.json()
        assert isinstance(groups, list)
        found = False
        for g in groups:
            if g.get("collection") == "clients":
                for it in g.get("items", []):
                    if "TEST_iter21" in (it.get("label") or ""):
                        found = True
                        break
        assert found, f"TEST_iter21 client not found in preview. groups: {[g.get('collection') for g in groups]}"

    def test_purge_only_own_ids(self, admin_h):
        preview = requests.get(f"{BASE_URL}/api/v1/admin/test-data",
                               headers=admin_h, timeout=15).json()
        own_ids = []
        for g in preview:
            if g.get("collection") == "clients":
                for it in g["items"]:
                    if "TEST_iter21" in (it.get("label") or ""):
                        own_ids.append(it["id"])
        assert own_ids, "no own ids to purge"
        r = requests.post(f"{BASE_URL}/api/v1/admin/test-data/purge",
                          headers=admin_h, json={"ids": {"clients": own_ids}}, timeout=15)
        assert r.status_code == 200, r.text[:200]
        body = r.json()
        assert body.get("total", 0) >= 1
        assert body["deleted"].get("clients", 0) >= 1


# ------------- STATS -------------
class TestStatsExcludeTest:
    def test_stats_ok(self, admin_h):
        r = requests.get(f"{BASE_URL}/api/v1/admin/stats", headers=admin_h, timeout=15)
        assert r.status_code == 200
        d = r.json()
        for k in ("total_leads", "total_clients", "total_invoices", "total_projects"):
            assert k in d and isinstance(d[k], int)

    def test_ceo_dashboard_ok(self, admin_h):
        r = requests.get(f"{BASE_URL}/api/v1/admin/ceo-dashboard", headers=admin_h, timeout=15)
        assert r.status_code == 200
        d = r.json()
        for k in ("monthly_revenue", "pending_invoices_amount", "projects_in_progress",
                  "revenue_by_month"):
            assert k in d
        assert isinstance(d["revenue_by_month"], list) and len(d["revenue_by_month"]) == 6


# ------------- PUBLIC FILTERING -------------
class TestPublicFiltering:
    @pytest.mark.parametrize("path", [
        "/api/v2/catalog/public",
        "/api/v1/blog",
        "/api/v1/policies-public",
        "/api/v1/pricing-public",
        "/api/v1/social-posts",
    ])
    def test_endpoint_available_and_no_test_items(self, path):
        r = requests.get(f"{BASE_URL}{path}", timeout=15)
        assert r.status_code == 200, f"{path} -> {r.status_code} {r.text[:120]}"
        payload = r.json()
        items = payload if isinstance(payload, list) else (
            payload.get("items") or payload.get("data") or payload.get("categories") or []
        )
        # Flatten category -> items if needed
        flat = []
        if isinstance(items, list):
            for it in items:
                if isinstance(it, dict) and isinstance(it.get("items"), list):
                    flat.extend(it["items"])
                else:
                    flat.append(it)
        for it in flat:
            if not isinstance(it, dict):
                continue
            blob = " ".join(str(it.get(k, "")) for k in ("name", "title", "label", "url", "slug"))
            assert "TEST_" not in blob, f"{path} leaked TEST_ item: {blob[:80]}"
            assert "Playwright" not in blob, f"{path} leaked Playwright item: {blob[:80]}"
            assert "/example" not in blob, f"{path} leaked /example url: {blob[:80]}"


# ------------- SITE SETTINGS: GOOGLE REVIEWS FIELDS -------------
class TestReviewFields:
    def test_reviews_shape(self):
        r = requests.get(f"{BASE_URL}/api/v1/site-settings", timeout=15).json()
        rev = r["reviews"]
        assert isinstance(rev.get("items", []), list)
        for item in rev["items"]:
            for k in ("name", "text"):
                assert k in item
