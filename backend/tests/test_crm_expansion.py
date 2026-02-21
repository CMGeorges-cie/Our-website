"""
CRM Expansion Tests - Testing new admin features:
- Discount Codes (Codes Promo)
- Pricing (Tarification)
- Policies (Politiques)
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
API_URL = f"{BASE_URL}/api/v1"

# Test credentials
ADMIN_EMAIL = "admin@cmgeorges.com"
ADMIN_PASSWORD = "admin123"


class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token for admin user"""
        response = requests.post(f"{API_URL}/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No token in response"
        return data["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_login_success(self):
        """Test admin login works"""
        response = requests.post(f"{API_URL}/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == ADMIN_EMAIL
        print(f"✓ Admin login successful")


class TestDiscountCodes:
    """Tests for Discount Codes (Codes Promo) endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{API_URL}/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_discount_codes(self, auth_headers):
        """Test GET /admin/discount-codes returns list"""
        response = requests.get(f"{API_URL}/admin/discount-codes", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET discount codes - {len(data)} codes found")
    
    def test_create_discount_code(self, auth_headers):
        """Test creating a new discount code"""
        code_data = {
            "code": f"TEST_{datetime.now().strftime('%H%M%S')}",
            "description": "Test discount code",
            "discount_type": "percentage",
            "discount_value": 15,
            "min_order_amount": 100,
            "max_uses": 50
        }
        response = requests.post(f"{API_URL}/admin/discount-codes", 
                                json=code_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["code"] == code_data["code"].upper(), "Code should be uppercase"
        assert data["discount_value"] == 15
        assert data["discount_type"] == "percentage"
        assert "id" in data
        print(f"✓ Created discount code: {data['code']}")
        return data["id"]
    
    def test_update_discount_code(self, auth_headers):
        """Test updating a discount code"""
        # First create a code to update
        code_data = {
            "code": f"UPDATE_{datetime.now().strftime('%H%M%S')}",
            "discount_type": "percentage",
            "discount_value": 10
        }
        create_response = requests.post(f"{API_URL}/admin/discount-codes", 
                                       json=code_data, headers=auth_headers)
        assert create_response.status_code == 200
        code_id = create_response.json()["id"]
        
        # Update the code
        update_data = {"discount_value": 25, "is_active": False}
        update_response = requests.patch(f"{API_URL}/admin/discount-codes/{code_id}", 
                                        json=update_data, headers=auth_headers)
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        updated = update_response.json()
        assert updated["discount_value"] == 25
        assert updated["is_active"] == False
        print(f"✓ Updated discount code {code_id}")
    
    def test_delete_discount_code(self, auth_headers):
        """Test deleting a discount code"""
        # Create a code to delete
        code_data = {
            "code": f"DEL_{datetime.now().strftime('%H%M%S')}",
            "discount_type": "fixed",
            "discount_value": 20
        }
        create_response = requests.post(f"{API_URL}/admin/discount-codes", 
                                       json=code_data, headers=auth_headers)
        assert create_response.status_code == 200
        code_id = create_response.json()["id"]
        
        # Delete the code
        delete_response = requests.delete(f"{API_URL}/admin/discount-codes/{code_id}", 
                                         headers=auth_headers)
        assert delete_response.status_code == 200
        print(f"✓ Deleted discount code {code_id}")
        
        # Verify it's gone - this should fail to update
        verify_response = requests.get(f"{API_URL}/admin/discount-codes", headers=auth_headers)
        codes = verify_response.json()
        assert not any(c["id"] == code_id for c in codes), "Code should be deleted"


class TestPricing:
    """Tests for Pricing (Tarification) endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{API_URL}/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_pricing_items(self, auth_headers):
        """Test GET /admin/pricing returns list"""
        response = requests.get(f"{API_URL}/admin/pricing", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET pricing items - {len(data)} items found")
    
    def test_create_pricing_item(self, auth_headers):
        """Test creating a new pricing item"""
        item_data = {
            "name": f"Test Service {datetime.now().strftime('%H%M%S')}",
            "description": "Test pricing item",
            "service_type": "manual",
            "category": "peinture",
            "unit": "pied carré",
            "base_price": 3.50,
            "min_price": 2.00,
            "max_price": 5.00
        }
        response = requests.post(f"{API_URL}/admin/pricing", 
                                json=item_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["name"] == item_data["name"]
        assert data["base_price"] == 3.50
        assert data["service_type"] == "manual"
        assert "id" in data
        print(f"✓ Created pricing item: {data['name']}")
        return data["id"]
    
    def test_create_furniture_pricing(self, auth_headers):
        """Test creating a furniture pricing item"""
        item_data = {
            "name": f"Assemblage IKEA {datetime.now().strftime('%H%M%S')}",
            "service_type": "furniture",
            "category": "assemblage",
            "unit": "heure",
            "base_price": 75.00
        }
        response = requests.post(f"{API_URL}/admin/pricing", 
                                json=item_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["service_type"] == "furniture"
        print(f"✓ Created furniture pricing: {data['name']}")
    
    def test_create_tech_pricing(self, auth_headers):
        """Test creating a tech pricing item"""
        item_data = {
            "name": f"Développement Web {datetime.now().strftime('%H%M%S')}",
            "service_type": "tech",
            "category": "web",
            "unit": "heure",
            "base_price": 95.00
        }
        response = requests.post(f"{API_URL}/admin/pricing", 
                                json=item_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["service_type"] == "tech"
        print(f"✓ Created tech pricing: {data['name']}")
    
    def test_update_pricing_item(self, auth_headers):
        """Test updating a pricing item"""
        # First create an item to update
        item_data = {
            "name": f"Update Test {datetime.now().strftime('%H%M%S')}",
            "service_type": "manual",
            "base_price": 100.00
        }
        create_response = requests.post(f"{API_URL}/admin/pricing", 
                                       json=item_data, headers=auth_headers)
        assert create_response.status_code == 200
        item_id = create_response.json()["id"]
        
        # Update the item
        update_data = {"base_price": 150.00, "is_active": False}
        update_response = requests.patch(f"{API_URL}/admin/pricing/{item_id}", 
                                        json=update_data, headers=auth_headers)
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        updated = update_response.json()
        assert updated["base_price"] == 150.00
        assert updated["is_active"] == False
        print(f"✓ Updated pricing item {item_id}")
    
    def test_delete_pricing_item(self, auth_headers):
        """Test deleting a pricing item"""
        # Create an item to delete
        item_data = {
            "name": f"Delete Test {datetime.now().strftime('%H%M%S')}",
            "service_type": "furniture",
            "base_price": 50.00
        }
        create_response = requests.post(f"{API_URL}/admin/pricing", 
                                       json=item_data, headers=auth_headers)
        assert create_response.status_code == 200
        item_id = create_response.json()["id"]
        
        # Delete the item
        delete_response = requests.delete(f"{API_URL}/admin/pricing/{item_id}", 
                                         headers=auth_headers)
        assert delete_response.status_code == 200
        print(f"✓ Deleted pricing item {item_id}")


class TestPolicies:
    """Tests for Policies (Politiques) endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{API_URL}/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_policies(self, auth_headers):
        """Test GET /admin/policies returns list"""
        response = requests.get(f"{API_URL}/admin/policies", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET policies - {len(data)} policies found")
    
    def test_create_terms_policy(self, auth_headers):
        """Test creating a terms policy"""
        policy_data = {
            "policy_type": "terms",
            "title": f"Conditions Générales Test {datetime.now().strftime('%H%M%S')}",
            "content": "Ceci est un test de politique de conditions générales. Lorem ipsum dolor sit amet.",
            "version": "1.0"
        }
        response = requests.post(f"{API_URL}/admin/policies", 
                                json=policy_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["policy_type"] == "terms"
        assert data["title"] == policy_data["title"]
        assert "id" in data
        print(f"✓ Created terms policy: {data['title']}")
        return data["id"]
    
    def test_create_privacy_policy(self, auth_headers):
        """Test creating a privacy policy"""
        policy_data = {
            "policy_type": "privacy",
            "title": f"Politique Confidentialité Test {datetime.now().strftime('%H%M%S')}",
            "content": "Protection des données personnelles. Nous respectons votre vie privée.",
            "version": "2.0"
        }
        response = requests.post(f"{API_URL}/admin/policies", 
                                json=policy_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["policy_type"] == "privacy"
        print(f"✓ Created privacy policy: {data['title']}")
    
    def test_create_warranty_policy(self, auth_headers):
        """Test creating a warranty policy"""
        policy_data = {
            "policy_type": "warranty",
            "title": f"Garantie Test {datetime.now().strftime('%H%M%S')}",
            "content": "Garantie de 2 ans sur tous nos travaux de peinture.",
            "version": "1.0"
        }
        response = requests.post(f"{API_URL}/admin/policies", 
                                json=policy_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["policy_type"] == "warranty"
        print(f"✓ Created warranty policy: {data['title']}")
    
    def test_create_cancellation_policy(self, auth_headers):
        """Test creating a cancellation policy"""
        policy_data = {
            "policy_type": "cancellation",
            "title": f"Annulation Test {datetime.now().strftime('%H%M%S')}",
            "content": "Politique d'annulation. Préavis de 48h requis.",
            "version": "1.0"
        }
        response = requests.post(f"{API_URL}/admin/policies", 
                                json=policy_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["policy_type"] == "cancellation"
        print(f"✓ Created cancellation policy: {data['title']}")
    
    def test_create_payment_policy(self, auth_headers):
        """Test creating a payment policy"""
        policy_data = {
            "policy_type": "payment",
            "title": f"Paiement Test {datetime.now().strftime('%H%M%S')}",
            "content": "Modalités de paiement. 50% à la signature, 50% à la fin.",
            "version": "1.0"
        }
        response = requests.post(f"{API_URL}/admin/policies", 
                                json=policy_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["policy_type"] == "payment"
        print(f"✓ Created payment policy: {data['title']}")
    
    def test_update_policy(self, auth_headers):
        """Test updating a policy"""
        # First create a policy to update
        policy_data = {
            "policy_type": "terms",
            "title": f"Update Test {datetime.now().strftime('%H%M%S')}",
            "content": "Original content"
        }
        create_response = requests.post(f"{API_URL}/admin/policies", 
                                       json=policy_data, headers=auth_headers)
        assert create_response.status_code == 200
        policy_id = create_response.json()["id"]
        
        # Update the policy
        update_data = {
            "content": "Updated content with more details",
            "version": "1.1",
            "is_active": True
        }
        update_response = requests.patch(f"{API_URL}/admin/policies/{policy_id}", 
                                        json=update_data, headers=auth_headers)
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        updated = update_response.json()
        assert "Updated content" in updated["content"]
        assert updated["version"] == "1.1"
        print(f"✓ Updated policy {policy_id}")
    
    def test_delete_policy(self, auth_headers):
        """Test deleting a policy"""
        # Create a policy to delete
        policy_data = {
            "policy_type": "terms",
            "title": f"Delete Test {datetime.now().strftime('%H%M%S')}",
            "content": "To be deleted"
        }
        create_response = requests.post(f"{API_URL}/admin/policies", 
                                       json=policy_data, headers=auth_headers)
        assert create_response.status_code == 200
        policy_id = create_response.json()["id"]
        
        # Delete the policy
        delete_response = requests.delete(f"{API_URL}/admin/policies/{policy_id}", 
                                         headers=auth_headers)
        assert delete_response.status_code == 200
        print(f"✓ Deleted policy {policy_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
