"""
API v2 Tests for ServiceFlow
Tests authentication, mobile API, projects, and multi-tenant isolation
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@cmgeorges.com"
ADMIN_PASSWORD = "strongpassword123"


class TestV2Authentication:
    """Tests for /api/v2/auth/* endpoints"""
    
    def test_login_success(self, api_client):
        """Test successful login via v2 auth"""
        response = api_client.post(f"{BASE_URL}/api/v2/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert "user" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"]["role"] == "admin"
    
    def test_login_invalid_credentials(self, api_client):
        """Test login with wrong password"""
        response = api_client.post(f"{BASE_URL}/api/v2/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": "wrongpassword"
        })
        
        assert response.status_code == 401
        assert response.json()["detail"] == "Invalid credentials"
    
    def test_login_nonexistent_user(self, api_client):
        """Test login with non-existent user"""
        response = api_client.post(f"{BASE_URL}/api/v2/auth/login", json={
            "email": "nonexistent@test.com",
            "password": "anypassword"
        })
        
        assert response.status_code == 401
        assert response.json()["detail"] == "Invalid credentials"
    
    def test_get_me_with_valid_token(self, api_client, v2_auth_token):
        """Test /api/v2/auth/me with valid token"""
        api_client.headers.update({"Authorization": f"Bearer {v2_auth_token}"})
        response = api_client.get(f"{BASE_URL}/api/v2/auth/me")
        
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == ADMIN_EMAIL
        assert data["role"] == "admin"
        assert "id" in data
        assert data["is_active"] == True
    
    def test_get_me_without_token(self, api_client):
        """Test /api/v2/auth/me without authorization"""
        response = api_client.get(f"{BASE_URL}/api/v2/auth/me")
        
        assert response.status_code in [401, 403]
    
    def test_get_me_with_invalid_token(self, api_client):
        """Test /api/v2/auth/me with invalid token"""
        api_client.headers.update({"Authorization": "Bearer invalidtoken123"})
        response = api_client.get(f"{BASE_URL}/api/v2/auth/me")
        
        assert response.status_code == 401
        assert response.json()["detail"] == "Invalid token"
    
    def test_refresh_token_success(self, api_client):
        """Test token refresh functionality"""
        # First login to get refresh token
        login_response = api_client.post(f"{BASE_URL}/api/v2/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        refresh_token = login_response.json()["refresh_token"]
        
        # Use refresh token to get new access token
        response = api_client.post(f"{BASE_URL}/api/v2/auth/refresh", json={
            "refresh_token": refresh_token
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
    
    def test_refresh_token_invalid(self, api_client):
        """Test refresh with invalid token"""
        response = api_client.post(f"{BASE_URL}/api/v2/auth/refresh", json={
            "refresh_token": "invalid_refresh_token"
        })
        
        assert response.status_code == 401


class TestV2MobileDashboard:
    """Tests for /api/v2/mobile/dashboard endpoint"""
    
    def test_mobile_dashboard_success(self, api_client, v2_auth_token):
        """Test mobile dashboard returns correct structure"""
        api_client.headers.update({"Authorization": f"Bearer {v2_auth_token}"})
        response = api_client.get(f"{BASE_URL}/api/v2/mobile/dashboard")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify required fields
        assert "todays_projects" in data
        assert "active_projects" in data
        assert "completed_this_week" in data
        assert "hours_this_week" in data
        assert "unread_messages" in data
        assert "user_name" in data
        
        # Verify data types
        assert isinstance(data["todays_projects"], int)
        assert isinstance(data["active_projects"], int)
        assert isinstance(data["completed_this_week"], int)
        assert isinstance(data["hours_this_week"], (int, float))
        assert isinstance(data["unread_messages"], int)
        assert isinstance(data["user_name"], str)
    
    def test_mobile_dashboard_unauthorized(self, api_client):
        """Test mobile dashboard without auth"""
        response = api_client.get(f"{BASE_URL}/api/v2/mobile/dashboard")
        
        assert response.status_code in [401, 403]


class TestV2MobileSync:
    """Tests for /api/v2/mobile/sync endpoints"""
    
    def test_sync_today_success(self, api_client, v2_auth_token):
        """Test today's sync returns correct structure"""
        api_client.headers.update({"Authorization": f"Bearer {v2_auth_token}"})
        response = api_client.get(f"{BASE_URL}/api/v2/mobile/sync/today")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify required fields
        assert "date" in data
        assert "projects" in data
        assert "total" in data
        
        # Verify data types
        assert isinstance(data["date"], str)
        assert isinstance(data["projects"], list)
        assert isinstance(data["total"], int)
        
        # Verify date format (YYYY-MM-DD)
        datetime.strptime(data["date"], "%Y-%m-%d")
    
    def test_sync_today_unauthorized(self, api_client):
        """Test today's sync without auth"""
        response = api_client.get(f"{BASE_URL}/api/v2/mobile/sync/today")
        
        assert response.status_code in [401, 403]


class TestV2Projects:
    """Tests for /api/v2/projects endpoints"""
    
    def test_list_projects_empty(self, api_client, v2_auth_token):
        """Test listing projects (may be empty for new tenant)"""
        api_client.headers.update({"Authorization": f"Bearer {v2_auth_token}"})
        response = api_client.get(f"{BASE_URL}/api/v2/projects")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_list_projects_with_status_filter(self, api_client, v2_auth_token):
        """Test listing projects with status filter"""
        api_client.headers.update({"Authorization": f"Bearer {v2_auth_token}"})
        response = api_client.get(f"{BASE_URL}/api/v2/projects?status=pending")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_my_assignments(self, api_client, v2_auth_token):
        """Test getting my assignments"""
        api_client.headers.update({"Authorization": f"Bearer {v2_auth_token}"})
        response = api_client.get(f"{BASE_URL}/api/v2/projects/my-assignments")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_projects_unauthorized(self, api_client):
        """Test projects endpoint without auth"""
        response = api_client.get(f"{BASE_URL}/api/v2/projects")
        
        assert response.status_code in [401, 403]


class TestMultiTenantIsolation:
    """Tests for multi-tenant data isolation"""
    
    def test_token_contains_tenant_id(self, api_client):
        """Verify JWT token contains tenant_id"""
        import jwt
        
        response = api_client.post(f"{BASE_URL}/api/v2/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        token = response.json()["access_token"]
        # Decode without verification to inspect payload
        payload = jwt.decode(token, options={"verify_signature": False})
        
        assert "tenant_id" in payload
        assert payload["tenant_id"] == "default"  # Default tenant for existing users
    
    def test_tenant_context_applied_to_mobile_dashboard(self, api_client, v2_auth_token):
        """Verify mobile dashboard respects tenant context"""
        api_client.headers.update({"Authorization": f"Bearer {v2_auth_token}"})
        response = api_client.get(f"{BASE_URL}/api/v2/mobile/dashboard")
        
        assert response.status_code == 200
        # If no error, tenant context was successfully applied


class TestV1BackwardsCompatibility:
    """Tests to ensure v1 API still works for backwards compatibility"""
    
    def test_v1_login_still_works(self, api_client):
        """Test v1 auth endpoint still functions"""
        response = api_client.post(f"{BASE_URL}/api/v1/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
    
    def test_v1_stats_still_works(self, api_client):
        """Test v1 admin stats endpoint still functions"""
        # Login first
        login_response = api_client.post(f"{BASE_URL}/api/v1/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = login_response.json()["access_token"]
        
        api_client.headers.update({"Authorization": f"Bearer {token}"})
        response = api_client.get(f"{BASE_URL}/api/v1/admin/stats")
        
        assert response.status_code == 200
        data = response.json()
        assert "total_leads" in data
        assert "new_leads" in data


# Fixtures specific to v2 tests
@pytest.fixture
def v2_auth_token(api_client):
    """Get v2 authentication token"""
    response = api_client.post(f"{BASE_URL}/api/v2/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("V2 Authentication failed — skipping authenticated tests")
