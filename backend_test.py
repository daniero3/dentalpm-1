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
        
        # Test user registration first with correct Node.js format
        timestamp = datetime.now().strftime('%H%M%S')
        user_data = {
            "username": f"dr_rakoto_{timestamp}",
            "email": f"dr.rakoto.{timestamp}@dental-madagascar.mg",
            "password": "MotDePasse123!",
            "role": "DENTIST",  # Node.js backend expects uppercase
            "full_name": "Dr. Jean Rakoto"
        }
        
        success, response = self.make_request('POST', 'auth/register', user_data, 201)
        if success:
            user_info = response.get('user', {})
            self.created_user_id = user_info.get('id')
            self.log_test("User Registration (Dentist)", True, 
                         f"- User ID: {self.created_user_id}, Role: {user_info.get('role')}")
        else:
            self.log_test("User Registration (Dentist)", False, f"- Error: {response}")
        
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

    def test_patient_creation_api(self):
        """Test patient creation API"""
        print("\n🔍 Testing Patient Creation API...")
        
        # Create patient with Madagascar data using Node.js field names
        timestamp = datetime.now().strftime('%H%M%S')
        patient_data = {
            "first_name": "Hery",
            "last_name": "Rasoanaivo",
            "date_of_birth": "1985-03-15",
            "gender": "MALE",  # Node.js backend expects uppercase
            "phone_primary": f"+261 34 12 {timestamp[:3]} {timestamp[3:5]}",  # Valid Madagascar format
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
            patients = response.get('patients', [])
            self.log_test("Get All Patients", True, f"- Found {len(patients)} patients")
        else:
            self.log_test("Get All Patients", False, f"- Error: {response}")
        
        # Test get specific patient
        success, response = self.make_request('GET', f'patients/{self.created_patient_id}', expected_status=200)
        if success:
            patient = response.get('patient', {})
            self.log_test("Get Specific Patient", True, 
                         f"- Patient: {patient.get('first_name', '')} {patient.get('last_name', '')}")
        else:
            self.log_test("Get Specific Patient", False, f"- Error: {response}")
            
        # Test patient update
        update_data = {
            "phone_primary": "+261 34 11 111 11",  # Updated phone
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
        
        # Test invoice creation with Madagascar-specific data using Node.js format
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
            "discount_percentage": 15.0,  # -15% syndical discount
            "notes": "Remise syndicale appliquée (-15%)"
        }
        
        success, response = self.make_request('POST', 'invoices', invoice_data, expected_status=201)
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

    def test_dashboard_stats(self):
        """Test dashboard statistics API"""
        print("\n🔍 Testing Dashboard Statistics...")
        
        # Use correct dashboard endpoint for Node.js backend
        success, response = self.make_request('GET', 'dashboard/kpi', expected_status=200)
        if success:
            patients = response.get('patients', {})
            revenue = response.get('revenue', {})
            self.log_test("Dashboard KPI", True, 
                         f"- Total Patients: {patients.get('total', 0)}, Total Revenue: {revenue.get('total', 0)} MGA")
        else:
            self.log_test("Dashboard KPI", False, f"- Error: {response}")
        
        return success

    def test_phase2_inventory_system(self):
        """Test Phase 2 Inventory/Stock Management System"""
        print("\n🔍 Testing Phase 2 - Inventory/Stock Management System...")
        
        all_passed = True
        
        # Test get all products
        success, response = self.make_request('GET', 'inventory/products', expected_status=200)
        if success:
            products = response.get('products', [])
            self.log_test("Inventory - Get Products", True, f"- Found {len(products)} products")
        else:
            self.log_test("Inventory - Get Products", False, f"- Error: {response}")
            all_passed = False
        
        # Test create product with correct field names
        product_data = {
            "name": "Composite Dentaire Premium",
            "sku": f"COMP-{datetime.now().strftime('%H%M%S')}",
            "description": "Composite dentaire haute qualité pour restaurations esthétiques",
            "category": "MATERIALS",  # Valid category from the enum
            "unit_cost_mga": 35000.0,  # Required field
            "sale_price_mga": 45000.0,  # Required field
            "min_qty": 10,  # Required field
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
                "type": "IN",  # Correct field name
                "quantity": 25,
                "reason": "Réapprovisionnement stock composite",  # Required field
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

    def test_phase2_supplier_system(self):
        """Test Phase 2 Supplier Management System"""
        print("\n🔍 Testing Phase 2 - Supplier Management System...")
        
        all_passed = True
        
        # Test get all suppliers
        success, response = self.make_request('GET', 'suppliers', expected_status=200)
        if success:
            suppliers = response.get('suppliers', [])
            self.log_test("Supplier - Get Suppliers", True, f"- Found {len(suppliers)} suppliers")
        else:
            self.log_test("Supplier - Get Suppliers", False, f"- Error: {response}")
            all_passed = False
        
        # Test create supplier with Madagascar data
        supplier_data = {
            "name": "Dental Supply Madagascar",
            "contact_person": "Rakoto Andry",
            "phone": "+261 20 22 123 45",
            "email": "contact@dentalsupply.mg",
            "address": "Zone Industrielle Forello, Antananarivo 101",
            "city": "Antananarivo",
            "nif_number": "3000123456",
            "stat_number": "12345678901234567890",
            "payment_terms": "30 jours",
            "notes": "Fournisseur principal équipements dentaires Madagascar"
        }
        
        success, response = self.make_request('POST', 'suppliers', supplier_data, expected_status=201)
        if success:
            supplier = response.get('supplier', {})
            created_supplier_id = supplier.get('id')
            self.log_test("Supplier - Create Supplier", True, f"- Supplier ID: {created_supplier_id}, Name: {supplier.get('name')}")
        else:
            self.log_test("Supplier - Create Supplier", False, f"- Error: {response}")
            all_passed = False
            created_supplier_id = None
        
        # Test get specific supplier
        if created_supplier_id:
            success, response = self.make_request('GET', f'suppliers/{created_supplier_id}', expected_status=200)
            if success:
                supplier = response.get('supplier', {})
                self.log_test("Supplier - Get Specific Supplier", True, f"- Name: {supplier.get('name')}, NIF: {supplier.get('nif_number')}")
            else:
                self.log_test("Supplier - Get Specific Supplier", False, f"- Error: {response}")
                all_passed = False
        
        return all_passed

    def test_phase2_lab_system(self):
        """Test Phase 2 Dental Lab Management System"""
        print("\n🔍 Testing Phase 2 - Dental Lab Management System...")
        
        all_passed = True
        
        # Test get all labs
        success, response = self.make_request('GET', 'labs', expected_status=200)
        if success:
            labs = response.get('labs', [])
            self.log_test("Lab - Get Labs", True, f"- Found {len(labs)} labs")
        else:
            self.log_test("Lab - Get Labs", False, f"- Error: {response}")
            all_passed = False
        
        # Test create lab
        lab_data = {
            "name": "Laboratoire Dentaire Antananarivo",
            "contact_person": "Dr. Rabe Hery",
            "phone": "+261 20 22 456 78",
            "email": "contact@labdentaire.mg",
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

    def test_phase2_mailing_system(self):
        """Test Phase 2 Patient Mailing System"""
        print("\n🔍 Testing Phase 2 - Patient Mailing System...")
        
        all_passed = True
        
        # Test get all campaigns
        success, response = self.make_request('GET', 'mailing/campaigns', expected_status=200)
        if success:
            campaigns = response.get('campaigns', [])
            self.log_test("Mailing - Get Campaigns", True, f"- Found {len(campaigns)} campaigns")
        else:
            self.log_test("Mailing - Get Campaigns", False, f"- Error: {response}")
            all_passed = False
        
        # Test create mailing campaign with correct template type
        campaign_data = {
            "name": "Rappel Contrôle Dentaire",
            "subject": "Il est temps pour votre contrôle dentaire !",
            "body_html": "<p>Bonjour,</p><p>Nous vous rappelons qu'il est temps de prendre rendez-vous pour votre contrôle dentaire annuel.</p><p>Cordialement,<br>Cabinet Dentaire</p>",
            "audience_filter": {
                "age_min": 18,
                "age_max": 65,
                "consent_required": True
            },
            "template_type": "APPOINTMENT_REMINDER"  # Valid template type
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

    def run_all_tests(self):
        """Run all dental practice management tests focusing on Phase 2 systems"""
        print("🏥 Starting Dental Practice Management API Tests - Madagascar")
        print(f"🌐 Testing against: {self.base_url}")
        print("🎯 Focus: Phase 2 Systems - Inventory, Suppliers, Labs, Mailing")
        print("=" * 80)
        
        # Test authentication first
        if not self.test_authentication_flow():
            print("❌ Authentication failed - stopping tests")
            return False
        
        # Test existing core functionality
        self.test_patient_creation_api()
        self.test_patient_management_apis()
        self.test_invoice_system()
        self.test_dashboard_stats()
        
        # Test Phase 2 systems as requested in review
        print("\n" + "=" * 50)
        print("🚀 TESTING PHASE 2 SYSTEMS")
        print("=" * 50)
        
        self.test_phase2_inventory_system()
        self.test_phase2_supplier_system()
        self.test_phase2_lab_system()
        self.test_phase2_mailing_system()
        
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