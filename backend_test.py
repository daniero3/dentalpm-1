#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Dental Practice Management - Madagascar
Tests Node.js/Express backend APIs with Madagascar-specific data
"""

import requests
import sys
import json
from datetime import datetime, timezone
from typing import Dict, Any, Optional

class DentalPracticeAPITester:
    def __init__(self, base_url="https://dental-mada.preview.emergentagent.com"):
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
            "username": f"admin_test_{timestamp}",
            "email": f"admin.test.{timestamp}@dental-madagascar.mg",
            "password": "AdminPass123!",
            "role": "ADMIN",
            "full_name": "Admin Test User"
        }
        
        success, response = self.make_request('POST', 'auth/register', user_data, 201)
        if success:
            user_info = response.get('user', {})
            self.created_user_id = user_info.get('id')
            self.log_test("User Registration (Admin)", True, 
                         f"- User ID: {self.created_user_id}, Role: {user_info.get('role')}")
        else:
            self.log_test("User Registration (Admin)", False, f"- Error: {response}")
        
        # Test login with the created user
        login_data = {
            "username": user_data["username"],
            "password": user_data["password"]
        }
        
        success, response = self.make_request('POST', 'auth/login', login_data, 200)
        if success and 'token' in response:
            self.token = response['token']
            user_info = response.get('user', {})
            self.log_test("User Login", True, f"- Token received, Role: {user_info.get('role', 'N/A')}")
        else:
            self.log_test("User Login", False, f"- Error: {response}")
            return False
        
        return True

    def test_patient_management_system(self):
        """Test comprehensive patient management system"""
        print("\n🔍 Testing Patient Management System...")
        
        # Create patient with Madagascar data
        timestamp = datetime.now().strftime('%H%M%S')
        patient_data = {
            "first_name": "Hery",
            "last_name": "Rasoanaivo",
            "date_of_birth": "1985-03-15",
            "gender": "MALE",
            "phone_primary": f"+261 34 12 {timestamp[:3]} {timestamp[3:5]}",
            "email": f"hery.rasoanaivo.{timestamp}@gmail.com",
            "address": "Lot II M 25 Antananarivo 101, Madagascar",
            "city": "Antananarivo",
            "emergency_contact_name": "Noro Rasoanaivo",
            "emergency_contact_phone": f"+261 33 98 {timestamp[:3]} {timestamp[3:5]}",
            "medical_history": "Hypertension artérielle, diabète type 2",
            "allergies": "Pénicilline, fruits de mer",
            "current_medications": "Metformine 500mg, Amlodipine 5mg"
        }
        
        # Test patient creation
        success, response = self.make_request('POST', 'patients', patient_data, 201)
        if success:
            patient_info = response.get('patient', {})
            self.created_patient_id = patient_info.get('id')
            patient_number = patient_info.get('patient_number')
            self.log_test("Patient Creation", True, 
                         f"- Patient ID: {self.created_patient_id}, Number: {patient_number}")
        else:
            self.log_test("Patient Creation", False, f"- Error: {response}")
            return False
        
        # Test get all patients
        success, response = self.make_request('GET', 'patients', expected_status=200)
        if success:
            patients = response.get('patients', [])
            self.log_test("Get All Patients", True, f"- Found {len(patients)} patients")
        else:
            self.log_test("Get All Patients", False, f"- Error: {response}")
        
        # Test get specific patient
        if self.created_patient_id:
            success, response = self.make_request('GET', f'patients/{self.created_patient_id}', expected_status=200)
            if success:
                patient = response.get('patient', {})
                self.log_test("Get Specific Patient", True, 
                             f"- Patient: {patient.get('first_name', '')} {patient.get('last_name', '')}")
            else:
                self.log_test("Get Specific Patient", False, f"- Error: {response}")
                
        # Test patient update
        if self.created_patient_id:
            update_data = {
                "phone_primary": "+261 34 11 111 11",
                "medical_history": "Hypertension artérielle, diabète type 2, allergie saisonnière"
            }
            
            success, response = self.make_request('PUT', f'patients/{self.created_patient_id}', update_data, expected_status=200)
            if success:
                updated_patient = response.get('patient', {})
                self.log_test("Patient Update", True, 
                             f"- Updated phone: {updated_patient.get('phone_primary', 'N/A')}")
            else:
                self.log_test("Patient Update", False, f"- Error: {response}")
        
        return True

    def test_appointment_management(self):
        """Test appointment booking and management"""
        print("\n🔍 Testing Appointment Management...")
        
        if not self.created_patient_id:
            self.log_test("Appointment Management", False, "- No patient ID available")
            return False
        
        # Test get all appointments
        success, response = self.make_request('GET', 'appointments', expected_status=200)
        if success:
            appointments = response.get('appointments', [])
            self.log_test("Get All Appointments", True, f"- Found {len(appointments)} appointments")
        else:
            self.log_test("Get All Appointments", False, f"- Error: {response}")
        
        # Test create appointment
        appointment_data = {
            "patient_id": self.created_patient_id,
            "appointment_date": "2024-10-15",
            "appointment_time": "14:30",
            "duration_minutes": 60,
            "appointment_type": "CONSULTATION",
            "status": "SCHEDULED",
            "notes": "Contrôle dentaire annuel",
            "reminder_sent": False
        }
        
        success, response = self.make_request('POST', 'appointments', appointment_data, 201)
        if success:
            appointment = response.get('appointment', {})
            appointment_id = appointment.get('id')
            self.log_test("Appointment Creation", True, 
                         f"- Appointment ID: {appointment_id}, Date: {appointment.get('appointment_date')}")
            
            # Test appointment status change
            if appointment_id:
                status_data = {"status": "CONFIRMED"}
                success, response = self.make_request('PUT', f'appointments/{appointment_id}/status', status_data, expected_status=200)
                if success:
                    self.log_test("Appointment Status Change", True, f"- Status changed to CONFIRMED")
                else:
                    self.log_test("Appointment Status Change", False, f"- Error: {response}")
        else:
            self.log_test("Appointment Creation", False, f"- Error: {response}")
        
        return True

    def test_invoice_system(self):
        """Test invoice creation with MGA currency and Madagascar business rules"""
        print("\n🔍 Testing Invoice System...")
        
        if not self.created_patient_id:
            self.log_test("Invoice System", False, "- No patient ID available")
            return False
        
        # Test invoice creation with Madagascar-specific data
        invoice_data = {
            "patient_id": self.created_patient_id,
            "items": [
                {
                    "description": "Consultation dentaire",
                    "quantity": 1,
                    "unit_price_mga": 25000.0
                },
                {
                    "description": "Obturation composite dent 8",
                    "quantity": 1,
                    "unit_price_mga": 75000.0
                },
                {
                    "description": "Détartrage complet",
                    "quantity": 1,
                    "unit_price_mga": 50000.0
                }
            ],
            "discount_percentage": 15.0,
            "notes": "Remise syndicale appliquée (-15%)"
        }
        
        success, response = self.make_request('POST', 'invoices', invoice_data, 201)
        if success:
            invoice_info = response.get('invoice', {})
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
            invoices = response.get('invoices', [])
            self.log_test("Get All Invoices", True, f"- Found {len(invoices)} invoices")
        else:
            self.log_test("Get All Invoices", False, f"- Error: {response}")
        
        # Test get specific invoice
        if self.created_invoice_id:
            success, response = self.make_request('GET', f'invoices/{self.created_invoice_id}', expected_status=200)
            if success:
                invoice_number = response.get('invoice_number', 'N/A')
                status = response.get('status', 'N/A')
                self.log_test("Get Specific Invoice", True, f"- Invoice: {invoice_number}, Status: {status}")
            else:
                self.log_test("Get Specific Invoice", False, f"- Error: {response}")
        
        return True

    def test_inventory_stock_management(self):
        """Test Inventory/Stock Management System"""
        print("\n🔍 Testing Inventory/Stock Management System...")
        
        all_passed = True
        
        # Test get all products
        success, response = self.make_request('GET', 'inventory/products', expected_status=200)
        if success:
            products = response.get('products', [])
            self.log_test("Inventory - Get Products", True, f"- Found {len(products)} products")
        else:
            self.log_test("Inventory - Get Products", False, f"- Error: {response}")
            all_passed = False
        
        # Test create product
        product_data = {
            "name": "Composite Dentaire Premium",
            "sku": f"COMP-{datetime.now().strftime('%H%M%S')}",
            "description": "Composite dentaire haute qualité pour restaurations esthétiques",
            "category": "MATERIALS",
            "unit_cost_mga": 35000.0,
            "sale_price_mga": 45000.0,
            "min_qty": 10,
            "current_qty": 50,
            "unit": "tube"
        }
        
        success, response = self.make_request('POST', 'inventory/products', product_data, expected_status=201)
        if success:
            product = response.get('product', {})
            created_product_id = product.get('id')
            self.log_test("Inventory - Create Product", True, f"- Product ID: {created_product_id}, SKU: {product.get('sku')}")
        else:
            self.log_test("Inventory - Create Product", False, f"- Error: {response}")
            all_passed = False
            created_product_id = None
        
        # Test stock movements
        success, response = self.make_request('GET', 'inventory/movements', expected_status=200)
        if success:
            movements = response.get('movements', [])
            self.log_test("Inventory - Get Movements", True, f"- Found {len(movements)} movements")
        else:
            self.log_test("Inventory - Get Movements", False, f"- Error: {response}")
            all_passed = False
        
        # Test low stock alerts
        success, response = self.make_request('GET', 'inventory/low-stock', expected_status=200)
        if success:
            low_stock = response.get('products', [])
            self.log_test("Inventory - Low Stock Alerts", True, f"- Found {len(low_stock)} low stock items")
        else:
            self.log_test("Inventory - Low Stock Alerts", False, f"- Error: {response}")
            all_passed = False
        
        # Test stock movement creation if we have a product
        if created_product_id:
            movement_data = {
                "product_id": created_product_id,
                "type": "IN",
                "quantity": 25,
                "reason": "Réapprovisionnement stock composite",
                "unit_cost_mga": 35000.0,
                "reference": f"PURCHASE-{datetime.now().strftime('%Y%m%d-%H%M%S')}",
                "notes": "Livraison fournisseur principal"
            }
            
            success, response = self.make_request('POST', 'inventory/movements', movement_data, expected_status=201)
            if success:
                movement = response.get('movement', {})
                self.log_test("Inventory - Create Movement", True, f"- Movement ID: {movement.get('id')}, Type: {movement.get('type')}")
            else:
                self.log_test("Inventory - Create Movement", False, f"- Error: {response}")
                all_passed = False
        
        return all_passed

    def test_dental_lab_management(self):
        """Test Dental Lab Management System"""
        print("\n🔍 Testing Dental Lab Management System...")
        
        all_passed = True
        
        # Test get all labs
        success, response = self.make_request('GET', 'labs', expected_status=200)
        if success:
            labs = response.get('labs', [])
            self.log_test("Lab - Get Labs", True, f"- Found {len(labs)} labs")
        else:
            self.log_test("Lab - Get Labs", False, f"- Error: {response}")
            all_passed = False
        
        # Test create lab with unique name
        timestamp = datetime.now().strftime('%H%M%S')
        lab_data = {
            "name": f"Laboratoire Dentaire Antananarivo {timestamp}",
            "contact_person": "Dr. Rabe Hery",
            "phone": "+261 20 22 456 78",
            "email": f"contact{timestamp}@labdentaire.mg",
            "address": "Rue Rainandriamampandry, Antananarivo 101",
            "city": "Antananarivo",
            "specialties": ["PROSTHETICS", "ORTHODONTICS", "IMPLANTS"],
            "lead_time_days": 7,
            "payment_terms": "Paiement à la livraison",
            "notes": "Laboratoire spécialisé prothèses dentaires Madagascar"
        }
        
        success, response = self.make_request('POST', 'labs', lab_data, expected_status=201)
        if success:
            lab = response.get('lab', {})
            created_lab_id = lab.get('id')
            self.log_test("Lab - Create Lab", True, f"- Lab ID: {created_lab_id}, Name: {lab.get('name')}")
        else:
            self.log_test("Lab - Create Lab", False, f"- Error: {response}")
            all_passed = False
            created_lab_id = None
        
        # Test get lab orders
        success, response = self.make_request('GET', 'labs/orders', expected_status=200)
        if success:
            orders = response.get('orders', [])
            self.log_test("Lab - Get Orders", True, f"- Found {len(orders)} orders")
        else:
            self.log_test("Lab - Get Orders", False, f"- Error: {response}")
            all_passed = False
        
        # Test create lab order if we have patient and lab
        if self.created_patient_id and created_lab_id:
            order_data = {
                "patient_id": self.created_patient_id,
                "lab_id": created_lab_id,
                "work_type": "CROWN",
                "shade": "A2",
                "due_date": "2024-10-15",
                "priority": "NORMAL",
                "notes": "Couronne céramique dent 11",
                "items": [
                    {
                        "tooth_number": "11",
                        "work_description": "Couronne céramique",
                        "unit_price_mga": 150000.0,
                        "quantity": 1
                    }
                ]
            }
            
            success, response = self.make_request('POST', 'labs/orders', order_data, expected_status=201)
            if success:
                order = response.get('order', {})
                order_number = order.get('order_number')
                self.log_test("Lab - Create Order", True, f"- Order: {order_number}, Total: {order.get('total_mga', 0)} MGA")
            else:
                self.log_test("Lab - Create Order", False, f"- Error: {response}")
                all_passed = False
        
        return all_passed

    def test_patient_mailing_system(self):
        """Test Patient Mailing System"""
        print("\n🔍 Testing Patient Mailing System...")
        
        all_passed = True
        
        # Test get all campaigns
        success, response = self.make_request('GET', 'mailing/campaigns', expected_status=200)
        if success:
            campaigns = response.get('campaigns', [])
            self.log_test("Mailing - Get Campaigns", True, f"- Found {len(campaigns)} campaigns")
        else:
            self.log_test("Mailing - Get Campaigns", False, f"- Error: {response}")
            all_passed = False
        
        # Test create mailing campaign
        campaign_data = {
            "name": "Rappel Contrôle Dentaire",
            "subject": "Il est temps pour votre contrôle dentaire !",
            "body_html": "<p>Bonjour,</p><p>Nous vous rappelons qu'il est temps de prendre rendez-vous pour votre contrôle dentaire annuel.</p><p>Cordialement,<br>Cabinet Dentaire</p>",
            "audience_filter": {
                "age_min": 18,
                "age_max": 65,
                "consent_required": True
            },
            "template_type": "APPOINTMENT_REMINDER"
        }
        
        success, response = self.make_request('POST', 'mailing/campaigns', campaign_data, expected_status=201)
        if success:
            campaign = response.get('campaign', {})
            created_campaign_id = campaign.get('id')
            self.log_test("Mailing - Create Campaign", True, f"- Campaign ID: {created_campaign_id}, Name: {campaign.get('name')}")
        else:
            self.log_test("Mailing - Create Campaign", False, f"- Error: {response}")
            all_passed = False
            created_campaign_id = None
        
        # Test send campaign (mock)
        if created_campaign_id:
            success, response = self.make_request('POST', f'mailing/campaigns/{created_campaign_id}/send', {}, expected_status=200)
            if success:
                result = response.get('result', {})
                emails_sent = result.get('emails_sent', 0)
                self.log_test("Mailing - Send Campaign", True, f"- Sent {emails_sent} emails (mock)")
            else:
                self.log_test("Mailing - Send Campaign", False, f"- Error: {response}")
                all_passed = False
        
        # Test get campaign logs
        if created_campaign_id:
            success, response = self.make_request('GET', f'mailing/campaigns/{created_campaign_id}/logs', expected_status=200)
            if success:
                logs = response.get('logs', [])
                self.log_test("Mailing - Get Campaign Logs", True, f"- Found {len(logs)} log entries")
            else:
                self.log_test("Mailing - Get Campaign Logs", False, f"- Error: {response}")
                all_passed = False
        
        # Test mailing analytics
        success, response = self.make_request('GET', 'mailing/analytics', expected_status=200)
        if success:
            analytics = response
            total_campaigns = analytics.get('total_campaigns', 0)
            total_emails = analytics.get('total_emails_sent', 0)
            self.log_test("Mailing - Analytics", True, f"- Total Campaigns: {total_campaigns}, Total Emails: {total_emails}")
        else:
            self.log_test("Mailing - Analytics", False, f"- Error: {response}")
            all_passed = False
        
        return all_passed

    def test_role_based_access_control(self):
        """Test role-based access control and permissions"""
        print("\n🔍 Testing Role-Based Access Control...")
        
        # Test creating users with different roles
        roles_to_test = ["DENTIST", "ASSISTANT", "ACCOUNTANT"]
        
        for role in roles_to_test:
            timestamp = datetime.now().strftime('%H%M%S')
            user_data = {
                "username": f"{role.lower()}_test_{timestamp}",
                "email": f"{role.lower()}.test.{timestamp}@dental-madagascar.mg",
                "password": "TestPass123!",
                "role": role,
                "full_name": f"Test {role.title()} User"
            }
            
            success, response = self.make_request('POST', 'auth/register', user_data, 201)
            if success:
                user_info = response.get('user', {})
                self.log_test(f"Role-Based Registration ({role})", True, 
                             f"- User ID: {user_info.get('id')}, Role: {user_info.get('role')}")
            else:
                self.log_test(f"Role-Based Registration ({role})", False, f"- Error: {response}")
        
        return True

    def test_dashboard_kpis(self):
        """Test dashboard KPI endpoints"""
        print("\n🔍 Testing Dashboard KPIs...")
        
        success, response = self.make_request('GET', 'dashboard/kpi', expected_status=200)
        if success:
            patients = response.get('patients', {})
            revenue = response.get('revenue', {})
            self.log_test("Dashboard KPI", True, 
                         f"- Total Patients: {patients.get('total', 0)}, Total Revenue: {revenue.get('total', 0)} MGA")
        else:
            self.log_test("Dashboard KPI", False, f"- Error: {response}")
        
        return success

    def run_comprehensive_backend_tests(self):
        """Run comprehensive backend testing as requested"""
        print("🏥 COMPREHENSIVE BACKEND TESTING - Dental Practice Management System")
        print(f"🌐 Testing against: {self.base_url}")
        print("🎯 Focus: All Backend Priority Features")
        print("=" * 80)
        
        # Test authentication first
        if not self.test_authentication_flow():
            print("❌ Authentication failed - stopping tests")
            return False
        
        # Test all priority systems as requested
        print("\n" + "=" * 50)
        print("🚀 TESTING PRIORITY BACKEND SYSTEMS")
        print("=" * 50)
        
        self.test_patient_management_system()
        self.test_appointment_management()
        self.test_invoice_system()  # Known issue area
        self.test_inventory_stock_management()
        self.test_dental_lab_management()
        self.test_patient_mailing_system()
        self.test_role_based_access_control()
        self.test_dashboard_kpis()
        
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
    success = tester.run_comprehensive_backend_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())