from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from enum import Enum
import bcrypt
import jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'cmgeorges-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Create the main app
app = FastAPI(title="CMGeorges API", version="1.0.0")

# Create routers
api_router = APIRouter(prefix="/api")
v1_router = APIRouter(prefix="/v1")
admin_router = APIRouter(prefix="/admin")

security = HTTPBearer()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== ENUMS ====================
class ServiceType(str, Enum):
    MANUAL = "manual"
    FURNITURE = "furniture"
    TECH = "tech"

class UrgencyLevel(str, Enum):
    NORMAL = "normal"
    URGENT = "urgent"

class LeadStatus(str, Enum):
    NEW = "new"
    CONTACTED = "contacted"
    QUOTED = "quoted"
    WON = "won"
    LOST = "lost"

class LeadSource(str, Enum):
    INSTAGRAM = "instagram"
    FACEBOOK = "facebook"
    GOOGLE = "google"
    REFERRAL = "referral"
    OTHER = "other"

class ItemType(str, Enum):
    BED = "bed"
    DRESSER = "dresser"
    DESK = "desk"
    WARDROBE = "wardrobe"
    SOFA = "sofa"
    TABLE = "table"
    CHAIR = "chair"
    SHELF = "shelf"
    OTHER = "other"

class ItemBrand(str, Enum):
    IKEA = "ikea"
    JYSK = "jysk"
    STRUCTUBE = "structube"
    WAYFAIR = "wayfair"
    OTHER = "other"

class UserRole(str, Enum):
    ADMIN = "admin"
    STAFF = "staff"

# ==================== MODELS ====================
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: UserRole = UserRole.STAFF

class UserCreate(UserBase):
    password: str

class User(UserBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = True

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

# Lead Item Model
class LeadItemBase(BaseModel):
    item_type: ItemType
    brand: ItemBrand
    model: str = ""
    quantity: int = 1
    wall_anchor_required: bool = False

class LeadItem(LeadItemBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))

# Lead Models
class LeadBase(BaseModel):
    full_name: str
    phone: str
    email: EmailStr
    service_type: ServiceType
    address: str = ""
    city: str = ""
    preferred_date: Optional[str] = None
    urgency_level: UrgencyLevel = UrgencyLevel.NORMAL
    description: str = ""
    source: LeadSource = LeadSource.OTHER

class LeadCreate(LeadBase):
    items: Optional[List[LeadItemBase]] = None

