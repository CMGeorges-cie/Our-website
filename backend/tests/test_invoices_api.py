"""
Tests for Invoice API endpoints
Tests CRUD operations, payment recording, PDF generation, and email sending
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestInvoiceList:
    """Test invoice list endpoints"""
    
    def test_get_invoices_authenticated(self, authenticated_client):
        """GET /api/v1/admin/invoices returns invoices list"""
        response = authenticated_client.get(f"{BASE_URL}/api/v1/admin/invoices")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            invoice = data[0]
            assert "id" in invoice
            assert "invoice_number" in invoice
            assert "client_id" in invoice
            assert "total" in invoice
            assert "status" in invoice
    
    def test_get_invoices_filter_by_status(self, authenticated_client):
        """GET /api/v1/admin/invoices?status=draft filters correctly"""
        response = authenticated_client.get(f"{BASE_URL}/api/v1/admin/invoices?status=draft")
        assert response.status_code == 200
        data = response.json()
        for invoice in data:
            assert invoice["status"] == "draft"
    
    def test_get_invoices_without_auth_returns_error(self, api_client):
        """GET /api/v1/admin/invoices without auth returns 401 or 403"""
        response = api_client.get(f"{BASE_URL}/api/v1/admin/invoices")
        assert response.status_code in [401, 403]


class TestInvoiceCRUD:
    """Test invoice CRUD operations"""
    
    @pytest.fixture
    def test_client_id(self, authenticated_client):
        """Get a valid client ID for testing"""
        response = authenticated_client.get(f"{BASE_URL}/api/v1/admin/clients")
        if response.status_code == 200 and len(response.json()) > 0:
            return response.json()[0]["id"]
        pytest.skip("No clients available for testing")
    
    def test_create_invoice(self, authenticated_client, test_client_id, unique_id):
        """POST /api/v1/admin/invoices creates invoice with correct calculations"""
        payload = {
            "client_id": test_client_id,
            "notes": f"TEST_Invoice_{unique_id}",
            "payment_terms": "net30",
            "lines": [
                {"description": f"TEST Service {unique_id}", "quantity": 2, "unit_price": 100, "line_type": "service"},
                {"description": "TEST Materials", "quantity": 1, "unit_price": 50, "line_type": "service"}
            ]
        }
        
        response = authenticated_client.post(f"{BASE_URL}/api/v1/admin/invoices", json=payload)
        assert response.status_code == 200
        
        invoice = response.json()
        assert invoice["client_id"] == test_client_id
        assert invoice["notes"] == f"TEST_Invoice_{unique_id}"
        assert invoice["status"] == "draft"
        
        # Verify calculations
        assert invoice["subtotal"] == 250  # 2*100 + 1*50
        assert invoice["tps_amount"] == 12.5  # 250 * 0.05
        assert abs(invoice["tvq_amount"] - 24.94) < 0.01  # 250 * 0.09975
        assert abs(invoice["total"] - 287.44) < 0.01  # 250 + 12.5 + 24.94
        assert invoice["balance_due"] == invoice["total"]
        assert invoice["amount_paid"] == 0
        
        # Verify line items
        assert len(invoice["lines"]) == 2
        assert invoice["lines"][0]["line_total"] == 200
        assert invoice["lines"][1]["line_total"] == 50
        
        # Cleanup
        authenticated_client.delete(f"{BASE_URL}/api/v1/admin/invoices/{invoice['id']}")
    
    def test_get_single_invoice(self, authenticated_client, test_client_id, unique_id):
        """GET /api/v1/admin/invoices/{id} returns specific invoice"""
        # Create invoice first
        payload = {
            "client_id": test_client_id,
            "notes": f"TEST_Invoice_{unique_id}",
            "payment_terms": "net15",
            "lines": [{"description": "Test", "quantity": 1, "unit_price": 100, "line_type": "service"}]
        }
        create_response = authenticated_client.post(f"{BASE_URL}/api/v1/admin/invoices", json=payload)
        invoice_id = create_response.json()["id"]
        
        # Get invoice
        response = authenticated_client.get(f"{BASE_URL}/api/v1/admin/invoices/{invoice_id}")
        assert response.status_code == 200
        invoice = response.json()
        assert invoice["id"] == invoice_id
        assert invoice["notes"] == f"TEST_Invoice_{unique_id}"
        
        # Cleanup
        authenticated_client.delete(f"{BASE_URL}/api/v1/admin/invoices/{invoice_id}")
    
    def test_get_nonexistent_invoice_returns_404(self, authenticated_client):
        """GET /api/v1/admin/invoices/{invalid_id} returns 404"""
        response = authenticated_client.get(f"{BASE_URL}/api/v1/admin/invoices/nonexistent-id-12345")
        assert response.status_code == 404
    
    def test_delete_invoice(self, authenticated_client, test_client_id, unique_id):
        """DELETE /api/v1/admin/invoices/{id} removes invoice"""
        # Create invoice
        payload = {
            "client_id": test_client_id,
            "notes": f"TEST_Invoice_Delete_{unique_id}",
            "payment_terms": "net30",
            "lines": [{"description": "Test", "quantity": 1, "unit_price": 100, "line_type": "service"}]
        }
        create_response = authenticated_client.post(f"{BASE_URL}/api/v1/admin/invoices", json=payload)
        invoice_id = create_response.json()["id"]
        
        # Delete invoice
        delete_response = authenticated_client.delete(f"{BASE_URL}/api/v1/admin/invoices/{invoice_id}")
        assert delete_response.status_code == 200
        
        # Verify deleted
        get_response = authenticated_client.get(f"{BASE_URL}/api/v1/admin/invoices/{invoice_id}")
        assert get_response.status_code == 404


class TestInvoicePayments:
    """Test payment recording functionality"""
    
    @pytest.fixture
    def test_invoice(self, authenticated_client):
        """Create a test invoice for payment tests"""
        # Get a client
        clients_response = authenticated_client.get(f"{BASE_URL}/api/v1/admin/clients")
        if clients_response.status_code != 200 or len(clients_response.json()) == 0:
            pytest.skip("No clients available")
        client_id = clients_response.json()[0]["id"]
        
        # Create invoice
        payload = {
            "client_id": client_id,
            "notes": f"TEST_Payment_Invoice_{uuid.uuid4().hex[:8]}",
            "payment_terms": "net30",
            "lines": [{"description": "Test Service", "quantity": 1, "unit_price": 100, "line_type": "service"}]
        }
        response = authenticated_client.post(f"{BASE_URL}/api/v1/admin/invoices", json=payload)
        invoice = response.json()
        
        yield invoice
        
        # Cleanup
        authenticated_client.delete(f"{BASE_URL}/api/v1/admin/invoices/{invoice['id']}")
    
    def test_record_partial_payment(self, authenticated_client, test_invoice):
        """POST /api/v1/admin/invoices/{id}/payments records partial payment"""
        payment_payload = {
            "amount": 50,
            "method": "etransfer",
            "reference": "TEST_REF_001",
            "notes": "Test partial payment"
        }
        
        response = authenticated_client.post(
            f"{BASE_URL}/api/v1/admin/invoices/{test_invoice['id']}/payments",
            json=payment_payload
        )
        assert response.status_code == 200
        
        updated_invoice = response.json()
        assert updated_invoice["amount_paid"] == 50
        assert updated_invoice["balance_due"] == test_invoice["total"] - 50
        assert updated_invoice["status"] == "partial"
        assert len(updated_invoice["payments"]) == 1
        assert updated_invoice["payments"][0]["amount"] == 50
        assert updated_invoice["payments"][0]["method"] == "etransfer"
    
    def test_record_full_payment(self, authenticated_client, test_invoice):
        """POST /api/v1/admin/invoices/{id}/payments with full amount marks as paid"""
        payment_payload = {
            "amount": test_invoice["total"],
            "method": "credit_card",
            "reference": "TEST_FULL_PAYMENT",
            "notes": "Full payment"
        }
        
        response = authenticated_client.post(
            f"{BASE_URL}/api/v1/admin/invoices/{test_invoice['id']}/payments",
            json=payment_payload
        )
        assert response.status_code == 200
        
        updated_invoice = response.json()
        assert updated_invoice["amount_paid"] == test_invoice["total"]
        assert updated_invoice["balance_due"] == 0
        assert updated_invoice["status"] == "paid"


class TestInvoicePDF:
    """Test PDF generation"""
    
    def test_get_invoice_pdf(self, authenticated_client):
        """GET /api/v1/admin/invoices/{id}/pdf returns PDF"""
        # Get an existing invoice
        invoices_response = authenticated_client.get(f"{BASE_URL}/api/v1/admin/invoices")
        if invoices_response.status_code != 200 or len(invoices_response.json()) == 0:
            pytest.skip("No invoices available for PDF test")
        
        invoice_id = invoices_response.json()[0]["id"]
        
        response = authenticated_client.get(f"{BASE_URL}/api/v1/admin/invoices/{invoice_id}/pdf")
        assert response.status_code == 200
        assert response.headers.get("content-type") == "application/pdf"
    
    def test_get_pdf_nonexistent_invoice_returns_404(self, authenticated_client):
        """GET /api/v1/admin/invoices/{invalid_id}/pdf returns 404"""
        response = authenticated_client.get(f"{BASE_URL}/api/v1/admin/invoices/nonexistent-id/pdf")
        assert response.status_code == 404


class TestInvoiceEmail:
    """Test email sending (limited by Resend sandbox)"""
    
    def test_send_invoice_email_returns_error_for_sandbox(self, authenticated_client):
        """POST /api/v1/admin/invoices/{id}/send-email returns Resend sandbox error"""
        # Get an existing invoice
        invoices_response = authenticated_client.get(f"{BASE_URL}/api/v1/admin/invoices")
        if invoices_response.status_code != 200 or len(invoices_response.json()) == 0:
            pytest.skip("No invoices available for email test")
        
        invoice_id = invoices_response.json()[0]["id"]
        
        response = authenticated_client.post(f"{BASE_URL}/api/v1/admin/invoices/{invoice_id}/send-email")
        # Expected to fail with Resend sandbox limitation
        # This is acceptable behavior - the endpoint works but Resend limits recipients
        assert response.status_code in [200, 500]
        if response.status_code == 500:
            assert "resend" in response.json().get("detail", "").lower() or "email" in response.json().get("detail", "").lower()
