#!/usr/bin/env python3
"""
FastAPI Backend Testing for Current Dental Practice Management System
Tests the actual FastAPI implementation in /app/backend/server.py
"""

import requests
import sys
import json
from datetime import datetime, timezone
from typing import Dict, Any, Optional
import uuid

class FastAPIBackendTester:
    def __init__(self, base_url="https://saasdent.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.headers = {'Content-Type': 'application/json'}
        self.tests_run = 0
        self.tests_passed = 0
        self.created_patient_id = None
        self.created_invoice_id = None
        self.created_user_id = None

    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED {details}")
        else:
            print(f"❌ {name} - FAILED {details}")

    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, expected_status: int = 200) -> tuple[bool, Dict]:
        """Make HTTP request and return success status and response data"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = self.headers.copy()
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            else:
                return False, {"error": f"Unsupported method: {method}"}

            success = response.status_code == expected_status
            try:
                response_data = response.json()
            except:
                response_data = {"status_code": response.status_code, "text": response.text}

            return success, response_data

        except requests.exceptions.RequestException as e:
            return False, {"error": str(e)}

    def test_authentication_system(self):
        """Test FastAPI authentication system"""
        print("\n🔍 Testing FastAPI Authentication System...")
        
        # Test user registration
        timestamp = datetime.now().strftime('%H%M%S')
        user_data = {
            "username": f"dentist_test_{timestamp}",
            "email": f"dentist.test.{timestamp}@dental-madagascar.mg",
            "password": "DentistPass123!",
            "role": "dentist",
            "full_name": "Dr. Test Dentist"
        }
        
        success, response = self.make_request('POST', 'auth/register', user_data, 201)
        if success:
            user_info = response
            self.created_user_id = user_info.get('id')
            self.log_test("User Registration (Dentist)", True, 
                         f"- User ID: {self.created_user_id}, Role: {user_info.get('role')}")
        else:
            self.log_test("User Registration (Dentist)", False, f"- Error: {response}")
        
        # Test login
        login_data = {
            "username": user_data["username"],
            "password": user_data["password"]
        }
        
        success, response = self.make_request('POST', 'auth/login', login_data, 200)
        if success and 'access_token' in response:
            self.token = response['access_token']
            user_info = response.get('user', {})
            self.log_test("User Login", True, f"- Token received, Role: {user_info.get('role', 'N/A')}")
        else:
            self.log_test("User Login", False, f"- Error: {response}")
            return False
        
        return True

    def test_role_based_access(self):
        """Test role-based access control"""
        print("\n🔍 Testing Role-Based Access Control...")
        
        # Test creating users with different roles
        roles_to_test = ["dentist", "secretary", "accountant"]
        
        for role in roles_to_test:
            timestamp = datetime.now().strftime('%H%M%S')
            user_data = {
                "username": f"{role}_test_{timestamp}",
                "email": f"{role}.test.{timestamp}@dental-madagascar.mg",
                "password": "TestPass123!",
                "role": role,
                "full_name": f"Test {role.title()} User"
            }
            
            success, response = self.make_request('POST', 'auth/register', user_data, 201)
            if success:
                user_info = response
                self.log_test(f"Role-Based Registration ({role})", True, 
                             f"- User ID: {user_info.get('id')}, Role: {user_info.get('role')}")
            else:
                self.log_test(f"Role-Based Registration ({role})", False, f"- Error: {response}")
        
        return True

    def test_patient_management(self):
        """Test patient management CRUD operations"""
        print("\n🔍 Testing Patient Management...")
        
        # Create patient
        patient_data = {
            "first_name": "Hery",
            "last_name": "Rasoanaivo",
            "date_of_birth": "1985-03-15",
            "gender": "male",
            "phone": "+261 34 12 345 67",
            "email": "hery.rasoanaivo@gmail.com",
            "address": "Lot II M 25 Antananarivo 101, Madagascar",
            "emergency_contact": "Noro Rasoanaivo",
            "emergency_phone": "+261 33 98 765 43",
            "medical_history": "Hypertension artérielle, diabète type 2",
            "allergies": "Pénicilline, fruits de mer",
            "current_medications": "Metformine 500mg, Amlodipine 5mg"
        }
        
        success, response = self.make_request('POST', 'patients', patient_data, 201)
        if success:
            patient_info = response
            self.created_patient_id = patient_info.get('id')
            self.log_test("Patient Creation", True, 
                         f"- Patient ID: {self.created_patient_id}")
        else:
            self.log_test("Patient Creation", False, f"- Error: {response}")
            return False
        
        # Test get all patients
        success, response = self.make_request('GET', 'patients', expected_status=200)
        if success:
            patients = response if isinstance(response, list) else []
            self.log_test("Get All Patients", True, f"- Found {len(patients)} patients")
        else:
            self.log_test("Get All Patients", False, f"- Error: {response}")
        
        # Test get specific patient
        if self.created_patient_id:
            success, response = self.make_request('GET', f'patients/{self.created_patient_id}', expected_status=200)
            if success:
                patient = response
                self.log_test("Get Specific Patient", True, 
                             f"- Patient: {patient.get('first_name', '')} {patient.get('last_name', '')}")
            else:
                self.log_test("Get Specific Patient", False, f"- Error: {response}")
                
        # Test patient update
        if self.created_patient_id:
            update_data = {
                "first_name": "Hery",
                "last_name": "Rasoanaivo",
                "date_of_birth": "1985-03-15",
                "gender": "male",
                "phone": "+261 34 11 111 11",  # Updated phone
                "address": "Lot II M 25 Antananarivo 101, Madagascar",
                "emergency_contact": "Noro Rasoanaivo",
                "emergency_phone": "+261 33 98 765 43",
                "medical_history": "Hypertension artérielle, diabète type 2, allergie saisonnière"
            }
            
            success, response = self.make_request('PUT', f'patients/{self.created_patient_id}', update_data, expected_status=200)
            if success:
                updated_patient = response
                self.log_test("Patient Update", True, 
                             f"- Updated phone: {updated_patient.get('phone', 'N/A')}")
            else:
                self.log_test("Patient Update", False, f"- Error: {response}")
        
        return True

    def test_dental_chart_system(self):
        """Test dental chart management"""
        print("\n🔍 Testing Dental Chart System...")
        
        if not self.created_patient_id:
            self.log_test("Dental Chart System", False, "- No patient ID available")
            return False
        
        # Test create/get dental chart
        success, response = self.make_request('POST', f'patients/{self.created_patient_id}/dental-chart', expected_status=201)
        if success:
            chart = response
            chart_id = chart.get('id')
            teeth_count = len(chart.get('teeth_records', []))
            self.log_test("Dental Chart Creation", True, 
                         f"- Chart ID: {chart_id}, Teeth: {teeth_count}")
        else:
            self.log_test("Dental Chart Creation", False, f"- Error: {response}")
        
        # Test get dental chart
        success, response = self.make_request('GET', f'patients/{self.created_patient_id}/dental-chart', expected_status=200)
        if success:
            chart = response
            teeth_count = len(chart.get('teeth_records', []))
            self.log_test("Get Dental Chart", True, f"- Teeth records: {teeth_count}")
        else:
            self.log_test("Get Dental Chart", False, f"- Error: {response}")
        
        return True

    def test_invoice_system(self):
        """Test invoice creation and management"""
        print("\n🔍 Testing Invoice System...")
        
        if not self.created_patient_id:
            self.log_test("Invoice System", False, "- No patient ID available")
            return False
        
        # Test invoice creation
        invoice_data = {
            "patient_id": self.created_patient_id,
            "invoice_number": "",  # Will be auto-generated
            "date_issued": datetime.now().isoformat(),
            "items": [
                {
                    "description": "Consultation dentaire",
                    "quantity": 1,
                    "unit_price_mga": 25000.0,
                    "total_mga": 25000.0
                },
                {
                    "description": "Obturation composite",
                    "quantity": 1,
                    "unit_price_mga": 75000.0,
                    "total_mga": 75000.0
                }
            ],
            "subtotal_mga": 100000.0,
            "discount_percentage": 15.0,
            "discount_amount_mga": 15000.0,
            "total_mga": 85000.0,
            "payment_status": "pending",
            "notes": "Remise syndicale appliquée (-15%)"
        }
        
        success, response = self.make_request('POST', 'invoices', invoice_data, 201)
        if success:
            invoice_info = response
            self.created_invoice_id = invoice_info.get('id')
            invoice_number = invoice_info.get('invoice_number', 'N/A')
            total = invoice_info.get('total_mga', 0)
            self.log_test("Invoice Creation", True, f"- Invoice: {invoice_number}, Total: {total} MGA")
        else:
            self.log_test("Invoice Creation", False, f"- Error: {response}")
            return False
        
        # Test get all invoices
        success, response = self.make_request('GET', 'invoices', expected_status=200)
        if success:
            invoices = response if isinstance(response, list) else []
            self.log_test("Get All Invoices", True, f"- Found {len(invoices)} invoices")
        else:
            self.log_test("Get All Invoices", False, f"- Error: {response}")
        
        # Test get specific invoice
        if self.created_invoice_id:
            success, response = self.make_request('GET', f'invoices/{self.created_invoice_id}', expected_status=200)
            if success:
                invoice = response
                invoice_number = invoice.get('invoice_number', 'N/A')
                status = invoice.get('payment_status', 'N/A')
                self.log_test("Get Specific Invoice", True, f"- Invoice: {invoice_number}, Status: {status}")
            else:
                self.log_test("Get Specific Invoice", False, f"- Error: {response}")
        
        return True

    def test_dashboard_stats(self):
        """Test dashboard statistics endpoint"""
        print("\n🔍 Testing Dashboard Statistics...")
        
        success, response = self.make_request('GET', 'dashboard/stats', expected_status=200)
        if success:
            stats = response
            total_patients = stats.get('total_patients', 0)
            total_invoices = stats.get('total_invoices', 0)
            pending_payments = stats.get('pending_payments', 0)
            total_revenue = stats.get('total_revenue_mga', 0)
            
            self.log_test("Dashboard Statistics", True, 
                         f"- Patients: {total_patients}, Invoices: {total_invoices}, Revenue: {total_revenue} MGA")
        else:
            self.log_test("Dashboard Statistics", False, f"- Error: {response}")
        
        return success

    def test_missing_saas_features(self):
        """Test for missing SaaS features mentioned in the review request"""
        print("\n🔍 Testing for Missing SaaS Features...")
        
        missing_features = []
        
        # Test for SUPER_ADMIN role
        super_admin_data = {
            "username": "superadmin_test",
            "email": "superadmin@test.mg",
            "password": "SuperAdmin123!",
            "role": "SUPER_ADMIN",
            "full_name": "Super Admin Test"
        }
        
        success, response = self.make_request('POST', 'auth/register', super_admin_data, expected_status=201)
        if not success:
            missing_features.append("SUPER_ADMIN role not supported")
        
        # Test for subscription management endpoints
        success, response = self.make_request('GET', 'subscriptions/plans', expected_status=200)
        if not success:
            missing_features.append("Subscription management system")
        
        # Test for clinic management
        success, response = self.make_request('GET', 'admin/clinics', expected_status=200)
        if not success:
            missing_features.append("Multi-tenancy clinic management")
        
        # Test for billing system
        success, response = self.make_request('GET', 'billing/invoices', expected_status=200)
        if not success:
            missing_features.append("Subscription billing system")
        
        # Test for licensing guard
        success, response = self.make_request('GET', 'subscription/status', expected_status=200)
        if not success:
            missing_features.append("Licensing guard middleware")
        
        if missing_features:
            self.log_test("SaaS Features Check", False, f"- Missing: {', '.join(missing_features)}")
        else:
            self.log_test("SaaS Features Check", True, "- All SaaS features present")
        
        return len(missing_features) == 0

    def run_comprehensive_backend_tests(self):
        """Run comprehensive backend testing for current FastAPI system"""
        print("🏥 COMPREHENSIVE FASTAPI BACKEND TESTING - Current Implementation")
        print(f"🌐 Testing against: {self.base_url}")
        print("🎯 Focus: Current FastAPI Backend Features")
        print("=" * 80)
        
        # Test authentication first
        if not self.test_authentication_system():
            print("❌ Authentication failed - stopping tests")
            return False
        
        # Test all current systems
        print("\n" + "=" * 50)
        print("🚀 TESTING CURRENT FASTAPI BACKEND")
        print("=" * 50)
        
        self.test_role_based_access()
        self.test_patient_management()
        self.test_dental_chart_system()
        self.test_invoice_system()
        self.test_dashboard_stats()
        self.test_missing_saas_features()
        
        # Print final results
        print("\n" + "=" * 80)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        
        success_rate = (self.tests_passed / self.tests_run) * 100 if self.tests_run > 0 else 0
        
        if success_rate >= 80:
            print(f"✅ Backend testing completed with {success_rate:.1f}% success rate")
            return True
        else:
            print(f"❌ Backend testing failed with {success_rate:.1f}% success rate")
            return False

def main():
    """Main test execution"""
    tester = FastAPIBackendTester()
    success = tester.run_comprehensive_backend_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())