class Lead(LeadBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: LeadStatus = LeadStatus.NEW
    items: List[LeadItem] = []
    notes: str = ""

class LeadUpdate(BaseModel):
    status: Optional[LeadStatus] = None
    notes: Optional[str] = None

# Quote Line Model
class QuoteLineBase(BaseModel):
    description: str
    quantity: int = 1
    unit_price: float
    market_price: Optional[float] = None
    line_type: str = "material"  # material, labor, delivery, urgency, other

class QuoteLine(QuoteLineBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    line_total: float = 0

# Quote Models
class QuoteCreate(BaseModel):
    lead_id: str
    lines: List[QuoteLineBase]
    contingency_percent: float = 15.0  # 10-20%
    notes: str = ""
    delivery_fee: float = 0
    urgency_fee: float = 0

class Quote(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    lead_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    lines: List[QuoteLine] = []
    subtotal_material: float = 0
    subtotal_labor: float = 0
    delivery_fee: float = 0
    urgency_fee: float = 0
    subtotal_before_contingency: float = 0
    contingency_percent: float = 15.0
    contingency_amount: float = 0
    subtotal_before_tax: float = 0
    tps_rate: float = 5.0
    tps_amount: float = 0
    tvq_rate: float = 9.975
    tvq_amount: float = 0
    total_with_tax: float = 0
    market_price_total: float = 0
    cmgeorges_savings: float = 0
    notes: str = ""

# Portfolio Media
class PortfolioMedia(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    category: str = "portfolio"
    title: str
    description: str = ""
    image_url: str
    before_image_url: Optional[str] = None
    service_type: ServiceType = ServiceType.MANUAL
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Service Info
class ServiceInfo(BaseModel):
    id: str
    name: str
    description: str
    features: List[str]
    price_range: str
    icon: str
    service_type: ServiceType

# Stats
class DashboardStats(BaseModel):
    total_leads: int
    new_leads: int
    contacted_leads: int
    quoted_leads: int
    won_leads: int
    lost_leads: int
    total_quotes: int
    conversion_rate: float

# ==================== AUTH HELPERS ====================
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# ==================== PUBLIC ENDPOINTS ====================
@v1_router.post("/leads", response_model=Lead)
async def create_lead(lead_data: LeadCreate):
    """Create a new lead from the public form"""
    lead = Lead(**lead_data.model_dump(exclude={"items"}))
    
    if lead_data.items:
        lead.items = [LeadItem(**item.model_dump()) for item in lead_data.items]
    
    doc = lead.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.leads.insert_one(doc)
    
    # Create audit log
    await db.audit_logs.insert_one({
        "id": str(uuid.uuid4()),
        "action": "lead_created",
        "entity_type": "lead",
        "entity_id": lead.id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "details": {"source": lead.source, "service_type": lead.service_type}
    })
    
    return lead

@v1_router.get("/services", response_model=List[ServiceInfo])
async def get_services():
    """Get list of available services"""
    services = [
        ServiceInfo(
            id="deco-touche",
            name="Déco Touché",
            description="Peinture, entretien et rénovation légère pour transformer votre espace",
            features=["Peinture intérieure/extérieure", "Rénovation légère", "Entretien général", "Installation déco"],
            price_range="À partir de 250$",
            icon="paintbrush",
            service_type=ServiceType.MANUAL
        ),
        ServiceInfo(
            id="mobilier",
            name="Fourniture & Installation Mobilier",
            description="Service clé en main: fourniture, livraison, assemblage et installation sécuritaire",
            features=["Assemblage IKEA/JYSK", "Livraison incluse", "Ancrage mural sécuritaire", "Garantie installation"],
            price_range="À partir de 75$/meuble",
            icon="sofa",
            service_type=ServiceType.FURNITURE
        ),
        ServiceInfo(
            id="tech",
            name="CMGeorges Tech",
            description="Solutions web, développement et DevOps pour propulser votre entreprise",
            features=["Sites web sur mesure", "Applications web", "DevOps & Cloud", "Maintenance"],
            price_range="Sur devis",
            icon="code",
            service_type=ServiceType.TECH
        )
    ]
    return services

@v1_router.get("/portfolio", response_model=List[PortfolioMedia])
async def get_portfolio():
    """Get portfolio items"""
    portfolio = await db.portfolio_media.find({}, {"_id": 0}).to_list(100)
    return portfolio

# ==================== AUTH ENDPOINTS ====================
@v1_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    """Admin/Staff login"""
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="Account disabled")
    
    token = create_token(user["id"], user["email"], user["role"])
    
    # Remove password from response
    user_response = {k: v for k, v in user.items() if k != "password_hash"}
    
    return TokenResponse(access_token=token, user=user_response)

@v1_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    """Get current user info"""
    return user

# ==================== ADMIN ENDPOINTS ====================
@admin_router.get("/leads", response_model=List[Lead])
async def get_leads(
    status: Optional[LeadStatus] = None,
    service_type: Optional[ServiceType] = None,
    user: dict = Depends(get_current_user)
):
    """Get all leads with optional filters"""
    query = {}
    if status:
        query["status"] = status
    if service_type:
        query["service_type"] = service_type
    
    leads = await db.leads.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for lead in leads:
        if isinstance(lead.get('created_at'), str):
            lead['created_at'] = datetime.fromisoformat(lead['created_at'])
    
    return leads

@admin_router.get("/leads/{lead_id}", response_model=Lead)
async def get_lead(lead_id: str, user: dict = Depends(get_current_user)):
    """Get a specific lead"""
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    if isinstance(lead.get('created_at'), str):
        lead['created_at'] = datetime.fromisoformat(lead['created_at'])
    
    return lead

@admin_router.patch("/leads/{lead_id}", response_model=Lead)
async def update_lead(lead_id: str, update: LeadUpdate, user: dict = Depends(get_current_user)):
    """Update lead status or notes"""
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    result = await db.leads.update_one({"id": lead_id}, {"$set": update_data})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Audit log
    await db.audit_logs.insert_one({
        "id": str(uuid.uuid4()),
        "action": "lead_updated",
        "entity_type": "lead",
        "entity_id": lead_id,
        "user_id": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "details": update_data
    })
    
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if isinstance(lead.get('created_at'), str):
        lead['created_at'] = datetime.fromisoformat(lead['created_at'])
    return lead

@admin_router.post("/quotes", response_model=Quote)
async def create_quote(quote_data: QuoteCreate, user: dict = Depends(get_current_user)):
    """Generate a quote for a lead with automatic calculations"""
    # Verify lead exists
    lead = await db.leads.find_one({"id": quote_data.lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Ensure contingency is within 10-20%
    contingency = max(10.0, min(20.0, quote_data.contingency_percent))
    
    # Process lines
    lines = []
    subtotal_material = 0
    subtotal_labor = 0
    market_price_total = 0
    
    for line_data in quote_data.lines:
        line = QuoteLine(**line_data.model_dump())
        line.line_total = line.quantity * line.unit_price
        lines.append(line)
        
        if line.line_type == "material":
            subtotal_material += line.line_total
            if line.market_price:
                market_price_total += line.quantity * line.market_price
        elif line.line_type == "labor":
            subtotal_labor += line.line_total
    
    # Calculate totals
    subtotal_before_contingency = subtotal_material + subtotal_labor + quote_data.delivery_fee + quote_data.urgency_fee
    contingency_amount = subtotal_before_contingency * (contingency / 100)
    subtotal_before_tax = subtotal_before_contingency + contingency_amount
    
    # Canadian taxes
    tps_amount = subtotal_before_tax * 0.05
    tvq_amount = subtotal_before_tax * 0.09975
    total_with_tax = subtotal_before_tax + tps_amount + tvq_amount
    
    # Calculate savings (if market price provided)
    cmgeorges_savings = market_price_total - subtotal_material if market_price_total > subtotal_material else 0
    
    quote = Quote(
        lead_id=quote_data.lead_id,
        lines=[l.model_dump() for l in lines],
        subtotal_material=round(subtotal_material, 2),
        subtotal_labor=round(subtotal_labor, 2),
        delivery_fee=round(quote_data.delivery_fee, 2),
        urgency_fee=round(quote_data.urgency_fee, 2),
        subtotal_before_contingency=round(subtotal_before_contingency, 2),
        contingency_percent=contingency,
        contingency_amount=round(contingency_amount, 2),
        subtotal_before_tax=round(subtotal_before_tax, 2),
        tps_amount=round(tps_amount, 2),
        tvq_amount=round(tvq_amount, 2),
        total_with_tax=round(total_with_tax, 2),
        market_price_total=round(market_price_total, 2),
        cmgeorges_savings=round(cmgeorges_savings, 2),
        notes=quote_data.notes
    )
    
    doc = quote.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.quotes.insert_one(doc)
    
    # Update lead status to quoted
    await db.leads.update_one({"id": quote_data.lead_id}, {"$set": {"status": "quoted"}})
    
    # Audit log
    await db.audit_logs.insert_one({
        "id": str(uuid.uuid4()),
        "action": "quote_created",
        "entity_type": "quote",
        "entity_id": quote.id,
        "user_id": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "details": {"lead_id": quote_data.lead_id, "total": quote.total_with_tax}
    })
    
    return quote

@admin_router.get("/quotes", response_model=List[Quote])
async def get_quotes(lead_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    """Get all quotes, optionally filtered by lead"""
    query = {}
    if lead_id:
        query["lead_id"] = lead_id
    
    quotes = await db.quotes.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for quote in quotes:
        if isinstance(quote.get('created_at'), str):
            quote['created_at'] = datetime.fromisoformat(quote['created_at'])
    
    return quotes

@admin_router.get("/quotes/{quote_id}", response_model=Quote)
async def get_quote(quote_id: str, user: dict = Depends(get_current_user)):
    """Get a specific quote"""
    quote = await db.quotes.find_one({"id": quote_id}, {"_id": 0})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    if isinstance(quote.get('created_at'), str):
        quote['created_at'] = datetime.fromisoformat(quote['created_at'])
    
    return quote

@admin_router.get("/stats", response_model=DashboardStats)
async def get_stats(user: dict = Depends(get_current_user)):
    """Get dashboard statistics"""
    total_leads = await db.leads.count_documents({})
    new_leads = await db.leads.count_documents({"status": "new"})
    contacted_leads = await db.leads.count_documents({"status": "contacted"})
    quoted_leads = await db.leads.count_documents({"status": "quoted"})
    won_leads = await db.leads.count_documents({"status": "won"})
    lost_leads = await db.leads.count_documents({"status": "lost"})
    total_quotes = await db.quotes.count_documents({})
    
    conversion_rate = (won_leads / total_leads * 100) if total_leads > 0 else 0
    
    return DashboardStats(
        total_leads=total_leads,
        new_leads=new_leads,
        contacted_leads=contacted_leads,
        quoted_leads=quoted_leads,
        won_leads=won_leads,
        lost_leads=lost_leads,
        total_quotes=total_quotes,
        conversion_rate=round(conversion_rate, 1)
    )

# ==================== HEALTH CHECK ====================
@api_router.get("/healthz")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# ==================== SEED DATA ====================
@api_router.post("/seed")
async def seed_database():
    """Seed the database with initial data (dev only)"""
    # Check if already seeded
    existing_admin = await db.users.find_one({"email": "admin@cmgeorges.com"})
    if existing_admin:
        return {"message": "Database already seeded"}
    
    # Create admin user
    admin_user = {
        "id": str(uuid.uuid4()),
        "email": "admin@cmgeorges.com",
        "full_name": "Admin CMGeorges",
        "role": "admin",
        "password_hash": hash_password("admin123"),
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(admin_user)
    
    # Create staff user
    staff_user = {
        "id": str(uuid.uuid4()),
        "email": "staff@cmgeorges.com",
        "full_name": "Staff Member",
        "role": "staff",
        "password_hash": hash_password("staff123"),
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(staff_user)
    
    # Create sample leads
    leads_data = [
        {
            "id": str(uuid.uuid4()),
            "full_name": "Marie Tremblay",
            "phone": "514-555-1234",
            "email": "marie.t@example.com",
            "service_type": "manual",
            "address": "123 Rue Principale",
            "city": "Montréal",
            "urgency_level": "normal",
            "description": "Peinture salon et cuisine, environ 400 pieds carrés",
            "status": "new",
            "source": "google",
            "items": [],
            "notes": "",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "full_name": "Jean-Pierre Lavoie",
            "phone": "450-555-5678",
            "email": "jp.lavoie@example.com",
            "service_type": "furniture",
            "address": "456 Boulevard Test",
            "city": "Longueuil",
            "urgency_level": "urgent",
            "description": "Assemblage meubles IKEA pour nouvelle maison",
            "status": "contacted",
            "source": "referral",
            "items": [
                {"id": str(uuid.uuid4()), "item_type": "bed", "brand": "ikea", "model": "MALM", "quantity": 2, "wall_anchor_required": False},
                {"id": str(uuid.uuid4()), "item_type": "wardrobe", "brand": "ikea", "model": "PAX", "quantity": 1, "wall_anchor_required": True},
                {"id": str(uuid.uuid4()), "item_type": "dresser", "brand": "ikea", "model": "HEMNES", "quantity": 2, "wall_anchor_required": True}
            ],
            "notes": "Client pressé, emménagement la semaine prochaine",
            "created_at": (datetime.now(timezone.utc) - timedelta(days=2)).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "full_name": "Sophie Martin",
            "phone": "514-555-9012",
            "email": "sophie.m@example.com",
            "service_type": "tech",
            "address": "",
            "city": "Montréal",
            "urgency_level": "normal",
            "description": "Création site web pour mon entreprise de consultation",
            "status": "quoted",
            "source": "instagram",
            "items": [],
            "notes": "Budget environ 3000-5000$",
            "created_at": (datetime.now(timezone.utc) - timedelta(days=5)).isoformat()
        }
    ]
    await db.leads.insert_many(leads_data)
    
    # Create sample portfolio items
    portfolio_data = [
        {
            "id": str(uuid.uuid4()),
            "category": "portfolio",
            "title": "Rénovation Salon Moderne",
            "description": "Transformation complète d'un salon avec peinture et finitions",
            "image_url": "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800",
            "before_image_url": "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800",
            "service_type": "manual",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "category": "portfolio",
            "title": "Installation Mobilier IKEA",
            "description": "Assemblage et installation sécuritaire de chambre complète",
            "image_url": "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800",
            "before_image_url": None,
            "service_type": "furniture",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "category": "portfolio",
            "title": "Site Web E-commerce",
            "description": "Développement d'une boutique en ligne moderne",
            "image_url": "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800",
            "before_image_url": None,
            "service_type": "tech",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    await db.portfolio_media.insert_many(portfolio_data)
    
    # Create a sample quote
    sample_quote = {
        "id": str(uuid.uuid4()),
        "lead_id": leads_data[1]["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "lines": [
            {"id": str(uuid.uuid4()), "description": "Assemblage lit MALM x2", "quantity": 2, "unit_price": 75, "market_price": 150, "line_type": "labor", "line_total": 150},
            {"id": str(uuid.uuid4()), "description": "Assemblage garde-robe PAX", "quantity": 1, "unit_price": 150, "market_price": 250, "line_type": "labor", "line_total": 150},
            {"id": str(uuid.uuid4()), "description": "Assemblage commode HEMNES x2", "quantity": 2, "unit_price": 65, "market_price": 100, "line_type": "labor", "line_total": 130},
            {"id": str(uuid.uuid4()), "description": "Kit ancrage mural", "quantity": 3, "unit_price": 25, "market_price": 40, "line_type": "material", "line_total": 75}
        ],
        "subtotal_material": 75,
        "subtotal_labor": 430,
        "delivery_fee": 50,
        "urgency_fee": 100,
        "subtotal_before_contingency": 655,
        "contingency_percent": 15,
        "contingency_amount": 98.25,
        "subtotal_before_tax": 753.25,
        "tps_rate": 5.0,
        "tps_amount": 37.66,
        "tvq_rate": 9.975,
        "tvq_amount": 75.14,
        "total_with_tax": 866.05,
        "market_price_total": 120,
        "cmgeorges_savings": 45,
        "notes": "Prix incluant urgence et déplacement Longueuil"
    }
    await db.quotes.insert_one(sample_quote)
    
    return {"message": "Database seeded successfully", "admin_email": "admin@cmgeorges.com", "admin_password": "admin123"}

# Include routers
v1_router.include_router(admin_router)
api_router.include_router(v1_router)
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
