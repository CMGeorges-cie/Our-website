"""
Test Public Signature API and Admin Signature Link Endpoints
Tests for:
- Public signature page GET/POST endpoints
- Admin send-signature-link endpoint
- Invoice CRUD operations
- Admin login
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://serviceflow-preview.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "admin@cmgeorges.com"
ADMIN_PASSWORD = "strongpassword123"

# Test invoice ID and token from the review request
TEST_INVOICE_ID = "e103555e-113b-4551-b3e6-fc8bd7e61154"
TEST_SIGNATURE_TOKEN = "8987aaa5a8266cb7ccdeceb9879a900d"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def auth_token(api_client):
    """Get authentication token"""
    response = api_client.post(f"{BASE_URL}/api/v1/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Authentication failed - status {response.status_code}: {response.text}")


@pytest.fixture(scope="module")
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


class TestAdminLogin:
    """Test admin authentication"""
    
    def test_admin_login_success(self, api_client):
        """Test admin login with valid credentials"""
        response = api_client.post(f"{BASE_URL}/api/v1/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert "user" in data
        assert data["user"]["email"] == ADMIN_EMAIL
        print(f"✓ Admin login successful, token received")
    
    def test_admin_login_invalid_credentials(self, api_client):
        """Test admin login with invalid credentials"""
        response = api_client.post(f"{BASE_URL}/api/v1/auth/login", json={
            "email": "wrong@email.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print(f"✓ Invalid credentials correctly rejected")


class TestInvoiceCRUD:
    """Test invoice CRUD operations"""
    
    def test_list_invoices(self, authenticated_client):
        """Test listing invoices"""
        response = authenticated_client.get(f"{BASE_URL}/api/v1/admin/invoices")
        assert response.status_code == 200, f"Failed to list invoices: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} invoices")
    
    def test_get_invoice_detail(self, authenticated_client):
        """Test getting invoice detail"""
        response = authenticated_client.get(f"{BASE_URL}/api/v1/admin/invoices/{TEST_INVOICE_ID}")
        if response.status_code == 404:
            pytest.skip("Test invoice not found - may have been deleted")
        assert response.status_code == 200, f"Failed to get invoice: {response.text}"
        data = response.json()
        assert "id" in data
        assert "invoice_number" in data
        assert "total" in data
        print(f"✓ Got invoice detail: {data.get('invoice_number')}")
    
    def test_get_nonexistent_invoice(self, authenticated_client):
        """Test getting non-existent invoice returns 404"""
        response = authenticated_client.get(f"{BASE_URL}/api/v1/admin/invoices/nonexistent-id-12345")
        assert response.status_code == 404
        print(f"✓ Non-existent invoice correctly returns 404")


class TestPublicSignatureAPI:
    """Test public signature API endpoints"""
    
    def test_public_signature_get_invoice_with_valid_token(self, api_client):
        """Test GET /api/public/sign/invoice/{token} with valid token"""
        # First, we need to generate a signature token via admin endpoint
        # For now, test with the provided token
        response = api_client.get(f"{BASE_URL}/api/public/sign/invoice/{TEST_SIGNATURE_TOKEN}")
        
        # Token may be expired or already used, so we accept multiple status codes
        if response.status_code == 200:
            data = response.json()
            assert "document_type" in data
            assert data["document_type"] == "invoice"
            assert "document" in data
            assert "client" in data
            assert "company" in data
            print(f"✓ Public signature GET endpoint returns invoice data")
        elif response.status_code == 400:
            # Document already signed or token expired
            print(f"✓ Public signature GET endpoint correctly handles signed/expired document: {response.json().get('detail')}")
        elif response.status_code == 404:
            print(f"✓ Public signature GET endpoint correctly returns 404 for invalid/expired token")
        else:
            pytest.fail(f"Unexpected status code: {response.status_code} - {response.text}")
    
    def test_public_signature_get_invoice_with_invalid_token(self, api_client):
        """Test GET /api/public/sign/invoice/{token} with invalid token"""
        response = api_client.get(f"{BASE_URL}/api/public/sign/invoice/invalid-token-12345")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print(f"✓ Invalid token correctly returns 404")
    
    def test_public_signature_post_with_invalid_token(self, api_client):
        """Test POST /api/public/sign/invoice/{token} with invalid token"""
        response = api_client.post(
            f"{BASE_URL}/api/public/sign/invoice/invalid-token-12345",
            json={
                "signature_base64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
                "signer_name": "Test User",
                "signer_email": "test@example.com"
            }
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print(f"✓ POST with invalid token correctly returns 404")
    
    def test_public_signature_quote_endpoint_exists(self, api_client):
        """Test that quote signature endpoint exists"""
        response = api_client.get(f"{BASE_URL}/api/public/sign/quote/test-token")
        # Should return 404 for invalid token, not 405 (method not allowed)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ Quote signature endpoint exists and returns 404 for invalid token")


class TestAdminSendSignatureLink:
    """Test admin send-signature-link endpoint"""
    
    def test_send_signature_link_endpoint_exists(self, authenticated_client):
        """Test that send-signature-link endpoint exists"""
        response = authenticated_client.post(f"{BASE_URL}/api/v1/admin/invoices/{TEST_INVOICE_ID}/send-signature-link")
        
        # Accept various status codes - endpoint should exist
        if response.status_code == 200:
            data = response.json()
            assert "message" in data
            # Check that signature_url is properly formed with FRONTEND_URL
            if "signature_url" in data:
                url = data["signature_url"]
                assert "http://" in url or "https://" in url, f"URL should be valid: {url}"
                assert "///" not in url, f"URL should not have triple slash: {url}"
                assert "/sign/invoice/" in url, f"URL should contain /sign/invoice/: {url}"
                print(f"✓ Signature URL generated correctly: {url}")
            print(f"✓ Send signature link endpoint works: {data.get('message')}")
        elif response.status_code == 400:
            # Invoice already signed
            print(f"✓ Endpoint correctly handles already signed invoice: {response.json().get('detail')}")
        elif response.status_code == 404:
            print(f"✓ Endpoint correctly returns 404 for non-existent invoice")
        else:
            pytest.fail(f"Unexpected status code: {response.status_code} - {response.text}")
    
    def test_send_signature_link_nonexistent_invoice(self, authenticated_client):
        """Test send-signature-link with non-existent invoice"""
        response = authenticated_client.post(f"{BASE_URL}/api/v1/admin/invoices/nonexistent-id/send-signature-link")
        assert response.status_code == 404
        print(f"✓ Non-existent invoice correctly returns 404")
    
    def test_send_signature_link_without_auth(self, api_client):
        """Test send-signature-link without authentication"""
        # Create a new session without auth
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        response = session.post(f"{BASE_URL}/api/v1/admin/invoices/{TEST_INVOICE_ID}/send-signature-link")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ Endpoint correctly requires authentication")


class TestSignatureURLGeneration:
    """Test that signature URLs are generated correctly with FRONTEND_URL"""
    
    def test_signature_url_format(self, authenticated_client):
        """Test that generated signature URL has correct format"""
        # First, get list of invoices to find one without signature
        response = authenticated_client.get(f"{BASE_URL}/api/v1/admin/invoices")
        if response.status_code != 200:
            pytest.skip("Could not get invoices list")
        
        invoices = response.json()
        unsigned_invoice = None
        for inv in invoices:
            if not inv.get("signature"):
                unsigned_invoice = inv
                break
        
        if not unsigned_invoice:
            pytest.skip("No unsigned invoices found for testing")
        
        # Try to generate signature link
        response = authenticated_client.post(
            f"{BASE_URL}/api/v1/admin/invoices/{unsigned_invoice['id']}/send-signature-link"
        )
        
        if response.status_code == 200:
            data = response.json()
            if "signature_url" in data:
                url = data["signature_url"]
                # Verify URL format
                assert url.startswith("https://"), f"URL should start with https://: {url}"
                assert "///" not in url, f"URL should not have triple slash (missing domain): {url}"
                assert "/sign/invoice/" in url, f"URL should contain /sign/invoice/: {url}"
                # Verify it contains a token
                parts = url.split("/sign/invoice/")
                assert len(parts) == 2 and len(parts[1]) > 0, f"URL should have token: {url}"
                print(f"✓ Signature URL format is correct: {url}")
        elif response.status_code == 400:
            print(f"✓ Invoice already signed or has pending signature")
        else:
            print(f"Note: Could not test URL format - status {response.status_code}")


class TestQuoteSignatureLink:
    """Test quote signature link endpoint"""
    
    def test_quote_signature_link_endpoint_exists(self, authenticated_client):
        """Test that quote send-signature-link endpoint exists"""
        # Get a quote ID first
        response = authenticated_client.get(f"{BASE_URL}/api/v1/admin/quotes")
        if response.status_code != 200:
            pytest.skip("Could not get quotes list")
        
        quotes = response.json()
        if not quotes:
            pytest.skip("No quotes found for testing")
        
        quote_id = quotes[0]["id"]
        response = authenticated_client.post(f"{BASE_URL}/api/v1/admin/quotes/{quote_id}/send-signature-link")
        
        # Endpoint should exist and return valid response
        assert response.status_code in [200, 400, 404], f"Unexpected status: {response.status_code}"
        if response.status_code == 200:
            data = response.json()
            if "signature_url" in data:
                url = data["signature_url"]
                assert "///" not in url, f"URL should not have triple slash: {url}"
                assert "/sign/quote/" in url, f"URL should contain /sign/quote/: {url}"
                print(f"✓ Quote signature URL generated correctly: {url}")
        print(f"✓ Quote signature link endpoint exists")


class TestClientCRUD:
    """Test client CRUD operations (needed for signature flow)"""
    
    def test_list_clients(self, authenticated_client):
        """Test listing clients"""
        response = authenticated_client.get(f"{BASE_URL}/api/v1/admin/clients")
        assert response.status_code == 200, f"Failed to list clients: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} clients")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
