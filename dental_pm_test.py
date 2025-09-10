#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Dental Practice Management System - Madagascar
Tests the Node.js + SQLite implementation at /app/dental-pm-mvp
"""

import requests
import sys
import json
from datetime import datetime, timedelta
import uuid

class DentalPMTester:
    def __init__(self, base_url="http://localhost:3001"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.test_user_id = None
        self.test_patient_id = None
        self.test_invoice_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
        if details:
            print(f"    {details}")
        if success:
            self.tests_passed += 1
        else:
            self.failed_tests.append(f"{name}: {details}")
        print()

    def make_request(self, method, endpoint, data=None, expected_status=200):
        """Make HTTP request with error handling"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
            else:
                return False, {"error": f"Unsupported method: {method}"}

            success = response.status_code == expected_status
            try:
                response_data = response.json()
            except:
                response_data = {"raw_response": response.text, "status_code": response.status_code}

            return success, response_data

        except requests.exceptions.RequestException as e:
            return False, {"error": str(e)}

    def test_health_check(self):
        """Test server health endpoint"""
        print("🔍 Testing Server Health Check...")
        success, data = self.make_request('GET', 'health')
        
        if success and data.get('status') == 'OK':
            self.log_test("Health Check", True, f"Service: {data.get('service', 'Unknown')}")
            return True
        else:
            self.log_test("Health Check", False, f"Response: {data}")
            return False

    def test_authentication(self):
        """Test authentication flow with seeded users"""
        print("🔍 Testing Authentication...")
        
        # Test login with existing admin user (from seeded data)
        login_data = {
            "username": "admin",
            "password": "admin123"
        }
        
        success, data = self.make_request('POST', 'auth/login', login_data)
        
        if success and 'token' in data:
            self.token = data['token']
            user_info = data.get('user', {})
            self.test_user_id = user_info.get('id')
            self.log_test("Admin Login", True, f"Token received, Role: {user_info.get('role', 'N/A')}")
            return True
        else:
            self.log_test("Admin Login", False, f"Response: {data}")
            return False

    def test_user_registration(self):
        """Test user registration"""
        print("🔍 Testing User Registration...")
        
        test_username = f"test_dentist_{datetime.now().strftime('%H%M%S')}"
        register_data = {
            "username": test_username,
            "email": f"{test_username}@dentalpm.mg",
            "password": "TestPass123!",
            "full_name": "Dr. Test Dentist",
            "role": "DENTIST"
        }
        
        success, data = self.make_request('POST', 'auth/register', register_data, 201)
        
        if success:
            self.log_test("User Registration", True, f"User created: {data.get('username')}")
            return True
        else:
            self.log_test("User Registration", False, f"Response: {data}")
            return False

    def test_patient_management(self):
        """Test patient CRUD operations"""
        print("🔍 Testing Patient Management...")
        
        # Test getting all patients
        success, data = self.make_request('GET', 'patients')
        if success:
            patient_count = len(data) if isinstance(data, list) else 0
            self.log_test("Get All Patients", True, f"Found {patient_count} patients")
        else:
            self.log_test("Get All Patients", False, f"Response: {data}")
            return False

        # Test creating a new patient with Madagascar-specific data
        patient_data = {
            "first_name": "Noro",
            "last_name": "Rakotomalala",
            "date_of_birth": "1985-03-15",
            "gender": "FEMALE",
            "phone_primary": "+261 32 12 345 67",
            "phone_secondary": "+261 34 98 765 43",
            "email": "noro.rakoto@email.mg",
            "address": "Lot II M 25 Antananarivo 101, Madagascar",
            "city": "Antananarivo",
            "emergency_contact_name": "Paul Rakotomalala",
            "emergency_contact_phone": "+261 33 11 222 33",
            "emergency_contact_relationship": "Époux",
            "medical_history": "Hypertension, allergique à la pénicilline",
            "current_medications": "Amlodipine 5mg",
            "insurance_provider": "ARO",
            "insurance_number": "ARO123456789",
            "occupation": "Enseignante",
            "preferred_language": "FRENCH",
            "consent_treatment": True,
            "consent_data_processing": True,
            "consent_sms_reminders": True
        }
        
        success, data = self.make_request('POST', 'patients', patient_data, 201)
        if success:
            self.test_patient_id = data.get('id')
            self.log_test("Create Patient", True, f"Patient created with ID: {self.test_patient_id}")
        else:
            self.log_test("Create Patient", False, f"Response: {data}")
            return False

        # Test getting specific patient
        if self.test_patient_id:
            success, data = self.make_request('GET', f'patients/{self.test_patient_id}')
            if success:
                self.log_test("Get Specific Patient", True, f"Patient: {data.get('first_name')} {data.get('last_name')}")
            else:
                self.log_test("Get Specific Patient", False, f"Response: {data}")

            # Test patient update
            update_data = patient_data.copy()
            update_data["phone_primary"] = "+261 34 11 111 11"
            update_data["medical_history"] = "Hypertension, allergique à la pénicilline, diabète type 2"
            
            success, data = self.make_request('PUT', f'patients/{self.test_patient_id}', update_data)
            if success:
                self.log_test("Update Patient", True, f"Updated phone: {data.get('phone_primary', 'N/A')}")
            else:
                self.log_test("Update Patient", False, f"Response: {data}")

        return True

    def test_invoice_management(self):
        """Test invoice creation with Madagascar-specific features"""
        print("🔍 Testing Invoice Management...")
        
        if not self.test_patient_id:
            self.log_test("Invoice Management", False, "No test patient available")
            return False

        # Test creating invoice with MGA currency and discounts
        invoice_data = {
            "patient_id": self.test_patient_id,
            "items": [
                {
                    "description": "Consultation initiale",
                    "quantity": 1,
                    "unit_price_mga": 25000
                },
                {
                    "description": "Nettoyage dentaire",
                    "quantity": 1,
                    "unit_price_mga": 50000
                },
                {
                    "description": "Radiographie panoramique",
                    "quantity": 1,
                    "unit_price_mga": 35000
                }
            ],
            "discount_percentage": 15,
            "discount_type": "SYNDICAL",
            "nif_number": "NIF123456789",
            "stat_number": "STAT987654321",
            "notes": "Patient membre du syndicat des enseignants"
        }
        
        success, data = self.make_request('POST', 'invoices', invoice_data, 201)
        if success:
            self.test_invoice_id = data.get('id')
            total_mga = data.get('total_mga', 0)
            self.log_test("Create Invoice", True, f"Invoice created: {data.get('invoice_number')}, Total: {total_mga} MGA")
        else:
            self.log_test("Create Invoice", False, f"Response: {data}")
            return False

        # Test getting all invoices
        success, data = self.make_request('GET', 'invoices')
        if success:
            invoice_count = len(data) if isinstance(data, list) else 0
            self.log_test("Get All Invoices", True, f"Found {invoice_count} invoices")
        else:
            self.log_test("Get All Invoices", False, f"Response: {data}")

        # Test getting specific invoice
        if self.test_invoice_id:
            success, data = self.make_request('GET', f'invoices/{self.test_invoice_id}')
            if success:
                self.log_test("Get Specific Invoice", True, f"Invoice: {data.get('invoice_number')}")
            else:
                self.log_test("Get Specific Invoice", False, f"Response: {data}")

        return True

    def test_appointment_management(self):
        """Test appointment scheduling"""
        print("🔍 Testing Appointment Management...")
        
        if not self.test_patient_id:
            self.log_test("Appointment Management", False, "No test patient available")
            return False

        # Test creating appointment
        tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        appointment_data = {
            "patient_id": self.test_patient_id,
            "dentist_id": self.test_user_id,
            "appointment_date": tomorrow,
            "appointment_time": "09:00",
            "duration_minutes": 60,
            "appointment_type": "CONSULTATION",
            "notes": "Consultation de contrôle",
            "status": "SCHEDULED"
        }
        
        success, data = self.make_request('POST', 'appointments', appointment_data, 201)
        if success:
            appointment_id = data.get('id')
            self.log_test("Create Appointment", True, f"Appointment created for {tomorrow} at 09:00")
        else:
            self.log_test("Create Appointment", False, f"Response: {data}")
            return False

        # Test getting appointments
        success, data = self.make_request('GET', 'appointments')
        if success:
            appointment_count = len(data) if isinstance(data, list) else 0
            self.log_test("Get All Appointments", True, f"Found {appointment_count} appointments")
        else:
            self.log_test("Get All Appointments", False, f"Response: {data}")

        return True

    def test_dashboard_kpis(self):
        """Test dashboard statistics"""
        print("🔍 Testing Dashboard KPIs...")
        
        success, data = self.make_request('GET', 'dashboard/kpi')
        if success:
            kpis = []
            if 'total_patients' in data:
                kpis.append(f"Patients: {data['total_patients']}")
            if 'total_revenue_mga' in data:
                kpis.append(f"Revenue: {data['total_revenue_mga']} MGA")
            if 'pending_invoices' in data:
                kpis.append(f"Pending: {data['pending_invoices']}")
            if 'appointments_this_month' in data:
                kpis.append(f"Appointments: {data['appointments_this_month']}")
            
            self.log_test("Dashboard KPIs", True, f"KPIs: {', '.join(kpis)}")
        else:
            self.log_test("Dashboard KPIs", False, f"Response: {data}")

        return True

    def test_madagascar_integrations(self):
        """Test Madagascar-specific integrations (SMS and Mobile Money)"""
        print("🔍 Testing Madagascar Integrations...")
        
        # Test SMS integration (mocked)
        sms_data = {
            "phone_number": "+261 32 12 345 67",
            "message": "Bonjour, rappel de votre RDV demain à 9h00",
            "message_type": "APPOINTMENT_REMINDER",
            "patient_id": self.test_patient_id
        }
        
        success, data = self.make_request('POST', 'integrations/sms/send', sms_data)
        if success:
            self.log_test("SMS Integration", True, f"SMS sent: {data.get('message_id', 'Unknown ID')}")
        else:
            self.log_test("SMS Integration", False, f"Response: {data}")

        # Test Mobile Money integration (mocked)
        if self.test_invoice_id:
            mobile_money_data = {
                "phone_number": "+261 32 12 345 67",
                "amount_mga": 75000,
                "provider": "MVOLA",
                "invoice_id": self.test_invoice_id
            }
            
            success, data = self.make_request('POST', 'integrations/mobile-money/process-payment', mobile_money_data)
            if success:
                self.log_test("Mobile Money Integration", True, f"Payment processed: {data.get('transaction_id', 'Unknown ID')}")
            else:
                self.log_test("Mobile Money Integration", False, f"Response: {data}")

        return True

    def test_data_validation(self):
        """Test Madagascar-specific data validation"""
        print("🔍 Testing Data Validation...")
        
        # Test invalid phone number format
        invalid_patient = {
            "first_name": "Test",
            "last_name": "Invalid",
            "date_of_birth": "1990-01-01",
            "gender": "MALE",
            "phone_primary": "123456789",  # Invalid format
            "address": "Test Address"
        }
        
        success, data = self.make_request('POST', 'patients', invalid_patient, 400)
        if success:  # We expect this to fail (400 status)
            self.log_test("Phone Validation", True, "Invalid phone number rejected")
        else:
            self.log_test("Phone Validation", False, "Invalid phone number was accepted")

        return True

    def run_all_tests(self):
        """Run comprehensive test suite"""
        print("🚀 Starting Dental Practice Management System Tests")
        print("=" * 60)
        
        # Test sequence
        tests = [
            ("Server Health", self.test_health_check),
            ("Authentication", self.test_authentication),
            ("User Registration", self.test_user_registration),
            ("Patient Management", self.test_patient_management),
            ("Invoice Management", self.test_invoice_management),
            ("Appointment Management", self.test_appointment_management),
            ("Dashboard KPIs", self.test_dashboard_kpis),
            ("Madagascar Integrations", self.test_madagascar_integrations),
            ("Data Validation", self.test_data_validation)
        ]
        
        for test_name, test_func in tests:
            try:
                test_func()
            except Exception as e:
                self.log_test(f"{test_name} (Exception)", False, str(e))
        
        # Print summary
        print("=" * 60)
        print(f"📊 TEST SUMMARY")
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.failed_tests:
            print("\n❌ FAILED TESTS:")
            for failed_test in self.failed_tests:
                print(f"  - {failed_test}")
        
        print("=" * 60)
        
        return self.tests_passed == self.tests_run

def main():
    """Main test execution"""
    print("🦷 Dental Practice Management System - Madagascar")
    print("Backend API Testing Suite")
    print()
    
    tester = DentalPMTester()
    success = tester.run_all_tests()
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())