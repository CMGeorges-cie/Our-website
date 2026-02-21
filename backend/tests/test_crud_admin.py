"""
Test file for Admin CRUD operations - Clients, Projects, Invoices
Testing features:
- Admin Clients: Create, Read, Update, Delete
- Admin Projects: Create, Read, Update (including status change), Delete
- Admin Invoices: Create with lines and tax calculation, Read, Delete
- Verification of seeded data: Discount codes (4), Pricing items (20), Policies (5)
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL')
if BASE_URL:
    BASE_URL = BASE_URL.rstrip('/')

# Admin credentials
ADMIN_EMAIL = "admin@cmgeorges.com"
ADMIN_PASSWORD = "admin123"


class TestSetup:
    """Setup test - Get auth token"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/v1/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get auth headers"""
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


class TestAdminClients(TestSetup):
    """Admin Clients CRUD operations"""
    
    created_client_id = None
    
    def test_create_client(self, auth_headers):
        """Test creating a new client"""
        client_data = {
            "full_name": "TEST_Jean Dupont CRUD",
            "email": "test.crud@example.com",
            "phone": "514-555-1234",
            "address": "123 Rue Test",
            "city": "Montréal",
            "postal_code": "H2X 1Y4",
            "company_name": "Test Inc.",
            "notes": "Client test pour CRUD"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/v1/admin/clients",
            json=client_data,
            headers=auth_headers
        )
        
        print(f"Create client response: {response.status_code}")
        assert response.status_code == 200, f"Create client failed: {response.text}"
        
        data = response.json()
        assert data["full_name"] == client_data["full_name"]
        assert data["email"] == client_data["email"]
        assert data["phone"] == client_data["phone"]
        assert "id" in data
        
        TestAdminClients.created_client_id = data["id"]
        print(f"Created client with ID: {data['id']}")
    
    def test_get_clients(self, auth_headers):
        """Test getting all clients"""
        response = requests.get(
            f"{BASE_URL}/api/v1/admin/clients",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Get clients failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} clients")
    
    def test_get_client_by_id(self, auth_headers):
        """Test getting a specific client"""
        if not TestAdminClients.created_client_id:
            pytest.skip("No client created")
        
        response = requests.get(
            f"{BASE_URL}/api/v1/admin/clients/{TestAdminClients.created_client_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Get client failed: {response.text}"
        data = response.json()
        assert data["id"] == TestAdminClients.created_client_id
    
    def test_update_client(self, auth_headers):
        """Test updating a client"""
        if not TestAdminClients.created_client_id:
            pytest.skip("No client created")
        
        update_data = {
            "notes": "Updated notes for CRUD test",
            "city": "Laval"
        }
        
        response = requests.patch(
            f"{BASE_URL}/api/v1/admin/clients/{TestAdminClients.created_client_id}",
            json=update_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Update client failed: {response.text}"
        data = response.json()
        assert data["notes"] == update_data["notes"]
        assert data["city"] == update_data["city"]
        print(f"Client updated successfully")
    
    def test_delete_client(self, auth_headers):
        """Test deleting a client"""
        if not TestAdminClients.created_client_id:
            pytest.skip("No client created")
        
        response = requests.delete(
            f"{BASE_URL}/api/v1/admin/clients/{TestAdminClients.created_client_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Delete client failed: {response.text}"
        
        # Verify deletion
        response_verify = requests.get(
            f"{BASE_URL}/api/v1/admin/clients/{TestAdminClients.created_client_id}",
            headers=auth_headers
        )
        assert response_verify.status_code == 404, "Client should be deleted"
        print(f"Client deleted successfully")


class TestAdminProjects(TestSetup):
    """Admin Projects CRUD operations"""
    
    created_project_id = None
    test_client_id = None
    
    def test_create_client_for_project(self, auth_headers):
        """Create a client for project testing"""
        client_data = {
            "full_name": "TEST_Project Client",
            "email": "test.project@example.com",
            "phone": "514-555-5678"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/v1/admin/clients",
            json=client_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        TestAdminProjects.test_client_id = response.json()["id"]
    
    def test_create_project(self, auth_headers):
        """Test creating a new project"""
        if not TestAdminProjects.test_client_id:
            pytest.skip("No test client")
        
        project_data = {
            "client_id": TestAdminProjects.test_client_id,
            "title": "TEST_Peinture Appartement",
            "description": "Peinture 4½ complet",
            "service_type": "manual",
            "estimated_hours": 16
        }
        
        response = requests.post(
            f"{BASE_URL}/api/v1/admin/projects",
            json=project_data,
            headers=auth_headers
        )
        
        print(f"Create project response: {response.status_code}")
        assert response.status_code == 200, f"Create project failed: {response.text}"
        
        data = response.json()
        assert data["title"] == project_data["title"]
        assert data["client_id"] == TestAdminProjects.test_client_id
        assert data["status"] == "pending"
        assert "id" in data
        
        TestAdminProjects.created_project_id = data["id"]
        print(f"Created project with ID: {data['id']}")
    
    def test_get_projects(self, auth_headers):
        """Test getting all projects"""
        response = requests.get(
            f"{BASE_URL}/api/v1/admin/projects",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Get projects failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} projects")
    
    def test_update_project_status(self, auth_headers):
        """Test updating project status"""
        if not TestAdminProjects.created_project_id:
            pytest.skip("No project created")
        
        # Test status change to in_progress
        update_data = {"status": "in_progress"}
        
        response = requests.patch(
            f"{BASE_URL}/api/v1/admin/projects/{TestAdminProjects.created_project_id}",
            json=update_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Update project status failed: {response.text}"
        data = response.json()
        assert data["status"] == "in_progress"
        print(f"Project status updated to: in_progress")
        
        # Test status change to completed
        update_data = {"status": "completed"}
        
        response = requests.patch(
            f"{BASE_URL}/api/v1/admin/projects/{TestAdminProjects.created_project_id}",
            json=update_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        print(f"Project status updated to: completed")
    
    def test_update_project_scheduled_date(self, auth_headers):
        """Test updating project scheduled date"""
        if not TestAdminProjects.created_project_id:
            pytest.skip("No project created")
        
        update_data = {"scheduled_date": "2026-02-15"}
        
        response = requests.patch(
            f"{BASE_URL}/api/v1/admin/projects/{TestAdminProjects.created_project_id}",
            json=update_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Update scheduled date failed: {response.text}"
        print(f"Project scheduled date updated")
    
    def test_delete_project(self, auth_headers):
        """Test deleting a project"""
        if not TestAdminProjects.created_project_id:
            pytest.skip("No project created")
        
        response = requests.delete(
            f"{BASE_URL}/api/v1/admin/projects/{TestAdminProjects.created_project_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Delete project failed: {response.text}"
        print(f"Project deleted successfully")
    
    def test_cleanup_test_client(self, auth_headers):
        """Cleanup test client"""
        if TestAdminProjects.test_client_id:
            requests.delete(
                f"{BASE_URL}/api/v1/admin/clients/{TestAdminProjects.test_client_id}",
                headers=auth_headers
            )


class TestAdminInvoices(TestSetup):
    """Admin Invoices CRUD operations - with TPS/TVQ calculation"""
    
    created_invoice_id = None
    test_client_id = None
    
    def test_create_client_for_invoice(self, auth_headers):
        """Create a client for invoice testing"""
        client_data = {
            "full_name": "TEST_Invoice Client",
            "email": "test.invoice@example.com",
            "phone": "514-555-9012"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/v1/admin/clients",
            json=client_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        TestAdminInvoices.test_client_id = response.json()["id"]
    
    def test_create_invoice_with_lines(self, auth_headers):
        """Test creating an invoice with lines and tax calculation"""
        if not TestAdminInvoices.test_client_id:
            pytest.skip("No test client")
        
        invoice_data = {
            "client_id": TestAdminInvoices.test_client_id,
            "lines": [
                {"description": "Peinture chambre principale", "quantity": 1, "unit_price": 250},
                {"description": "Peinture salon", "quantity": 1, "unit_price": 300},
                {"description": "Matériaux de peinture", "quantity": 1, "unit_price": 150}
            ],
            "notes": "Test facture CRUD",
            "payment_terms": "Net 30"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/v1/admin/invoices",
            json=invoice_data,
            headers=auth_headers
        )
        
        print(f"Create invoice response: {response.status_code}")
        assert response.status_code == 200, f"Create invoice failed: {response.text}"
        
        data = response.json()
        
        # Verify invoice data
        assert data["client_id"] == TestAdminInvoices.test_client_id
        assert len(data["lines"]) == 3
        assert "invoice_number" in data
        assert data["invoice_number"].startswith("CMG-")
        
        # Verify calculations
        expected_subtotal = 250 + 300 + 150  # 700
        expected_tps = expected_subtotal * 0.05  # 35
        expected_tvq = expected_subtotal * 0.09975  # 69.825
        expected_total = expected_subtotal + expected_tps + expected_tvq  # 804.825
        
        assert data["subtotal"] == expected_subtotal, f"Subtotal mismatch: {data['subtotal']} != {expected_subtotal}"
        assert abs(data["tps_amount"] - expected_tps) < 0.01, f"TPS mismatch: {data['tps_amount']} != {expected_tps}"
        assert abs(data["tvq_amount"] - expected_tvq) < 0.01, f"TVQ mismatch: {data['tvq_amount']} != {expected_tvq}"
        assert abs(data["total"] - expected_total) < 0.01, f"Total mismatch: {data['total']} != {expected_total}"
        
        print(f"Invoice created with number: {data['invoice_number']}")
        print(f"Subtotal: ${data['subtotal']}, TPS: ${data['tps_amount']}, TVQ: ${data['tvq_amount']}, Total: ${data['total']}")
        
        TestAdminInvoices.created_invoice_id = data["id"]
    
    def test_get_invoices(self, auth_headers):
        """Test getting all invoices"""
        response = requests.get(
            f"{BASE_URL}/api/v1/admin/invoices",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Get invoices failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} invoices")
    
    def test_get_invoice_by_id(self, auth_headers):
        """Test getting a specific invoice"""
        if not TestAdminInvoices.created_invoice_id:
            pytest.skip("No invoice created")
        
        response = requests.get(
            f"{BASE_URL}/api/v1/admin/invoices/{TestAdminInvoices.created_invoice_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Get invoice failed: {response.text}"
        data = response.json()
        assert data["id"] == TestAdminInvoices.created_invoice_id
    
    def test_delete_invoice(self, auth_headers):
        """Test deleting an invoice"""
        if not TestAdminInvoices.created_invoice_id:
            pytest.skip("No invoice created")
        
        response = requests.delete(
            f"{BASE_URL}/api/v1/admin/invoices/{TestAdminInvoices.created_invoice_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Delete invoice failed: {response.text}"
        print(f"Invoice deleted successfully")
    
    def test_cleanup_test_client(self, auth_headers):
        """Cleanup test client"""
        if TestAdminInvoices.test_client_id:
            requests.delete(
                f"{BASE_URL}/api/v1/admin/clients/{TestAdminInvoices.test_client_id}",
                headers=auth_headers
            )


class TestSeededData(TestSetup):
    """Verify seeded data - Discount Codes, Pricing, Policies"""
    
    def test_discount_codes_seeded(self, auth_headers):
        """Verify 4 discount codes are pre-configured"""
        response = requests.get(
            f"{BASE_URL}/api/v1/admin/discount-codes",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Get discount codes failed: {response.text}"
        data = response.json()
        
        print(f"Found {len(data)} discount codes")
        assert len(data) >= 4, f"Expected at least 4 discount codes, found {len(data)}"
        
        # List discount codes
        for code in data:
            print(f"  - {code.get('code')}: {code.get('discount_value')}{'%' if code.get('discount_type') == 'percentage' else '$'} - {code.get('description')}")
    
    def test_pricing_items_seeded(self, auth_headers):
        """Verify 20 pricing items are pre-configured"""
        response = requests.get(
            f"{BASE_URL}/api/v1/admin/pricing",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Get pricing items failed: {response.text}"
        data = response.json()
        
        print(f"Found {len(data)} pricing items")
        assert len(data) >= 20, f"Expected at least 20 pricing items, found {len(data)}"
        
        # Count by service type
        service_counts = {}
        for item in data:
            stype = item.get('service_type', 'unknown')
            service_counts[stype] = service_counts.get(stype, 0) + 1
        
        print(f"Pricing items by service type:")
        for stype, count in service_counts.items():
            print(f"  - {stype}: {count} items")
    
    def test_policies_seeded(self, auth_headers):
        """Verify 5 policies are pre-configured"""
        response = requests.get(
            f"{BASE_URL}/api/v1/admin/policies",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Get policies failed: {response.text}"
        data = response.json()
        
        print(f"Found {len(data)} policies")
        assert len(data) >= 5, f"Expected at least 5 policies, found {len(data)}"
        
        # List policy types
        for policy in data:
            print(f"  - {policy.get('policy_type')}: {policy.get('title')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
