import requests
import json
import sys
from datetime import datetime

class CMGeorgesAPITester:
    def __init__(self, base_url="https://cmgeorges-prod.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.test_user = None
        self.created_lead_id = None
        self.created_quote_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=test_headers, timeout=30)

            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                print(f"✅ PASSED - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if 'id' in response_data:
                        print(f"   Response ID: {response_data['id'][:8]}...")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ FAILED - Expected {expected_status}, got {response.status_code}")
                if response.status_code >= 400:
                    try:
                        error_detail = response.json()
                        print(f"   Error: {error_detail}")
                    except:
                        print(f"   Error: {response.text[:200]}")
                
                self.failed_tests.append({
                    'test': name,
                    'expected': expected_status,
                    'actual': response.status_code,
                    'endpoint': endpoint
                })
                return False, {}

        except requests.exceptions.Timeout:
            print(f"❌ FAILED - Timeout after 30 seconds")
            self.failed_tests.append({'test': name, 'error': 'Timeout', 'endpoint': endpoint})
            return False, {}
        except Exception as e:
            print(f"❌ FAILED - Error: {str(e)}")
            self.failed_tests.append({'test': name, 'error': str(e), 'endpoint': endpoint})
            return False, {}

    def test_health_check(self):
        """Test health check endpoint"""
        return self.run_test("Health Check", "GET", "/api/healthz", 200)

    def test_seed_database(self):
        """Test database seeding"""
        success, response = self.run_test("Seed Database", "POST", "/api/seed", 200)
        if success and 'admin_email' in response:
            print(f"   Admin credentials: {response['admin_email']} / {response['admin_password']}")
        return success, response

    def test_get_services(self):
        """Test get services endpoint"""
        success, response = self.run_test("Get Services", "GET", "/api/v1/services", 200)
        if success and isinstance(response, list):
            print(f"   Found {len(response)} services")
            service_names = [s.get('name', 'Unknown') for s in response]
            print(f"   Services: {', '.join(service_names)}")
        return success, response

    def test_get_portfolio(self):
        """Test get portfolio endpoint"""
        success, response = self.run_test("Get Portfolio", "GET", "/api/v1/portfolio", 200)
        if success and isinstance(response, list):
            print(f"   Found {len(response)} portfolio items")
        return success, response

    def test_admin_login(self, email="admin@cmgeorges.com", password="admin123"):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "/api/v1/auth/login",
            200,
            data={"email": email, "password": password}
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.test_user = response.get('user', {})
            print(f"   Logged in as: {self.test_user.get('full_name', email)}")
            return True
        return False

    def test_create_lead(self):
        """Test creating a lead"""
        lead_data = {
            "full_name": f"Test User {datetime.now().strftime('%H%M%S')}",
            "phone": "514-555-TEST",
            "email": f"test{datetime.now().strftime('%H%M%S')}@test.com",
            "service_type": "furniture",
            "address": "123 Test Street",
            "city": "Montréal",
            "urgency_level": "normal",
            "description": "Test lead for furniture assembly",
            "source": "other",
            "items": [
                {
                    "item_type": "bed",
                    "brand": "ikea",
                    "model": "MALM",
                    "quantity": 1,
                    "wall_anchor_required": True
                }
            ]
        }
        
        success, response = self.run_test("Create Lead", "POST", "/api/v1/leads", 200, data=lead_data)
        if success and 'id' in response:
            self.created_lead_id = response['id']
            print(f"   Created lead ID: {self.created_lead_id[:8]}...")
        return success, response

    def test_get_admin_stats(self):
        """Test admin stats endpoint (requires auth)"""
        return self.run_test("Get Admin Stats", "GET", "/api/v1/admin/stats", 200)

    def test_get_admin_leads(self):
        """Test get all leads (requires auth)"""
        success, response = self.run_test("Get Admin Leads", "GET", "/api/v1/admin/leads", 200)
        if success and isinstance(response, list):
            print(f"   Found {len(response)} leads")
        return success, response

    def test_get_specific_lead(self):
        """Test get specific lead"""
        if not self.created_lead_id:
            print("⚠️  Skipping - no lead ID available")
            return True, {}
        
        return self.run_test(
            "Get Specific Lead", 
            "GET", 
            f"/api/v1/admin/leads/{self.created_lead_id}", 
            200
        )

    def test_update_lead(self):
        """Test updating a lead"""
        if not self.created_lead_id:
            print("⚠️  Skipping - no lead ID available")
            return True, {}
        
        return self.run_test(
            "Update Lead",
            "PATCH",
            f"/api/v1/admin/leads/{self.created_lead_id}",
            200,
            data={"status": "contacted", "notes": "Test update from API test"}
        )

    def test_create_quote(self):
        """Test creating a quote"""
        if not self.created_lead_id:
            print("⚠️  Skipping - no lead ID available")
            return True, {}
        
        quote_data = {
            "lead_id": self.created_lead_id,
            "lines": [
                {
                    "description": "Assemblage lit MALM",
                    "quantity": 1,
                    "unit_price": 85.0,
                    "market_price": 150.0,
                    "line_type": "labor"
                },
                {
                    "description": "Kit ancrage mural",
                    "quantity": 1,
                    "unit_price": 25.0,
                    "market_price": 40.0,
                    "line_type": "material"
                }
            ],
            "contingency_percent": 15.0,
            "delivery_fee": 50.0,
            "urgency_fee": 0.0,
            "notes": "Test quote created by API test"
        }
        
        success, response = self.run_test("Create Quote", "POST", "/api/v1/admin/quotes", 200, data=quote_data)
        if success and 'id' in response:
            self.created_quote_id = response['id']
            print(f"   Created quote ID: {self.created_quote_id[:8]}...")
            print(f"   Total with tax: ${response.get('total_with_tax', 0):.2f}")
        return success, response

    def test_get_quotes(self):
        """Test get all quotes"""
        return self.run_test("Get All Quotes", "GET", "/api/v1/admin/quotes", 200)

    def test_get_specific_quote(self):
        """Test get specific quote"""
        if not self.created_quote_id:
            print("⚠️  Skipping - no quote ID available")
            return True, {}
        
        return self.run_test(
            "Get Specific Quote",
            "GET",
            f"/api/v1/admin/quotes/{self.created_quote_id}",
            200
        )

    def test_contact_form(self):
        """Test contact form submission"""
        contact_data = {
            "name": f"Test Contact {datetime.now().strftime('%H%M%S')}",
            "email": f"contact{datetime.now().strftime('%H%M%S')}@test.com",
            "phone": "514-555-CONT",
            "subject": "Test Contact Message",
            "message": "This is a test contact form submission from the API tester."
        }
        
        return self.run_test("Submit Contact Form", "POST", "/api/v1/contact", 200, data=contact_data)

    def test_ceo_dashboard(self):
        """Test CEO dashboard endpoint (requires admin auth)"""
        return self.run_test("Get CEO Dashboard", "GET", "/api/v1/admin/ceo-dashboard", 200)

    def test_get_clients(self):
        """Test get all clients"""
        return self.run_test("Get Admin Clients", "GET", "/api/v1/admin/clients", 200)

    def test_get_invoices(self):
        """Test get all invoices"""
        return self.run_test("Get Admin Invoices", "GET", "/api/v1/admin/invoices", 200)

    def test_get_projects(self):
        """Test get all projects"""
        return self.run_test("Get Admin Projects", "GET", "/api/v1/admin/projects", 200)

    def test_pricing_endpoint(self):
        """Test pricing information endpoint"""
        return self.run_test("Get Pricing Info", "GET", "/api/v1/pricing", 200)

    def run_all_tests(self):
        """Run all API tests in sequence"""
        print("=" * 60)
        print("🚀 CMGeorges API Testing Suite")
        print("=" * 60)
        
        # Test basic endpoints first
        print("\n📌 Phase 1: Basic Endpoints")
        self.test_health_check()
        
        # Try to seed database (might already be seeded)
        print("\n📌 Phase 2: Database Setup")
        self.test_seed_database()
        
        # Test public endpoints
        print("\n📌 Phase 3: Public Endpoints")
        self.test_get_services()
        self.test_get_portfolio()
        self.test_create_lead()
        
        # Test admin authentication
        print("\n📌 Phase 4: Admin Authentication")
        if self.test_admin_login():
            # Test admin endpoints
            print("\n📌 Phase 5: Admin Endpoints")
            self.test_get_admin_stats()
            self.test_get_admin_leads()
            self.test_get_specific_lead()
            self.test_update_lead()
            
            # Test quote functionality
            print("\n📌 Phase 6: Quote Management")
            self.test_create_quote()
            self.test_get_quotes()
            self.test_get_specific_quote()
        else:
            print("⚠️  Skipping admin tests due to login failure")
        
        # Print final results
        self.print_results()
        return self.tests_passed == self.tests_run

    def print_results(self):
        """Print test results summary"""
        print("\n" + "=" * 60)
        print("📊 TEST RESULTS")
        print("=" * 60)
        print(f"Total tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {len(self.failed_tests)}")
        print(f"Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.failed_tests:
            print("\n❌ Failed Tests:")
            for failure in self.failed_tests:
                error_msg = failure.get('error', f"Expected {failure.get('expected')}, got {failure.get('actual')}")
                print(f"   - {failure['test']}: {error_msg}")
        else:
            print("\n✅ All tests passed!")
        
        print("\n🔑 Test Data Created:")
        if self.created_lead_id:
            print(f"   Lead ID: {self.created_lead_id}")
        if self.created_quote_id:
            print(f"   Quote ID: {self.created_quote_id}")

def main():
    tester = CMGeorgesAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())