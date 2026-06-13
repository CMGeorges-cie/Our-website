"""
ServiceFlow - Suite de tests complète pour validation du build
Exécuter avant chaque déploiement: pytest /app/backend/tests/test_build.py -v
"""
import pytest
import httpx
import asyncio
import os

BASE_URL = os.environ.get("TEST_URL", "http://localhost:8001")
ADMIN_EMAIL = os.environ.get("TEST_ADMIN_EMAIL", "admin@cmgeorges.com")
ADMIN_PASSWORD = os.environ.get("TEST_ADMIN_PASSWORD", "strongpassword123")
@pytest.fixture(scope="module")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="module")
def client():
    with httpx.Client(base_url=BASE_URL, timeout=10) as c:
        yield c


@pytest.fixture(scope="module")
def auth_token(client):
    """Get auth token for admin user"""
    response = client.post("/api/v1/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}"}


# ==================== AUTH TESTS ====================
class TestAuth:
    def test_login_success(self, client):
        r = client.post("/api/v1/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        data = r.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["user"]["email"] == ADMIN_EMAIL

    def test_login_invalid_password(self, client):
        r = client.post("/api/v1/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
        assert r.status_code == 401

    def test_auth_me(self, client, auth_headers):
        r = client.get("/api/v1/auth/me", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL

    def test_unauthorized_access(self, client):
        r = client.get("/api/v1/admin/leads")
        assert r.status_code in [401, 403]


# ==================== PUBLIC ENDPOINTS TESTS ====================
class TestPublicEndpoints:
    def test_get_services(self, client):
        r = client.get("/api/v1/services")
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 3
        assert any(s["id"] == "deco-touche" for s in data)

    def test_get_portfolio(self, client):
        r = client.get("/api/v1/portfolio")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_get_social_posts(self, client):
        r = client.get("/api/v1/social-posts")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_get_pricing(self, client):
        r = client.get("/api/v1/pricing")
        assert r.status_code == 200


# ==================== LEADS TESTS ====================
class TestLeads:
    def test_list_leads(self, client, auth_headers):
        r = client.get("/api/v1/admin/leads", headers=auth_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_get_lead_detail(self, client, auth_headers):
        leads = client.get("/api/v1/admin/leads", headers=auth_headers).json()
        if leads:
            r = client.get(f"/api/v1/admin/leads/{leads[0]['id']}", headers=auth_headers)
            assert r.status_code == 200

    def test_get_nonexistent_lead(self, client, auth_headers):
        r = client.get("/api/v1/admin/leads/nonexistent-id", headers=auth_headers)
        assert r.status_code == 404


# ==================== CLIENTS TESTS ====================
class TestClients:
    def test_list_clients(self, client, auth_headers):
        r = client.get("/api/v1/admin/clients", headers=auth_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_create_client(self, client, auth_headers):
        r = client.post("/api/v1/admin/clients", headers=auth_headers, json={
            "full_name": "Test Build Client",
            "email": "testbuild@test.com",
            "phone": "514-555-9999"
        })
        assert r.status_code == 200
        data = r.json()
        assert data["full_name"] == "Test Build Client"
        # Cleanup
        client.delete(f"/api/v1/admin/clients/{data['id']}", headers=auth_headers)

    def test_get_client_detail(self, client, auth_headers):
        clients = client.get("/api/v1/admin/clients", headers=auth_headers).json()
        if clients:
            r = client.get(f"/api/v1/admin/clients/{clients[0]['id']}", headers=auth_headers)
            assert r.status_code == 200


# ==================== INVOICES TESTS ====================
class TestInvoices:
    def test_list_invoices(self, client, auth_headers):
        r = client.get("/api/v1/admin/invoices", headers=auth_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_get_invoice_detail(self, client, auth_headers):
        invoices = client.get("/api/v1/admin/invoices", headers=auth_headers).json()
        if invoices:
            r = client.get(f"/api/v1/admin/invoices/{invoices[0]['id']}", headers=auth_headers)
            assert r.status_code == 200
            data = r.json()
            assert "invoice_number" in data
            assert "total" in data

    def test_invoice_pdf(self, client, auth_headers):
        invoices = client.get("/api/v1/admin/invoices", headers=auth_headers).json()
        if invoices:
            r = client.get(f"/api/v1/admin/invoices/{invoices[0]['id']}/pdf", headers=auth_headers)
            assert r.status_code == 200
            assert "application/pdf" in r.headers.get("content-type", "")

    def test_send_signature_link(self, client, auth_headers):
        invoices = client.get("/api/v1/admin/invoices", headers=auth_headers).json()
        if invoices:
            r = client.post(f"/api/v1/admin/invoices/{invoices[0]['id']}/send-signature-link", headers=auth_headers)
            assert r.status_code == 200
            data = r.json()
            assert "signature_url" in data
            assert "https://" in data["signature_url"]


# ==================== PROJECTS TESTS ====================
class TestProjects:
    def test_list_projects(self, client, auth_headers):
        r = client.get("/api/v1/admin/projects", headers=auth_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ==================== PORTFOLIO TESTS ====================
class TestPortfolio:
    def test_list_portfolio(self, client, auth_headers):
        r = client.get("/api/v1/admin/portfolio", headers=auth_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_create_and_delete_portfolio(self, client, auth_headers):
        r = client.post("/api/v1/admin/portfolio", headers=auth_headers, json={
            "title": "Test Build Portfolio",
            "image_url": "https://example.com/test.jpg",
            "service_type": "manual"
        })
        assert r.status_code == 200
        item_id = r.json()["id"]
        # Cleanup
        d = client.delete(f"/api/v1/admin/portfolio/{item_id}", headers=auth_headers)
        assert d.status_code == 200


# ==================== SOCIAL POSTS TESTS ====================
class TestSocialPosts:
    def test_list_social_posts(self, client, auth_headers):
        r = client.get("/api/v1/admin/social-posts", headers=auth_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_create_and_delete_social_post(self, client, auth_headers):
        r = client.post("/api/v1/admin/social-posts", headers=auth_headers, json={
            "title": "Test Build Social",
            "platform": "instagram",
            "post_url": "https://instagram.com/p/test",
            "thumbnail_url": "https://example.com/test.jpg"
        })
        assert r.status_code == 200
        post_id = r.json()["id"]
        # Public endpoint should show it
        public = client.get("/api/v1/social-posts")
        assert public.status_code == 200
        # Cleanup
        d = client.delete(f"/api/v1/admin/social-posts/{post_id}", headers=auth_headers)
        assert d.status_code == 200


# ==================== DEPOSIT PAYMENT TESTS ====================
class TestDepositPayment:
    def test_public_invoice_endpoint(self, client, auth_headers):
        invoices = client.get("/api/v1/admin/invoices", headers=auth_headers).json()
        if invoices:
            r = client.get(f"/api/v1/invoices/{invoices[0]['id']}/public")
            assert r.status_code == 200
            data = r.json()
            assert "invoice_number" in data
            assert "total" in data
            assert "status" in data

    def test_public_invoice_not_found(self, client):
        r = client.get("/api/v1/invoices/nonexistent/public")
        assert r.status_code == 404

    def test_create_deposit_checkout(self, client, auth_headers):
        invoices = client.get("/api/v1/admin/invoices", headers=auth_headers).json()
        if invoices:
            r = client.post(f"/api/v1/invoices/{invoices[0]['id']}/pay-deposit", json={
                "deposit_percent": 30,
                "origin_url": "https://serviceflow-preview.preview.emergentagent.com"
            })
            assert r.status_code == 200
            data = r.json()
            assert "url" in data
            assert "amount" in data
            assert data["amount"] > 0

    def test_deposit_50_percent(self, client, auth_headers):
        invoices = client.get("/api/v1/admin/invoices", headers=auth_headers).json()
        if invoices:
            r = client.post(f"/api/v1/invoices/{invoices[0]['id']}/pay-deposit", json={
                "deposit_percent": 50,
                "origin_url": "https://serviceflow-preview.preview.emergentagent.com"
            })
            assert r.status_code == 200
            data = r.json()
            # 50% should be more than 30%
            total = invoices[0].get("total", 0)
            expected = round(total * 0.50, 2)
            assert data["amount"] == expected




# ==================== CATALOG TESTS ====================
class TestCatalog:
    def test_list_catalog(self, client, auth_headers):
        r = client.get("/api/v2/catalog", headers=auth_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ==================== PUBLIC SIGNATURE TESTS ====================
class TestPublicSignature:
    def test_invalid_token_returns_404(self, client):
        r = client.get("/api/public/sign/invoice/invalid-token-xyz")
        assert r.status_code == 404

    def test_signature_link_generates_valid_token(self, client, auth_headers):
        invoices = client.get("/api/v1/admin/invoices", headers=auth_headers).json()
        if invoices:
            r = client.post(f"/api/v1/admin/invoices/{invoices[0]['id']}/send-signature-link", headers=auth_headers)
            assert r.status_code == 200
            url = r.json()["signature_url"]
            token = url.split("/")[-1]
            # Verify token works
            sig_r = client.get(f"/api/public/sign/invoice/{token}")
            assert sig_r.status_code in [200, 400]  # 400 if already signed


# ==================== STATS / DASHBOARD TESTS ====================
class TestDashboard:
    def test_get_stats(self, client, auth_headers):
        r = client.get("/api/v1/admin/stats", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert "total_leads" in data
        assert "total_clients" in data

    def test_ceo_dashboard(self, client, auth_headers):
        r = client.get("/api/v1/admin/ceo-dashboard", headers=auth_headers)
        assert r.status_code == 200


# ==================== NOTIFICATIONS TESTS ====================
class TestNotifications:
    def test_list_notifications(self, client, auth_headers):
        r = client.get("/api/v1/admin/notifications", headers=auth_headers)
        assert r.status_code == 200

    def test_unread_count(self, client, auth_headers):
        r = client.get("/api/v1/admin/notifications/unread-count", headers=auth_headers)
        assert r.status_code == 200
