"""
CMGeorges API Backend Tests
Tests for: Authentication, Leads, Clients, Quotes, Invoices, Projects, CEO Dashboard
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
API_BASE = f"{BASE_URL}/api/v1"

# Test credentials
TEST_ADMIN_EMAIL = "admin@cmgeorges.com"
TEST_ADMIN_PASSWORD = "admin123"


class TestHealthAndSetup:
    """Health check and database seeding tests"""
    
    def test_health_endpoint(self):
        """Test API health check endpoint"""
        response = requests.get(f"{BASE_URL}/api/healthz")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data
        print("PASS: Health check endpoint working")
    
    def test_seed_database(self):
        """Test database seeding - creates admin user if not exists"""
        response = requests.post(f"{BASE_URL}/api/seed")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"PASS: Database seed - {data['message']}")


class TestAuthentication:
    """Authentication endpoint tests"""
    
    def test_login_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(f"{API_BASE}/auth/login", json={
            "email": TEST_ADMIN_EMAIL,
            "password": TEST_ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_ADMIN_EMAIL
        assert data["user"]["role"] == "admin"
        print("PASS: Admin login successful")
        return data["access_token"]
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{API_BASE}/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        print("PASS: Invalid credentials rejected correctly")
    
    def test_get_me_with_token(self):
        """Test getting current user info with valid token"""
        # First login to get token
        login_response = requests.post(f"{API_BASE}/auth/login", json={
            "email": TEST_ADMIN_EMAIL,
            "password": TEST_ADMIN_PASSWORD
        })
        token = login_response.json()["access_token"]
        
        # Get user info
        response = requests.get(
            f"{API_BASE}/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == TEST_ADMIN_EMAIL
        print("PASS: Get current user endpoint working")
    
    def test_get_me_without_token(self):
        """Test getting user info without token - should fail"""
        response = requests.get(f"{API_BASE}/auth/me")
        assert response.status_code in [401, 403]
        print("PASS: Unauthorized access properly rejected")


class TestPublicEndpoints:
    """Public API endpoint tests - no auth required"""
    
    def test_get_services(self):
        """Test getting available services"""
        response = requests.get(f"{API_BASE}/services")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 3  # manual, furniture, tech
        
        service_types = [s["service_type"] for s in data]
        assert "manual" in service_types
        assert "furniture" in service_types
        assert "tech" in service_types
        print(f"PASS: Services endpoint - found {len(data)} services")
    
    def test_get_portfolio(self):
        """Test getting portfolio items"""
        response = requests.get(f"{API_BASE}/portfolio")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Portfolio endpoint - found {len(data)} items")
    
    def test_get_pricing(self):
        """Test getting pricing information"""
        response = requests.get(f"{API_BASE}/pricing")
        assert response.status_code == 200
        
        data = response.json()
        assert "manual" in data
        assert "furniture" in data
        assert "tech" in data
        print("PASS: Pricing endpoint working")


class TestLeadsCRUD:
    """Lead CRUD operations tests"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get auth headers with admin token"""
        login_response = requests.post(f"{API_BASE}/auth/login", json={
            "email": TEST_ADMIN_EMAIL,
            "password": TEST_ADMIN_PASSWORD
        })
        if login_response.status_code != 200:
            pytest.skip("Authentication failed - skipping test")
        token = login_response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_create_lead(self):
        """Test creating a lead via public endpoint"""
        unique_id = str(uuid.uuid4())[:8]
        lead_data = {
            "full_name": f"TEST_Lead_{unique_id}",
            "phone": "514-555-0000",
            "email": f"test_{unique_id}@example.com",
            "service_type": "manual",
            "address": "123 Test Street",
            "city": "Montréal",
            "urgency_level": "normal",
            "description": "Test lead for backend testing",
            "source": "website"
        }
        
        response = requests.post(f"{API_BASE}/leads", json=lead_data)
        assert response.status_code == 200, f"Create lead failed: {response.text}"
        
        data = response.json()
        assert data["full_name"] == lead_data["full_name"]
        assert data["email"] == lead_data["email"]
        assert data["status"] == "new"
        assert "id" in data
        print(f"PASS: Lead created successfully - ID: {data['id']}")
        return data["id"]
    
    def test_create_furniture_lead_with_items(self):
        """Test creating a furniture lead with items"""
        unique_id = str(uuid.uuid4())[:8]
        lead_data = {
            "full_name": f"TEST_FurnitureLead_{unique_id}",
            "phone": "514-555-1111",
            "email": f"furniture_{unique_id}@example.com",
            "service_type": "furniture",
            "address": "456 Furniture Ave",
            "city": "Longueuil",
            "urgency_level": "urgent",
            "description": "Need furniture assembly",
            "source": "google",
            "items": [
                {"item_type": "bed", "brand": "ikea", "model": "MALM", "quantity": 2, "wall_anchor_required": False},
                {"item_type": "wardrobe", "brand": "ikea", "model": "PAX", "quantity": 1, "wall_anchor_required": True}
            ]
        }
        
        response = requests.post(f"{API_BASE}/leads", json=lead_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["service_type"] == "furniture"
        assert len(data["items"]) == 2
        print(f"PASS: Furniture lead with {len(data['items'])} items created")
    
    def test_get_leads_list(self, auth_headers):
        """Test getting leads list - requires auth"""
        response = requests.get(
            f"{API_BASE}/admin/leads",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Got {len(data)} leads from admin endpoint")
    
    def test_get_leads_with_status_filter(self, auth_headers):
        """Test filtering leads by status"""
        response = requests.get(
            f"{API_BASE}/admin/leads",
            params={"status": "new"},
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        for lead in data:
            assert lead["status"] == "new"
        print(f"PASS: Filter by status working - found {len(data)} new leads")
    
    def test_update_lead_status(self, auth_headers):
        """Test updating lead status"""
        # First get leads to find one to update
        leads_response = requests.get(
            f"{API_BASE}/admin/leads",
            headers=auth_headers
        )
        leads = leads_response.json()
        
        if not leads:
            pytest.skip("No leads found to update")
        
        lead_id = leads[0]["id"]
        
        # Update the lead
        response = requests.patch(
            f"{API_BASE}/admin/leads/{lead_id}",
            json={"status": "contacted", "notes": "Test note from automated testing"},
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == lead_id
        print(f"PASS: Lead {lead_id} updated successfully")


class TestClientsCRUD:
    """Client CRUD operations tests"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get auth headers with admin token"""
        login_response = requests.post(f"{API_BASE}/auth/login", json={
            "email": TEST_ADMIN_EMAIL,
            "password": TEST_ADMIN_PASSWORD
        })
        if login_response.status_code != 200:
            pytest.skip("Authentication failed - skipping test")
        token = login_response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_create_client(self, auth_headers):
        """Test creating a client directly"""
        unique_id = str(uuid.uuid4())[:8]
        client_data = {
            "full_name": f"TEST_Client_{unique_id}",
            "email": f"client_{unique_id}@example.com",
            "phone": "514-555-2222",
            "address": "789 Client Blvd",
            "city": "Brossard",
            "postal_code": "J4W 1A1",
            "notes": "Test client from automated testing"
        }
        
        response = requests.post(
            f"{API_BASE}/admin/clients",
            json=client_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["full_name"] == client_data["full_name"]
        assert data["email"] == client_data["email"]
        assert data["status"] == "active"
        print(f"PASS: Client created - ID: {data['id']}")
        return data["id"]
    
    def test_get_clients_list(self, auth_headers):
        """Test getting clients list"""
        response = requests.get(
            f"{API_BASE}/admin/clients",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Got {len(data)} clients")


class TestQuotes:
    """Quote generation tests"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get auth headers with admin token"""
        login_response = requests.post(f"{API_BASE}/auth/login", json={
            "email": TEST_ADMIN_EMAIL,
            "password": TEST_ADMIN_PASSWORD
        })
        if login_response.status_code != 200:
            pytest.skip("Authentication failed - skipping test")
        token = login_response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_create_quote(self, auth_headers):
        """Test creating a quote for a lead"""
        # First get a lead
        leads_response = requests.get(
            f"{API_BASE}/admin/leads",
            headers=auth_headers
        )
        leads = leads_response.json()
        
        if not leads:
            pytest.skip("No leads found to create quote")
        
        lead_id = leads[0]["id"]
        
        quote_data = {
            "lead_id": lead_id,
            "lines": [
                {"description": "Peinture salon", "quantity": 1, "unit_price": 450, "line_type": "labor"},
                {"description": "Peinture cuisine", "quantity": 1, "unit_price": 300, "line_type": "labor"}
            ],
            "contingency_percent": 15,
            "notes": "Test quote from automated testing"
        }
        
        response = requests.post(
            f"{API_BASE}/admin/quotes",
            json=quote_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["lead_id"] == lead_id
        assert len(data["lines"]) == 2
        assert data["tps_rate"] == 5.0  # Canadian TPS
        assert data["tvq_rate"] == 9.975  # Quebec TVQ
        assert data["total_with_tax"] > 0
        print(f"PASS: Quote created - Total: ${data['total_with_tax']:.2f}")
    
    def test_get_quotes_list(self, auth_headers):
        """Test getting quotes list"""
        response = requests.get(
            f"{API_BASE}/admin/quotes",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Got {len(data)} quotes")


class TestInvoices:
    """Invoice CRUD tests"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get auth headers with admin token"""
        login_response = requests.post(f"{API_BASE}/auth/login", json={
            "email": TEST_ADMIN_EMAIL,
            "password": TEST_ADMIN_PASSWORD
        })
        if login_response.status_code != 200:
            pytest.skip("Authentication failed - skipping test")
        token = login_response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_create_invoice(self, auth_headers):
        """Test creating an invoice for a client"""
        # First get or create a client
        clients_response = requests.get(
            f"{API_BASE}/admin/clients",
            headers=auth_headers
        )
        clients = clients_response.json()
        
        if not clients:
            # Create a client first
            unique_id = str(uuid.uuid4())[:8]
            client_response = requests.post(
                f"{API_BASE}/admin/clients",
                json={
                    "full_name": f"TEST_InvoiceClient_{unique_id}",
                    "email": f"invoice_client_{unique_id}@example.com",
                    "phone": "514-555-3333"
                },
                headers=auth_headers
            )
            client_id = client_response.json()["id"]
        else:
            client_id = clients[0]["id"]
        
        invoice_data = {
            "client_id": client_id,
            "lines": [
                {"description": "Service de peinture", "quantity": 1, "unit_price": 500},
                {"description": "Matériaux", "quantity": 1, "unit_price": 150}
            ],
            "notes": "Test invoice from automated testing",
            "payment_terms": "Net 30"
        }
        
        response = requests.post(
            f"{API_BASE}/admin/invoices",
            json=invoice_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["client_id"] == client_id
        assert "invoice_number" in data
        assert data["invoice_number"].startswith("CMG-")
        assert data["status"] == "draft"
        print(f"PASS: Invoice created - {data['invoice_number']}")
    
    def test_get_invoices_list(self, auth_headers):
        """Test getting invoices list"""
        response = requests.get(
            f"{API_BASE}/admin/invoices",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Got {len(data)} invoices")


class TestProjects:
    """Project CRUD tests"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get auth headers with admin token"""
        login_response = requests.post(f"{API_BASE}/auth/login", json={
            "email": TEST_ADMIN_EMAIL,
            "password": TEST_ADMIN_PASSWORD
        })
        if login_response.status_code != 200:
            pytest.skip("Authentication failed - skipping test")
        token = login_response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_create_project(self, auth_headers):
        """Test creating a project for a client"""
        # First get or create a client
        clients_response = requests.get(
            f"{API_BASE}/admin/clients",
            headers=auth_headers
        )
        clients = clients_response.json()
        
        if not clients:
            pytest.skip("No clients found to create project")
        
        client_id = clients[0]["id"]
        unique_id = str(uuid.uuid4())[:8]
        
        project_data = {
            "client_id": client_id,
            "title": f"TEST_Project_{unique_id}",
            "description": "Test project from automated testing",
            "service_type": "manual",
            "estimated_hours": 8
        }
        
        response = requests.post(
            f"{API_BASE}/admin/projects",
            json=project_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["client_id"] == client_id
        assert data["title"] == project_data["title"]
        assert data["status"] == "pending"
        print(f"PASS: Project created - {data['title']}")
    
    def test_get_projects_list(self, auth_headers):
        """Test getting projects list"""
        response = requests.get(
            f"{API_BASE}/admin/projects",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Got {len(data)} projects")


class TestDashboards:
    """Dashboard and stats tests"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get auth headers with admin token"""
        login_response = requests.post(f"{API_BASE}/auth/login", json={
            "email": TEST_ADMIN_EMAIL,
            "password": TEST_ADMIN_PASSWORD
        })
        if login_response.status_code != 200:
            pytest.skip("Authentication failed - skipping test")
        token = login_response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_admin_stats(self, auth_headers):
        """Test getting admin dashboard stats"""
        response = requests.get(
            f"{API_BASE}/admin/stats",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "total_leads" in data
        assert "new_leads" in data
        assert "total_clients" in data
        assert "total_invoices" in data
        assert "total_projects" in data
        assert "conversion_rate" in data
        print(f"PASS: Admin stats - {data['total_leads']} leads, {data['total_clients']} clients")
    
    def test_get_ceo_dashboard(self, auth_headers):
        """Test getting CEO dashboard with financial metrics"""
        response = requests.get(
            f"{API_BASE}/admin/ceo-dashboard",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "monthly_revenue" in data
        assert "monthly_costs" in data
        assert "monthly_profit" in data
        assert "average_margin_manual" in data
        assert "average_margin_tech" in data
        assert "top_services" in data
        assert "revenue_by_month" in data
        assert "pending_invoices_amount" in data
        assert "projects_in_progress" in data
        assert "conversion_rate" in data
        print(f"PASS: CEO Dashboard - Revenue: ${data['monthly_revenue']:.2f}")


class TestContactForm:
    """Contact form tests"""
    
    def test_submit_contact_form(self):
        """Test submitting a contact form"""
        unique_id = str(uuid.uuid4())[:8]
        contact_data = {
            "name": f"TEST_Contact_{unique_id}",
            "email": f"contact_{unique_id}@example.com",
            "phone": "514-555-4444",
            "subject": "Test inquiry",
            "message": "This is a test message from automated testing"
        }
        
        response = requests.post(f"{API_BASE}/contact", json=contact_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
        print("PASS: Contact form submitted successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
