import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
TEST_ADMIN_EMAIL = os.environ.get('TEST_ADMIN_EMAIL', 'admin@cmgeorges.com')
TEST_ADMIN_PASSWORD = os.environ.get('TEST_ADMIN_PASSWORD', 'strongpassword123')

@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture
def auth_token(api_client):
    """Get authentication token"""
    response = api_client.post(f"{BASE_URL}/api/v1/auth/login", json={
        "email": TEST_ADMIN_EMAIL,
        "password": TEST_ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Authentication failed — skipping authenticated tests")

@pytest.fixture
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client

@pytest.fixture
def unique_id():
    """Generate unique identifier for test data"""
    return f"TEST_{uuid.uuid4().hex[:8]}_{int(datetime.now().timestamp())}"
