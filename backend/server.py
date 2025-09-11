from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import bcrypt
import jwt
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="Dental Practice Management SaaS - Madagascar", version="2.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# CORS configuration for deployment
origins = [
    "http://localhost:3000",
    "https://localhost:3000",
    os.environ.get("FRONTEND_URL", ""),
    "https://*.emergent.host",
    "https://*.emergentagent.com"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()
JWT_SECRET = os.environ.get('JWT_SECRET', 'dental-practice-secret-key-madagascar-2024')

# Enums
class UserRole(str, Enum):
    ADMIN = "ADMIN"
    DENTIST = "DENTIST"
    ASSISTANT = "ASSISTANT" 
    ACCOUNTANT = "ACCOUNTANT"
    SUPER_ADMIN = "SUPER_ADMIN"

class SubscriptionPlan(str, Enum):
    ESSENTIAL = "ESSENTIAL"
    PRO = "PRO"
    GROUP = "GROUP"

class SubscriptionStatus(str, Enum):
    TRIAL = "TRIAL"
    ACTIVE = "ACTIVE"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"

class Gender(str, Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"

# SaaS Models
class Clinic(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    address: str
    city: str
    postal_code: Optional[str] = None
    phone: Optional[str] = None
    email: str
    nif_number: Optional[str] = None
    stat_number: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Subscription(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    clinic_id: str
    plan: SubscriptionPlan
    status: SubscriptionStatus
    price_mga: int
    start_date: datetime
    end_date: Optional[datetime] = None
    trial_end_date: Optional[datetime] = None
    auto_renew: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: str
    password_hash: str
    full_name: str
    role: UserRole
    clinic_id: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Auth Models
class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    message: str
    token: str
    user: Dict[str, Any]

# SaaS Plan Configuration
SUBSCRIPTION_PLANS = {
    "ESSENTIAL": {
        "name": "Essential",
        "price_mga": 180000,
        "max_practitioners": 2,
        "features": ["Gestion patients", "Rendez-vous", "Facturation MGA"]
    },
    "PRO": {
        "name": "Pro", 
        "price_mga": 390000,
        "max_practitioners": 4,
        "features": ["Inventaire avancé", "Laboratoire", "Mailing patients", "Rapports avancés"]
    },
    "GROUP": {
        "name": "Group",
        "price_mga": 790000,
        "max_practitioners": 999,
        "features": ["Multi-site", "API access", "Formation personnalisée", "Support dédié 24/7"]
    }
}

class ToothPosition(str, Enum):
    # Adult teeth numbering (1-32 American system)
    TOOTH_1 = "1"   # Upper right wisdom
    TOOTH_2 = "2"   # Upper right molar
    TOOTH_3 = "3"   # Upper right molar
    TOOTH_4 = "4"   # Upper right premolar
    TOOTH_5 = "5"   # Upper right premolar
    TOOTH_6 = "6"   # Upper right canine
    TOOTH_7 = "7"   # Upper right lateral incisor
    TOOTH_8 = "8"   # Upper right central incisor
    TOOTH_9 = "9"   # Upper left central incisor
    TOOTH_10 = "10" # Upper left lateral incisor
    TOOTH_11 = "11" # Upper left canine
    TOOTH_12 = "12" # Upper left premolar
    TOOTH_13 = "13" # Upper left premolar
    TOOTH_14 = "14" # Upper left molar
    TOOTH_15 = "15" # Upper left molar
    TOOTH_16 = "16" # Upper left wisdom
    TOOTH_17 = "17" # Lower left wisdom
    TOOTH_18 = "18" # Lower left molar
    TOOTH_19 = "19" # Lower left molar
    TOOTH_20 = "20" # Lower left premolar
    TOOTH_21 = "21" # Lower left premolar
    TOOTH_22 = "22" # Lower left canine
    TOOTH_23 = "23" # Lower left lateral incisor
    TOOTH_24 = "24" # Lower left central incisor
    TOOTH_25 = "25" # Lower right central incisor
    TOOTH_26 = "26" # Lower right lateral incisor
    TOOTH_27 = "27" # Lower right canine
    TOOTH_28 = "28" # Lower right premolar
    TOOTH_29 = "29" # Lower right premolar
    TOOTH_30 = "30" # Lower right molar
    TOOTH_31 = "31" # Lower right molar
    TOOTH_32 = "32" # Lower right wisdom

class ProcedureType(str, Enum):
    RESTORATION = "restoration"
    PROSTHETICS = "prosthetics"
    ODF = "odf"  # Orthodontics
    PERIODONTICS = "periodontics"
    SURGERY = "surgery"
    PREVENTION = "prevention"
    ENDODONTICS = "endodontics"

# Pydantic Models
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: UserRole
    full_name: str

class UserLogin(BaseModel):
    username: str
    password: str

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: EmailStr
    role: UserRole
    full_name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: User

class PatientCreate(BaseModel):
    first_name: str
    last_name: str
    date_of_birth: str  # ISO format
    gender: Gender
    phone: str
    email: Optional[EmailStr] = None
    address: str
    emergency_contact: str
    emergency_phone: str
    medical_history: Optional[str] = None
    allergies: Optional[str] = None
    current_medications: Optional[str] = None

class Patient(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    first_name: str
    last_name: str
    date_of_birth: str
    gender: Gender
    phone: str
    email: Optional[EmailStr] = None
    address: str
    emergency_contact: str
    emergency_phone: str
    medical_history: Optional[str] = None
    allergies: Optional[str] = None
    current_medications: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DentalProcedure(BaseModel):
    procedure_type: ProcedureType
    procedure_name: str
    description: Optional[str] = None
    cost_mga: float  # Cost in Malagasy Ariary
    date_performed: Optional[str] = None  # ISO format
    notes: Optional[str] = None

class ToothRecord(BaseModel):
    tooth_position: ToothPosition
    procedures: List[DentalProcedure] = []
    status: str = "healthy"  # healthy, carious, missing, filled, crowned, etc.
    notes: Optional[str] = None

class DentalChart(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    patient_id: str
    teeth_records: List[ToothRecord] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class InvoiceItem(BaseModel):
    description: str
    quantity: int
    unit_price_mga: float
    total_mga: float

class Invoice(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    patient_id: str
    invoice_number: str
    date_issued: str  # ISO format
    items: List[InvoiceItem]
    subtotal_mga: float
    discount_percentage: float = 0.0
    discount_amount_mga: float = 0.0
    total_mga: float
    payment_status: str = "pending"  # pending, paid, partial, overdue
    payment_method: Optional[str] = None  # cash, bank_transfer, cheque, mvola, orange_money, airtel_money
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Helper functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(user_data: dict) -> str:
    return jwt.encode(user_data, JWT_SECRET, algorithm="HS256")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        user_id = payload.get("id")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Token invalide")
        
        user = await db.users.find_one({"id": user_id})
        if user is None:
            raise HTTPException(status_code=401, detail="Utilisateur non trouvé")
        
        return User(**user)
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Token invalide")

def prepare_for_mongo(data):
    """Convert datetime objects to ISO strings for MongoDB storage"""
    if isinstance(data, dict):
        for key, value in data.items():
            if isinstance(value, datetime):
                data[key] = value.isoformat()
            elif isinstance(value, dict):
                data[key] = prepare_for_mongo(value)
            elif isinstance(value, list):
                data[key] = [prepare_for_mongo(item) if isinstance(item, dict) else item for item in value]
    return data

# Authentication Routes
@api_router.post("/auth/register", response_model=User)
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"$or": [{"username": user_data.username}, {"email": user_data.email}]})
    if existing_user:
        raise HTTPException(status_code=400, detail="Nom d'utilisateur ou email déjà existant")
    
    # Hash password and create user
    hashed_password = hash_password(user_data.password)
    user = User(
        username=user_data.username,
        email=user_data.email,
        role=user_data.role,
        full_name=user_data.full_name
    )
    
    user_dict = user.dict()
    user_dict["password"] = hashed_password
    user_dict = prepare_for_mongo(user_dict)
    
    await db.users.insert_one(user_dict)
    return user

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(login_data: UserLogin):
    user = await db.users.find_one({"username": login_data.username})
    if not user or not verify_password(login_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Nom d'utilisateur ou mot de passe incorrect")
    
    user_obj = User(**user)
    token = create_access_token({"id": user_obj.id, "username": user_obj.username, "role": user_obj.role})
    
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=user_obj
    )

# Patient Management Routes
@api_router.post("/patients", response_model=Patient)
async def create_patient(patient_data: PatientCreate, current_user: User = Depends(get_current_user)):
    patient = Patient(**patient_data.dict())
    patient_dict = prepare_for_mongo(patient.dict())
    await db.patients.insert_one(patient_dict)
    return patient

@api_router.get("/patients", response_model=List[Patient])
async def get_patients(current_user: User = Depends(get_current_user)):
    patients = await db.patients.find().to_list(1000)
    return [Patient(**patient) for patient in patients]

@api_router.get("/patients/{patient_id}", response_model=Patient)
async def get_patient(patient_id: str, current_user: User = Depends(get_current_user)):
    patient = await db.patients.find_one({"id": patient_id})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient non trouvé")
    return Patient(**patient)

@api_router.put("/patients/{patient_id}", response_model=Patient)
async def update_patient(patient_id: str, patient_data: PatientCreate, current_user: User = Depends(get_current_user)):
    patient = await db.patients.find_one({"id": patient_id})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient non trouvé")
    
    updated_data = patient_data.dict()
    updated_data["updated_at"] = datetime.now(timezone.utc)
    updated_data = prepare_for_mongo(updated_data)
    
    await db.patients.update_one({"id": patient_id}, {"$set": updated_data})
    
    updated_patient = await db.patients.find_one({"id": patient_id})
    return Patient(**updated_patient)

# Dental Chart Routes
@api_router.post("/patients/{patient_id}/dental-chart", response_model=DentalChart)
async def create_dental_chart(patient_id: str, current_user: User = Depends(get_current_user)):
    # Check if patient exists
    patient = await db.patients.find_one({"id": patient_id})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient non trouvé")
    
    # Check if dental chart already exists
    existing_chart = await db.dental_charts.find_one({"patient_id": patient_id})
    if existing_chart:
        return DentalChart(**existing_chart)
    
    # Initialize dental chart with all teeth
    teeth_records = []
    for tooth_pos in ToothPosition:
        teeth_records.append(ToothRecord(tooth_position=tooth_pos))
    
    dental_chart = DentalChart(patient_id=patient_id, teeth_records=teeth_records)
    chart_dict = prepare_for_mongo(dental_chart.dict())
    await db.dental_charts.insert_one(chart_dict)
    return dental_chart

@api_router.get("/patients/{patient_id}/dental-chart", response_model=DentalChart)
async def get_dental_chart(patient_id: str, current_user: User = Depends(get_current_user)):
    chart = await db.dental_charts.find_one({"patient_id": patient_id})
    if not chart:
        # Auto-create if doesn't exist
        return await create_dental_chart(patient_id, current_user)
    return DentalChart(**chart)

@api_router.put("/patients/{patient_id}/dental-chart/tooth/{tooth_position}")
async def update_tooth_record(
    patient_id: str, 
    tooth_position: ToothPosition, 
    tooth_data: ToothRecord, 
    current_user: User = Depends(get_current_user)
):
    chart = await db.dental_charts.find_one({"patient_id": patient_id})
    if not chart:
        raise HTTPException(status_code=404, detail="Fiche dentaire non trouvée")
    
    # Update specific tooth record
    tooth_dict = prepare_for_mongo(tooth_data.dict())
    await db.dental_charts.update_one(
        {"patient_id": patient_id, "teeth_records.tooth_position": tooth_position},
        {"$set": {"teeth_records.$": tooth_dict, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Dent mise à jour avec succès"}

# Invoice Routes
@api_router.post("/invoices", response_model=Invoice)
async def create_invoice(invoice_data: Invoice, current_user: User = Depends(get_current_user)):
    # Generate invoice number
    count = await db.invoices.count_documents({}) + 1
    invoice_data.invoice_number = f"FACT-{count:06d}"
    
    invoice_dict = prepare_for_mongo(invoice_data.dict())
    await db.invoices.insert_one(invoice_dict)
    return invoice_data

@api_router.get("/invoices", response_model=List[Invoice])
async def get_invoices(current_user: User = Depends(get_current_user)):
    invoices = await db.invoices.find().to_list(1000)
    return [Invoice(**invoice) for invoice in invoices]

@api_router.get("/invoices/{invoice_id}", response_model=Invoice)
async def get_invoice(invoice_id: str, current_user: User = Depends(get_current_user)):
    invoice = await db.invoices.find_one({"id": invoice_id})
    if not invoice:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    return Invoice(**invoice)

# Dashboard Stats
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    total_patients = await db.patients.count_documents({})
    total_invoices = await db.invoices.count_documents({})
    pending_payments = await db.invoices.count_documents({"payment_status": "pending"})
    
    # Calculate total revenue
    invoices = await db.invoices.find({"payment_status": "paid"}).to_list(1000)
    total_revenue = sum(invoice.get("total_mga", 0) for invoice in invoices)
    
    return {
        "total_patients": total_patients,
        "total_invoices": total_invoices,
        "pending_payments": pending_payments,
        "total_revenue_mga": total_revenue
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()