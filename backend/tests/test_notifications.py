"""
Backend API tests for Notification System
Tests: GET /api/v1/admin/notifications, GET /api/v1/admin/notifications/unread-count,
       PATCH /api/v1/admin/notifications/{id}/read, PATCH /api/v1/admin/notifications/mark-all-read,
       DELETE /api/v1/admin/notifications/{id}, notification triggers (leads, projects)
"""
import pytest
import requests
import os
import uuid
import time
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

def wait_for_notification(client, search_term, max_retries=5, delay=1.0):
    """Wait for a notification matching search_term to appear"""
    for _ in range(max_retries):
        time.sleep(delay)
        notifications = client.get(f"{BASE_URL}/api/v1/admin/notifications?limit=20").json()
        matching = [n for n in notifications if search_term in n.get("title", "")]
        if matching:
            return matching[0]
    return None


class TestNotificationAPI:
    """Test notification API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self, authenticated_client):
        """Setup for each test"""
        self.client = authenticated_client
        self.created_notifications = []
        self.created_leads = []
    
    def teardown_method(self, method):
        """Clean up created test data"""
        # Clean up created leads
        for lead_id in self.created_leads:
            try:
                self.client.delete(f"{BASE_URL}/api/v1/admin/leads/{lead_id}")
            except:
                pass
    
    def test_get_unread_count(self):
        """Test GET /api/v1/admin/notifications/unread-count"""
        response = self.client.get(f"{BASE_URL}/api/v1/admin/notifications/unread-count")
        assert response.status_code == 200
        data = response.json()
        assert "count" in data
        assert isinstance(data["count"], int)
        assert data["count"] >= 0
    
    def test_get_notifications_list(self):
        """Test GET /api/v1/admin/notifications"""
        response = self.client.get(f"{BASE_URL}/api/v1/admin/notifications")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Check notification structure if any exist
        if len(data) > 0:
            notification = data[0]
            assert "id" in notification
            assert "type" in notification
            assert "title" in notification
            assert "body" in notification
            assert "is_read" in notification
            assert "created_at" in notification
    
    def test_get_notifications_with_limit(self):
        """Test GET /api/v1/admin/notifications with limit parameter"""
        response = self.client.get(f"{BASE_URL}/api/v1/admin/notifications?limit=3")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) <= 3
    
    def test_get_notifications_unread_only(self):
        """Test GET /api/v1/admin/notifications with unread_only filter"""
        response = self.client.get(f"{BASE_URL}/api/v1/admin/notifications?unread_only=true")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # All returned notifications should be unread
        for notification in data:
            assert notification.get("is_read") == False
    
    def test_create_lead_triggers_notification(self):
        """Test that creating a lead triggers a new_lead notification"""
        unique_id = f"TEST_NotifLead_{uuid.uuid4().hex[:8]}"
        
        # Get initial unread count
        count_before = self.client.get(f"{BASE_URL}/api/v1/admin/notifications/unread-count").json()["count"]
        
        # Create a new lead (public endpoint, no auth needed for this)
        lead_data = {
            "full_name": unique_id,
            "phone": "514-555-1234",
            "email": f"{unique_id.lower()}@example.com",
            "service_type": "manual",
            "source": "website",
            "description": "Test lead for notification testing"
        }
        
        # Use unauthenticated client for public lead creation
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        lead_response = session.post(f"{BASE_URL}/api/v1/leads", json=lead_data)
        assert lead_response.status_code == 200
        lead = lead_response.json()
        self.created_leads.append(lead["id"])
        
        # Check notification was created (wait for background task)
        notification = wait_for_notification(self.client, unique_id)
        assert notification is not None, f"Expected notification for lead {unique_id} not found after waiting"
        
        assert notification["type"] == "new_lead"
        assert notification["entity_type"] == "lead"
        assert notification["entity_id"] == lead["id"]
        assert notification["is_read"] == False
    
    def test_mark_notification_as_read(self):
        """Test PATCH /api/v1/admin/notifications/{id}/read"""
        # First, create a lead to get a fresh notification
        unique_id = f"TEST_MarkRead_{uuid.uuid4().hex[:8]}"
        lead_data = {
            "full_name": unique_id,
            "phone": "514-555-1234",
            "email": f"{unique_id.lower()}@example.com",
            "service_type": "tech",
            "source": "website",
            "description": "Test for mark read"
        }
        
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        lead_response = session.post(f"{BASE_URL}/api/v1/leads", json=lead_data)
        assert lead_response.status_code == 200
        lead = lead_response.json()
        self.created_leads.append(lead["id"])
        
        # Get the notification (wait for background task)
        notification = wait_for_notification(self.client, unique_id)
        assert notification is not None, f"Expected notification for lead {unique_id} not found"
        notification_id = notification["id"]
        
        # Mark as read
        response = self.client.patch(f"{BASE_URL}/api/v1/admin/notifications/{notification_id}/read")
        assert response.status_code == 200
        assert response.json()["success"] == True
        
        # Verify it's marked as read
        notifications = self.client.get(f"{BASE_URL}/api/v1/admin/notifications?limit=20").json()
        notification = next((n for n in notifications if n["id"] == notification_id), None)
        assert notification is not None
        assert notification["is_read"] == True
    
    def test_mark_all_notifications_read(self):
        """Test PATCH /api/v1/admin/notifications/mark-all-read"""
        response = self.client.patch(f"{BASE_URL}/api/v1/admin/notifications/mark-all-read")
        assert response.status_code == 200
        data = response.json()
        assert "marked_read" in data
        
        # Verify unread count is now 0
        count_response = self.client.get(f"{BASE_URL}/api/v1/admin/notifications/unread-count")
        assert count_response.json()["count"] == 0
    
    def test_delete_notification(self):
        """Test DELETE /api/v1/admin/notifications/{id}"""
        # Create a lead to get a fresh notification
        unique_id = f"TEST_Delete_{uuid.uuid4().hex[:8]}"
        lead_data = {
            "full_name": unique_id,
            "phone": "514-555-1234",
            "email": f"{unique_id.lower()}@example.com",
            "service_type": "furniture",
            "source": "website",
            "description": "Test for delete"
        }
        
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        lead_response = session.post(f"{BASE_URL}/api/v1/leads", json=lead_data)
        assert lead_response.status_code == 200
        lead = lead_response.json()
        self.created_leads.append(lead["id"])
        
        # Get the notification (wait for background task)
        notification = wait_for_notification(self.client, unique_id)
        assert notification is not None, f"Expected notification for lead {unique_id} not found"
        notification_id = notification["id"]
        
        # Delete it
        response = self.client.delete(f"{BASE_URL}/api/v1/admin/notifications/{notification_id}")
        assert response.status_code == 200
        assert response.json()["success"] == True
        
        # Verify it's deleted
        notifications = self.client.get(f"{BASE_URL}/api/v1/admin/notifications?limit=50").json()
        ids = [n["id"] for n in notifications]
        assert notification_id not in ids
    
    def test_delete_nonexistent_notification(self):
        """Test DELETE /api/v1/admin/notifications/{id} with non-existent ID"""
        fake_id = str(uuid.uuid4())
        response = self.client.delete(f"{BASE_URL}/api/v1/admin/notifications/{fake_id}")
        assert response.status_code == 404
    
    def test_mark_nonexistent_notification_read(self):
        """Test PATCH /api/v1/admin/notifications/{id}/read with non-existent ID"""
        fake_id = str(uuid.uuid4())
        response = self.client.patch(f"{BASE_URL}/api/v1/admin/notifications/{fake_id}/read")
        assert response.status_code == 404
    
    def test_notification_types(self):
        """Test that notifications have valid types"""
        response = self.client.get(f"{BASE_URL}/api/v1/admin/notifications?limit=50")
        assert response.status_code == 200
        notifications = response.json()
        
        valid_types = ["new_lead", "invoice_created", "payment_received", "project_status"]
        for notification in notifications:
            assert notification["type"] in valid_types, f"Unknown notification type: {notification['type']}"


class TestProjectStatusNotification:
    """Test project status change notifications"""
    
    @pytest.fixture(autouse=True)
    def setup(self, authenticated_client):
        """Setup for each test"""
        self.client = authenticated_client
        self.created_clients = []
        self.created_projects = []
    
    def teardown_method(self, method):
        """Clean up created test data"""
        for project_id in self.created_projects:
            try:
                self.client.delete(f"{BASE_URL}/api/v1/admin/projects/{project_id}")
            except:
                pass
        for client_id in self.created_clients:
            try:
                self.client.delete(f"{BASE_URL}/api/v1/admin/clients/{client_id}")
            except:
                pass
    
    def test_project_status_change_triggers_notification(self):
        """Test that changing project status triggers a project_status notification"""
        unique_id = f"TEST_ProjNotif_{uuid.uuid4().hex[:8]}"
        
        # Create a client first
        client_data = {
            "full_name": f"Client_{unique_id}",
            "email": f"client_{unique_id.lower()}@example.com",
            "phone": "514-555-1234"
        }
        client_response = self.client.post(f"{BASE_URL}/api/v1/admin/clients", json=client_data)
        assert client_response.status_code == 200
        created_client = client_response.json()
        self.created_clients.append(created_client["id"])
        
        # Create a project
        project_data = {
            "client_id": created_client["id"],
            "title": f"Project_{unique_id}",
            "description": "Test project for notification",
            "service_type": "manual"
        }
        project_response = self.client.post(f"{BASE_URL}/api/v1/admin/projects", json=project_data)
        assert project_response.status_code == 200
        project = project_response.json()
        self.created_projects.append(project["id"])
        
        # Mark all as read first
        self.client.patch(f"{BASE_URL}/api/v1/admin/notifications/mark-all-read")
        
        # Update project status
        update_response = self.client.patch(
            f"{BASE_URL}/api/v1/admin/projects/{project['id']}",
            json={"status": "in_progress"}
        )
        assert update_response.status_code == 200
        
        # Check for notification (wait for background task)
        time.sleep(2)  # Wait for background task
        notifications = self.client.get(f"{BASE_URL}/api/v1/admin/notifications?limit=10").json()
        
        # Find project status notification
        matching = [n for n in notifications if n["type"] == "project_status" and project["id"] in str(n.get("entity_id", ""))]
        assert len(matching) > 0, f"Expected project_status notification not found. Got: {[n['type'] for n in notifications]}"
        
        notification = matching[0]
        assert notification["entity_type"] == "project"
        assert notification["entity_id"] == project["id"]
