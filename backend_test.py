#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Dental Practice Management - Madagascar
Tests FastAPI backend APIs with Madagascar-specific data
"""

import requests
import sys
import json
from datetime import datetime, timezone
from typing import Dict, Any, Optional

class DentalPracticeAPITester:
    def __init__(self, base_url="https://dentalpm.preview.emergentagent.com"):
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

    def test_authentication_flow(self):
        """Test authentication with user registration and login"""
        print("\n🔍 Testing Authentication Flow...")
        
        # Test user registration first
        timestamp = datetime.now().strftime('%H%M%S')
        user_data = {
            "username": f"dr_rakoto_{timestamp}",
            "email": f"dr.rakoto.{timestamp}@dental-madagascar.mg",
            "password": "MotDePasse123!",
            "role": "dentist",  # FastAPI enum format
            "full_name": "Dr. Jean Rakoto"
        }
        
        success, response = self.make_request('POST', 'auth/register', user_data, 200)
        if success:
            self.created_user_id = response.get('id')
            self.log_test("User Registration (Dentist)", True, 
                         f"- User ID: {self.created_user_id}, Role: {response.get('role')}")
        else:
            self.log_test("User Registration (Dentist)", False, f"- Error: {response}")
        
        # Test login with the created user
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

    def test_patient_creation_api(self):
        """Test patient creation API"""
        print("\n🔍 Testing Patient Creation API...")
        
        # Create patient with Madagascar data using FastAPI field names
        timestamp = datetime.now().strftime('%H%M%S')
        patient_data = {
            "first_name": "Hery",
            "last_name": "Rasoanaivo",
            "date_of_birth": "1985-03-15",
            "gender": "male",  # FastAPI enum format
            "phone": f"+261 34 12 {timestamp[:3]} {timestamp[3:5]}",  # Valid Madagascar format
            "email": f"hery.rasoanaivo.{timestamp}@gmail.com",
            "address": "Lot II M 25 Antananarivo 101, Madagascar",
            "emergency_contact": "Noro Rasoanaivo",
            "emergency_phone": f"+261 33 98 {timestamp[:3]} {timestamp[3:5]}",
            "medical_history": "Hypertension artérielle, diabète type 2",
            "allergies": "Pénicilline, fruits de mer",
            "current_medications": "Metformine 500mg, Amlodipine 5mg"
        }
        
        # Test patient creation
        success, response = self.make_request('POST', 'patients', patient_data, 200)
        if success:
            self.created_patient_id = response.get('id')
            self.log_test("Patient Creation", True, 
                         f"- Patient ID: {self.created_patient_id}, Name: {response.get('first_name')} {response.get('last_name')}")
        else:
            self.log_test("Patient Creation", False, f"- Error: {response}")
            return False
        
        return True

    def test_patient_management_apis(self):
        """Test patient management CRUD operations"""
        print("\n🔍 Testing Patient Management APIs...")
        
        if not self.created_patient_id:
            self.log_test("Patient Management APIs", False, "- No patient ID available")
            return False
        
        # Test get all patients
        success, response = self.make_request('GET', 'patients', expected_status=200)
        if success:
            patients = response if isinstance(response, list) else []
            self.log_test("Get All Patients", True, f"- Found {len(patients)} patients")
        else:
            self.log_test("Get All Patients", False, f"- Error: {response}")
        
        # Test get specific patient
        success, response = self.make_request('GET', f'patients/{self.created_patient_id}', expected_status=200)
        if success:
            self.log_test("Get Specific Patient", True, 
                         f"- Patient: {response.get('first_name', '')} {response.get('last_name', '')}")
        else:
            self.log_test("Get Specific Patient", False, f"- Error: {response}")
            
        # Test patient update
        update_data = {
            "first_name": "Hery",
            "last_name": "Rasoanaivo",
            "date_of_birth": "1985-03-15",
            "gender": "male",
            "phone": "+261 34 11 111 11",  # Updated phone
            "address": "Lot II M 25 Antananarivo 101, Madagascar",
            "emergency_contact": "Noro Rasoanaivo",
            "emergency_phone": "+261 33 98 111 11",
            "medical_history": "Hypertension artérielle, diabète type 2, allergie saisonnière"
        }
        
        success, response = self.make_request('PUT', f'patients/{self.created_patient_id}', update_data, expected_status=200)
        if success:
            self.log_test("Patient Update", True, 
                         f"- Updated phone: {response.get('phone', 'N/A')}")
        else:
            self.log_test("Patient Update", False, f"- Error: {response}")
        
        return True

    def test_dental_chart_system(self):
        """Test dental chart creation and tooth procedure management"""
        print("\n🔍 Testing Dental Chart System...")
        
        if not self.created_patient_id:
            self.log_test("Dental Chart System", False, "- No patient ID available")
            return False
        
        # Test dental chart creation
        success, response = self.make_request('POST', f'patients/{self.created_patient_id}/dental-chart', expected_status=200)
        if success:
            teeth_count = len(response.get('teeth_records', []))
            self.log_test("Dental Chart Creation", True, f"- Created chart with {teeth_count} teeth")
        else:
            self.log_test("Dental Chart Creation", False, f"- Error: {response}")
            return False
        
        # Test get dental chart
        success, response = self.make_request('GET', f'patients/{self.created_patient_id}/dental-chart', expected_status=200)
        self.log_test("Get Dental Chart", success, 
                     f"- Chart ID: {response.get('id', 'N/A')}" if success else f"- Error: {response}")
        
        # Test tooth record update with Madagascar dental procedure
        tooth_data = {
            "tooth_position": "8",  # Upper right central incisor
            "procedures": [
                {
                    "procedure_type": "restoration",
                    "procedure_name": "Obturation composite",
                    "description": "Restauration esthétique incisive centrale",
                    "cost_mga": 75000.0,  # 75,000 MGA (typical cost in Madagascar)
                    "date_performed": datetime.now().isoformat(),
                    "notes": "Carie superficielle, restauration directe"
                }
            ],
            "status": "filled",
            "notes": "Dent restaurée avec succès"
        }
        
        success, response = self.make_request('PUT', f'patients/{self.created_patient_id}/dental-chart/tooth/8', tooth_data, expected_status=200)
        self.log_test("Tooth Record Update", success, 
                     f"- Updated tooth 8 with restoration" if success else f"- Error: {response}")
        
        return True

    def test_invoice_system(self):
        """Test invoice creation with MGA currency and Madagascar discount systems"""
        print("\n🔍 Testing Invoice System...")
        
        if not self.created_patient_id:
            self.log_test("Invoice System", False, "- No patient ID available")
            return False
        
        # Test invoice creation with Madagascar-specific data
        invoice_data = {
            "patient_id": self.created_patient_id,
            "invoice_number": "",  # Will be auto-generated by backend
            "date_issued": datetime.now().isoformat(),
            "items": [
                {
                    "description": "Consultation dentaire",
                    "quantity": 1,
                    "unit_price_mga": 25000.0,
                    "total_mga": 25000.0
                },
                {
                    "description": "Obturation composite dent 8",
                    "quantity": 1,
                    "unit_price_mga": 75000.0,
                    "total_mga": 75000.0
                },
                {
                    "description": "Détartrage complet",
                    "quantity": 1,
                    "unit_price_mga": 50000.0,
                    "total_mga": 50000.0
                }
            ],
            "subtotal_mga": 150000.0,
            "discount_percentage": 15.0,  # -15% syndical discount
            "discount_amount_mga": 22500.0,
            "total_mga": 127500.0,
            "payment_status": "pending",
            "payment_method": "mvola",  # Madagascar mobile money
            "notes": "Remise syndicale appliquée (-15%)"
        }
        
        success, response = self.make_request('POST', 'invoices', invoice_data, expected_status=200)
        if success:
            self.created_invoice_id = response.get('id')
            invoice_number = response.get('invoice_number', 'N/A')
            self.log_test("Invoice Creation", True, f"- Invoice: {invoice_number}, Total: {response.get('total_mga', 0)} MGA")
        else:
            self.log_test("Invoice Creation", False, f"- Error: {response}")
            return False
        
        # Test get all invoices
        success, response = self.make_request('GET', 'invoices', expected_status=200)
        self.log_test("Get All Invoices", success, 
                     f"- Found {len(response) if isinstance(response, list) else 0} invoices" if success else f"- Error: {response}")
        
        # Test get specific invoice
        if self.created_invoice_id:
            success, response = self.make_request('GET', f'invoices/{self.created_invoice_id}', expected_status=200)
            self.log_test("Get Specific Invoice", success, 
                         f"- Invoice: {response.get('invoice_number', 'N/A')}, Status: {response.get('payment_status', 'N/A')}" if success else f"- Error: {response}")
        
        return True

    def test_dashboard_stats(self):
        """Test dashboard statistics API"""
        print("\n🔍 Testing Dashboard Statistics...")
        
        # Use correct dashboard endpoint
        success, response = self.make_request('GET', 'dashboard/kpi', expected_status=200)
        if success:
            patients = response.get('patients', {})
            revenue = response.get('revenue', {})
            self.log_test("Dashboard KPI", True, 
                         f"- Total Patients: {patients.get('total', 0)}, Total Revenue: {revenue.get('total', 0)} MGA")
        else:
            self.log_test("Dashboard KPI", False, f"- Error: {response}")
        
        return success

    def test_additional_apis(self):
        """Test additional API endpoints"""
        print("\n🔍 Testing Additional APIs...")
        
        # Test health check
        success, response = self.make_request('GET', 'health', expected_status=200)
        if success:
            self.log_test("Health Check", True, f"- Status: {response.get('status')}")
        else:
            self.log_test("Health Check", False, f"- Error: {response}")
        
        # Test user profile
        success, response = self.make_request('GET', 'auth/profile', expected_status=200)
        if success:
            self.log_test("User Profile", True, f"- User: {response.get('full_name', 'N/A')}")
        else:
            self.log_test("User Profile", False, f"- Error: {response}")
        
        return True

    def test_additional_scenarios(self):
        """Test additional scenarios and edge cases"""
        print("\n🔍 Testing Additional Scenarios...")
        
        # Test humanitarian discount (20%)
        if self.created_patient_id:
            humanitarian_invoice = {
                "patient_id": self.created_patient_id,
                "invoice_number": "",  # Will be auto-generated by backend
                "date_issued": datetime.now().isoformat(),
                "items": [
                    {
                        "description": "Extraction dentaire d'urgence",
                        "quantity": 1,
                        "unit_price_mga": 40000.0,
                        "total_mga": 40000.0
                    }
                ],
                "subtotal_mga": 40000.0,
                "discount_percentage": 20.0,  # -20% humanitarian discount
                "discount_amount_mga": 8000.0,
                "total_mga": 32000.0,
                "payment_status": "paid",
                "payment_method": "cash",
                "notes": "Remise humanitaire appliquée (-20%)"
            }
            
            success, response = self.make_request('POST', 'invoices', humanitarian_invoice, expected_status=200)
            self.log_test("Humanitarian Discount Invoice", success, 
                         f"- Total with 20% discount: {response.get('total_mga', 0)} MGA" if success else f"- Error: {response}")
        
        # Test secretary role registration
        secretary_data = {
            "username": f"sec_noro_{datetime.now().strftime('%H%M%S')}",
            "email": f"noro.secretary.{datetime.now().strftime('%H%M%S')}@dental-madagascar.mg",
            "password": "SecretairePass123!",
            "role": "secretary",
            "full_name": "Noro Randrianarisoa"
        }
        
        success, response = self.make_request('POST', 'auth/register', secretary_data, expected_status=200)
        self.log_test("Secretary Registration", success, 
                     f"- Secretary: {response.get('full_name', 'N/A')}" if success else f"- Error: {response}")

    def run_all_tests(self):
        """Run all dental practice management tests focusing on Phase 1 fixes"""
        print("🏥 Starting Dental Practice Management API Tests - Madagascar")
        print(f"🌐 Testing against: {self.base_url}")
        print("🎯 Focus: Phase 1 Bug Fixes - Patient Creation, SMS Validation, Authentication")
        print("=" * 80)
        
        # Test authentication first (including admin login)
        if not self.test_authentication_flow():
            print("❌ Authentication failed - stopping tests")
            return False
        
        # Test Phase 1 critical fixes
        self.test_patient_creation_api()  # Test patient_number generation fix
        self.test_patient_management_apis()  # Test patient CRUD operations
        self.test_sms_integration_validation()  # Test SMS patient_id validation fix
        
        # Test existing core functionality
        self.test_dashboard_stats()
        self.test_additional_apis()
        
        # Print final results
        print("\n" + "=" * 80)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed! Dental practice management system is working correctly.")
            return True
        else:
            failed_tests = self.tests_run - self.tests_passed
            print(f"⚠️  {failed_tests} test(s) failed. Please check the issues above.")
            return False

def main():
    """Main test execution"""
    tester = DentalPracticeAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())