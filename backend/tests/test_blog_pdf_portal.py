"""
Test suite for CMGeorges Blog, PDF Generation, and Client Portal features
Tests cover:
- Blog public endpoints (listing, detail by slug, categories)
- Blog admin endpoints (CRUD operations)
- PDF generation (quotes and invoices)
- Client Portal (access creation, token validation, data retrieval)
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://tech-workflow-app.preview.emergentagent.com').rstrip('/')


class TestBlogPublicEndpoints:
    """Test public blog API endpoints"""
    
    def test_get_published_blog_posts(self):
        """Test GET /api/v1/blog - List published posts"""
        response = requests.get(f"{BASE_URL}/api/v1/blog")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        posts = response.json()
        assert isinstance(posts, list), "Response should be a list"
        
        # Verify post structure if posts exist
        if len(posts) > 0:
            post = posts[0]
            assert "id" in post
            assert "title" in post
            assert "slug" in post
            assert "content" in post
            assert "status" in post
            assert post["status"] == "published", "Public endpoint should only return published posts"
        print(f"✓ Get published blog posts: {len(posts)} posts found")
    
    def test_get_blog_post_by_slug(self):
        """Test GET /api/v1/blog/{slug} - Get single post"""
        # First get a valid slug from the list
        list_response = requests.get(f"{BASE_URL}/api/v1/blog")
        posts = list_response.json()
        
        if len(posts) == 0:
            pytest.skip("No published blog posts available")
        
        slug = posts[0]["slug"]
        response = requests.get(f"{BASE_URL}/api/v1/blog/{slug}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        post = response.json()
        assert post["slug"] == slug
        assert "title" in post
        assert "content" in post
        assert "view_count" in post
        print(f"✓ Get blog post by slug: '{slug}'")
    
    def test_get_blog_post_not_found(self):
        """Test GET /api/v1/blog/{slug} - Non-existent post"""
        response = requests.get(f"{BASE_URL}/api/v1/blog/non-existent-post-slug-12345")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Non-existent blog post returns 404")
    
    def test_get_blog_categories(self):
        """Test GET /api/v1/blog-categories - List categories"""
        response = requests.get(f"{BASE_URL}/api/v1/blog-categories")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        categories = response.json()
        assert isinstance(categories, list), "Response should be a list"
        
        # Verify category structure if categories exist
        if len(categories) > 0:
            cat = categories[0]
            assert "category" in cat
            assert "count" in cat
            assert isinstance(cat["count"], int)
        print(f"✓ Get blog categories: {len(categories)} categories found")
    
    def test_blog_filter_by_category(self):
        """Test GET /api/v1/blog?category=X - Filter posts"""
        response = requests.get(f"{BASE_URL}/api/v1/blog?category=conseils")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        posts = response.json()
        # All returned posts should be in the 'conseils' category
        for post in posts:
            assert post["category"] == "conseils", f"Post category mismatch: {post['category']}"
        print(f"✓ Blog filter by category: {len(posts)} posts in 'conseils'")


class TestBlogAdminEndpoints:
    """Test admin blog API endpoints (require authentication)"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/v1/auth/login",
            json={"email": "admin@cmgeorges.com", "password": "admin123"}
        )
        if response.status_code != 200:
            pytest.skip("Authentication failed")
        return response.json()["access_token"]
    
    def test_admin_get_all_blog_posts(self, auth_token):
        """Test GET /api/v1/admin/blog - List all posts (including drafts)"""
        response = requests.get(
            f"{BASE_URL}/api/v1/admin/blog",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        posts = response.json()
        assert isinstance(posts, list)
        print(f"✓ Admin get all blog posts: {len(posts)} posts")
    
    def test_admin_create_blog_post(self, auth_token):
        """Test POST /api/v1/admin/blog - Create new post"""
        unique_slug = f"test-post-{uuid.uuid4().hex[:8]}"
        post_data = {
            "title": "Test Blog Post",
            "slug": unique_slug,
            "excerpt": "This is a test excerpt",
            "content": "<p>Test content for blog post</p>",
            "category": "conseils",
            "tags": ["test", "automated"]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/v1/admin/blog",
            json=post_data,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        created = response.json()
        assert created["title"] == post_data["title"]
        assert created["slug"] == unique_slug
        assert created["status"] == "draft"  # Default status
        assert "id" in created
        print(f"✓ Admin create blog post: '{unique_slug}'")
        
        # Return ID for cleanup
        return created["id"]
    
    def test_admin_update_blog_post(self, auth_token):
        """Test PATCH /api/v1/admin/blog/{id} - Update post"""
        # First create a post
        unique_slug = f"test-update-{uuid.uuid4().hex[:8]}"
        create_response = requests.post(
            f"{BASE_URL}/api/v1/admin/blog",
            json={
                "title": "Post to Update",
                "slug": unique_slug,
                "content": "<p>Original content</p>",
                "category": "guides"
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert create_response.status_code == 200
        post_id = create_response.json()["id"]
        
        # Update the post
        update_data = {
            "title": "Updated Title",
            "status": "published"
        }
        response = requests.patch(
            f"{BASE_URL}/api/v1/admin/blog/{post_id}",
            json=update_data,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        updated = response.json()
        assert updated["title"] == "Updated Title"
        assert updated["status"] == "published"
        assert updated["published_at"] is not None  # Should be set when published
        print(f"✓ Admin update blog post: {post_id}")
    
    def test_admin_duplicate_slug_rejected(self, auth_token):
        """Test POST /api/v1/admin/blog - Duplicate slug rejected"""
        # Get existing post
        list_response = requests.get(
            f"{BASE_URL}/api/v1/admin/blog",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        posts = list_response.json()
        if len(posts) == 0:
            pytest.skip("No existing posts")
        
        existing_slug = posts[0]["slug"]
        
        # Try to create with same slug
        response = requests.post(
            f"{BASE_URL}/api/v1/admin/blog",
            json={
                "title": "Duplicate Test",
                "slug": existing_slug,
                "content": "<p>Duplicate</p>",
                "category": "test"
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Duplicate slug rejected")


class TestPDFGeneration:
    """Test PDF generation endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/v1/auth/login",
            json={"email": "admin@cmgeorges.com", "password": "admin123"}
        )
        if response.status_code != 200:
            pytest.skip("Authentication failed")
        return response.json()["access_token"]
    
    def test_quote_pdf_generation(self, auth_token):
        """Test GET /api/v1/admin/quotes/{id}/pdf - Generate quote PDF"""
        # Get existing quote
        quotes_response = requests.get(
            f"{BASE_URL}/api/v1/admin/quotes",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        quotes = quotes_response.json()
        
        if len(quotes) == 0:
            pytest.skip("No quotes available for PDF test")
        
        quote_id = quotes[0]["id"]
        
        # Request PDF
        response = requests.get(
            f"{BASE_URL}/api/v1/admin/quotes/{quote_id}/pdf",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert response.headers.get("content-type") == "application/pdf"
        assert "content-disposition" in response.headers
        assert ".pdf" in response.headers["content-disposition"]
        
        # Verify PDF content starts with %PDF
        assert response.content[:4] == b"%PDF", "Response should be a valid PDF"
        print(f"✓ Quote PDF generated: {quote_id}")
    
    def test_invoice_pdf_generation(self, auth_token):
        """Test GET /api/v1/admin/invoices/{id}/pdf - Generate invoice PDF"""
        # Get existing invoice
        invoices_response = requests.get(
            f"{BASE_URL}/api/v1/admin/invoices",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        invoices = invoices_response.json()
        
        if len(invoices) == 0:
            pytest.skip("No invoices available for PDF test")
        
        invoice_id = invoices[0]["id"]
        
        # Request PDF
        response = requests.get(
            f"{BASE_URL}/api/v1/admin/invoices/{invoice_id}/pdf",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert response.headers.get("content-type") == "application/pdf"
        assert "content-disposition" in response.headers
        
        # Verify PDF content
        assert response.content[:4] == b"%PDF", "Response should be a valid PDF"
        print(f"✓ Invoice PDF generated: {invoice_id}")
    
    def test_quote_pdf_not_found(self, auth_token):
        """Test GET /api/v1/admin/quotes/{id}/pdf - Non-existent quote"""
        response = requests.get(
            f"{BASE_URL}/api/v1/admin/quotes/non-existent-id-12345/pdf",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Non-existent quote PDF returns 404")
    
    def test_invoice_pdf_not_found(self, auth_token):
        """Test GET /api/v1/admin/invoices/{id}/pdf - Non-existent invoice"""
        response = requests.get(
            f"{BASE_URL}/api/v1/admin/invoices/non-existent-id-12345/pdf",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Non-existent invoice PDF returns 404")


class TestClientPortal:
    """Test Client Portal endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/v1/auth/login",
            json={"email": "admin@cmgeorges.com", "password": "admin123"}
        )
        if response.status_code != 200:
            pytest.skip("Authentication failed")
        return response.json()["access_token"]
    
    @pytest.fixture
    def test_client_with_portal(self, auth_token):
        """Create a test client and portal access"""
        # Create client
        unique_id = uuid.uuid4().hex[:8]
        client_data = {
            "full_name": f"TEST_Portal_Client_{unique_id}",
            "email": f"portal_test_{unique_id}@example.com",
            "phone": "514-555-9999",
            "address": "123 Test Ave",
            "city": "Montreal"
        }
        
        client_response = requests.post(
            f"{BASE_URL}/api/v1/admin/clients",
            json=client_data,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert client_response.status_code == 200
        client = client_response.json()
        
        # Create portal access
        portal_response = requests.post(
            f"{BASE_URL}/api/v1/admin/clients/{client['id']}/portal-access",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert portal_response.status_code == 200
        
        portal_info = portal_response.json()
        # Extract token from URL
        token = portal_info["portal_url"].split("token=")[1]
        
        return {"client": client, "portal_token": token}
    
    def test_create_portal_access(self, auth_token):
        """Test POST /api/v1/admin/clients/{id}/portal-access - Create portal access"""
        # Get existing client
        clients_response = requests.get(
            f"{BASE_URL}/api/v1/admin/clients",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        clients = clients_response.json()
        
        if len(clients) == 0:
            pytest.skip("No clients available")
        
        client_id = clients[0]["id"]
        
        # Create portal access
        response = requests.post(
            f"{BASE_URL}/api/v1/admin/clients/{client_id}/portal-access",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "portal_url" in data
        assert "token=" in data["portal_url"]
        assert "message" in data
        print(f"✓ Portal access created for client: {client_id}")
    
    def test_portal_access_by_token(self, test_client_with_portal):
        """Test GET /api/v1/portal/access?token=X - Get access info by token"""
        token = test_client_with_portal["portal_token"]
        
        response = requests.get(f"{BASE_URL}/api/v1/portal/access?token={token}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "client_id" in data
        assert data["client_id"] == test_client_with_portal["client"]["id"]
        assert "email" in data
        print(f"✓ Portal access retrieved by token")
    
    def test_portal_data_retrieval(self, test_client_with_portal):
        """Test GET /api/v1/portal/data/{client_id}?token=X - Get client portal data"""
        client_id = test_client_with_portal["client"]["id"]
        token = test_client_with_portal["portal_token"]
        
        response = requests.get(f"{BASE_URL}/api/v1/portal/data/{client_id}?token={token}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "client" in data
        assert "quotes" in data
        assert "invoices" in data
        assert "projects" in data
        
        # Verify client data
        assert data["client"]["id"] == client_id
        assert isinstance(data["quotes"], list)
        assert isinstance(data["invoices"], list)
        assert isinstance(data["projects"], list)
        print(f"✓ Portal data retrieved for client: {client_id}")
    
    def test_portal_invalid_token(self):
        """Test portal endpoints with invalid token"""
        response = requests.get(f"{BASE_URL}/api/v1/portal/access?token=invalid-token-12345")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid token returns 401")
    
    def test_portal_data_unauthorized(self):
        """Test portal data with wrong client_id/token"""
        # Try to access with non-matching client_id
        response = requests.get(
            f"{BASE_URL}/api/v1/portal/data/wrong-client-id?token=invalid-token"
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Wrong token/client returns 401")
    
    def test_create_portal_access_client_not_found(self, auth_token):
        """Test portal access creation for non-existent client"""
        response = requests.post(
            f"{BASE_URL}/api/v1/admin/clients/non-existent-client-id/portal-access",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Portal access for non-existent client returns 404")


class TestLeadSubmissionWithRecaptcha:
    """Test lead submission form (reCAPTCHA disabled)"""
    
    def test_create_lead_without_recaptcha(self):
        """Test POST /api/v1/leads - Create lead without reCAPTCHA"""
        unique_id = uuid.uuid4().hex[:8]
        lead_data = {
            "full_name": f"Test Lead {unique_id}",
            "phone": "514-555-1111",
            "email": f"test_{unique_id}@example.com",
            "service_type": "manual",
            "address": "123 Test St",
            "city": "Montreal",
            "description": "Test lead submission without reCAPTCHA",
            "urgency_level": "normal",
            "source": "website"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/v1/leads",
            json=lead_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        lead = response.json()
        assert lead["full_name"] == lead_data["full_name"]
        assert lead["email"] == lead_data["email"]
        assert lead["status"] == "new"
        assert "id" in lead
        print(f"✓ Lead created without reCAPTCHA: {lead['id']}")
    
    def test_create_furniture_lead_with_items(self):
        """Test POST /api/v1/leads - Create furniture lead with items"""
        unique_id = uuid.uuid4().hex[:8]
        lead_data = {
            "full_name": f"Furniture Lead {unique_id}",
            "phone": "514-555-2222",
            "email": f"furniture_{unique_id}@example.com",
            "service_type": "furniture",
            "address": "456 Meuble Ave",
            "city": "Laval",
            "description": "Need furniture assembly",
            "urgency_level": "urgent",
            "source": "referral",
            "items": [
                {
                    "item_type": "bed",
                    "brand": "ikea",
                    "model": "MALM",
                    "quantity": 1,
                    "wall_anchor_required": False
                },
                {
                    "item_type": "wardrobe",
                    "brand": "ikea",
                    "model": "PAX",
                    "quantity": 1,
                    "wall_anchor_required": True
                }
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/v1/leads",
            json=lead_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        lead = response.json()
        assert lead["service_type"] == "furniture"
        assert len(lead["items"]) == 2
        assert lead["items"][0]["item_type"] == "bed"
        assert lead["items"][1]["wall_anchor_required"] == True
        print(f"✓ Furniture lead created with items: {lead['id']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
