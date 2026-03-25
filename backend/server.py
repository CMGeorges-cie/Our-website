from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Request, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import HTMLResponse, StreamingResponse
from dotenv import load_dotenv
from io import BytesIO
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
import secrets
import hashlib
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
import httpx
import resend
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
from enum import Enum
import bcrypt
import jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
APP_ENV = os.environ.get('APP_ENV', 'development').lower()

if APP_ENV == 'development':
    default_mongo_url = 'mongodb://localhost:27017'
    default_db_name = 'our_website_dev'
else:
    default_mongo_url = 'mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/?retryWrites=true&w=majority'
    default_db_name = 'our_website_prod'

mongo_url = os.environ.get('MONGO_URL', default_mongo_url)
client = AsyncIOMotorClient(mongo_url)

db_name = os.environ.get('DB_NAME', default_db_name)
if not db_name:
    raise RuntimeError('DB_NAME environment variable is required')

db = client[db_name]

# Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'cmgeorges-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
JWT_ACCESS_EXPIRATION_HOURS = 1
JWT_REFRESH_EXPIRATION_DAYS = 7

# Resend Configuration
resend.api_key = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'cmgeorges.cie@gmail.com')

# reCAPTCHA Configuration
RECAPTCHA_SECRET_KEY = os.environ.get('RECAPTCHA_SECRET_KEY', '')

# Create the main app
app = FastAPI(title="CMGeorges API", version="2.0.0", description="API production CMGeorges")

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
    WEBSITE = "website"
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

class ClientStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    PROSPECT = "prospect"

class InvoiceStatus(str, Enum):
    DRAFT = "draft"
    SENT = "sent"
    PAID = "paid"
    PARTIAL = "partial"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"

class ProjectStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ON_HOLD = "on_hold"
    CANCELLED = "cancelled"

class PaymentMethod(str, Enum):
    CASH = "cash"
    ETRANSFER = "etransfer"
    CREDIT_CARD = "credit_card"
    CHEQUE = "cheque"
    OTHER = "other"

# ==================== PRICING CONFIG ====================
PRICING_CONFIG = {
    "manual": {
        "peinture": {
            "3_5": {"base": 450, "description": "Peinture 3½ pièces"},
            "4_5": {"base": 550, "description": "Peinture 4½ pièces"},
            "5_5": {"base": 700, "description": "Peinture 5½ pièces"},
            "par_piece": {"base": 150, "description": "Peinture par pièce additionnelle"}
        },
        "plancher": {"rate_per_sqft": 2.25, "description": "Installation plancher ($/pi²)"},
        "tv_murale": {"base": 120, "description": "Installation TV murale"},
        "urgence": {"base": 100, "hourly_premium": 25, "description": "Service d'urgence"},
        "entretien": {"hourly": 45, "description": "Entretien général ($/h)"},
        "renovation_legere": {"hourly": 55, "description": "Rénovation légère ($/h)"}
    },
    "furniture": {
        "bed_simple": {"base": 75, "market": 120},
        "bed_queen_king": {"base": 95, "market": 150},
        "bed_storage": {"base": 125, "market": 200},
        "dresser": {"base": 65, "market": 100},
        "wardrobe_single": {"base": 100, "market": 175},
        "wardrobe_multi": {"base": 175, "market": 300},
        "desk": {"base": 60, "market": 95},
        "table": {"base": 60, "market": 95},
        "shelf": {"base": 50, "market": 80},
        "sofa": {"base": 75, "market": 120},
        "wall_anchor": {"base": 25, "market": 50},
        "delivery_base": {"base": 50, "description": "Livraison base Montréal"}
    },
    "tech": {
        "hourly_rate": 70,
        "site_vitrine": {"base": 1500, "description": "Site vitrine professionnel"},
        "site_ecommerce": {"base": 3500, "description": "Site e-commerce complet"},
        "application_web": {"base": 5000, "description": "Application web sur mesure"},
        "audit_devops": {"base": 500, "description": "Audit DevOps/Cloud"},
        "maintenance_monthly": {"base": 150, "description": "Maintenance mensuelle"}
    },
    "margins": {
        "manual_target": 0.55,  # 50-60%
        "tech_target": 0.70,    # 60-75%
        "furniture_target": 0.45
    },
    "taxes": {
        "tps_rate": 0.05,
        "tvq_rate": 0.09975
    },
    "payment_terms": {
        "deposit": 0.30,
        "milestone": 0.30,
        "final": 0.40
    }
}

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
    refresh_token: str
    token_type: str = "bearer"
    user: dict

class RefreshTokenRequest(BaseModel):
    refresh_token: str

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
    source: LeadSource = LeadSource.WEBSITE
    recaptcha_token: Optional[str] = None

class LeadCreate(LeadBase):
    items: Optional[List[LeadItemBase]] = None

class Lead(LeadBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: LeadStatus = LeadStatus.NEW
    items: List[LeadItem] = []
    notes: str = ""
    client_id: Optional[str] = None

class LeadUpdate(BaseModel):
    status: Optional[LeadStatus] = None
    notes: Optional[str] = None
    client_id: Optional[str] = None

# Client Model
class ClientBase(BaseModel):
    full_name: str
    email: EmailStr
    phone: str
    address: str = ""
    city: str = ""
    postal_code: str = ""
    company_name: Optional[str] = None
    notes: str = ""

class ClientCreate(ClientBase):
    pass

class Client(ClientBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: ClientStatus = ClientStatus.ACTIVE
    total_revenue: float = 0
    total_projects: int = 0
    lead_id: Optional[str] = None

class ClientUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
    company_name: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[ClientStatus] = None

# Quote Line Model
class QuoteLineBase(BaseModel):
    description: str
    quantity: int = 1
    unit_price: float
    market_price: Optional[float] = None
    line_type: str = "labor"
    cost_price: Optional[float] = None  # For margin calculation

class QuoteLine(QuoteLineBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    line_total: float = 0
    margin_amount: float = 0

# Quote Models
class QuoteCreate(BaseModel):
    lead_id: str
    lines: List[QuoteLineBase]
    contingency_percent: float = 15.0
    notes: str = ""
    delivery_fee: float = 0
    urgency_fee: float = 0
    validity_days: int = 30

class Quote(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    lead_id: str
    client_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    valid_until: datetime = Field(default_factory=lambda: datetime.now(timezone.utc) + timedelta(days=30))
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
    total_cost: float = 0
    gross_margin: float = 0
    margin_percent: float = 0
    deposit_amount: float = 0
    milestone_amount: float = 0
    final_amount: float = 0
    notes: str = ""
    status: str = "draft"

# Invoice Models
class InvoiceLineBase(BaseModel):
    description: str
    quantity: int = 1
    unit_price: float
    line_type: str = "service"

class InvoiceLine(InvoiceLineBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    line_total: float = 0

class InvoiceCreate(BaseModel):
    client_id: str
    quote_id: Optional[str] = None
    project_id: Optional[str] = None
    lines: List[InvoiceLineBase]
    notes: str = ""
    due_date: Optional[str] = None
    payment_terms: str = "Net 30"

class Invoice(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invoice_number: str = ""
    client_id: str
    quote_id: Optional[str] = None
    project_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    due_date: Optional[datetime] = None
    lines: List[InvoiceLine] = []
    subtotal: float = 0
    tps_amount: float = 0
    tvq_amount: float = 0
    total: float = 0
    amount_paid: float = 0
    balance_due: float = 0
    status: InvoiceStatus = InvoiceStatus.DRAFT
    payment_terms: str = "Net 30"
    notes: str = ""
    payments: List[dict] = []

class InvoiceUpdate(BaseModel):
    status: Optional[InvoiceStatus] = None
    notes: Optional[str] = None
    due_date: Optional[str] = None

class PaymentCreate(BaseModel):
    amount: float
    method: PaymentMethod
    notes: str = ""

# Project Models
class ProjectCreate(BaseModel):
    client_id: str
    quote_id: Optional[str] = None
    title: str
    description: str = ""
    service_type: ServiceType
    scheduled_date: Optional[str] = None
    estimated_hours: Optional[float] = None

class Project(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_id: str
    quote_id: Optional[str] = None
    invoice_id: Optional[str] = None
    title: str
    description: str = ""
    service_type: ServiceType
    status: ProjectStatus = ProjectStatus.PENDING
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    scheduled_date: Optional[datetime] = None
    completed_date: Optional[datetime] = None
    estimated_hours: Optional[float] = None
    actual_hours: Optional[float] = None
    total_revenue: float = 0
    total_cost: float = 0
    notes: str = ""

class ProjectUpdate(BaseModel):
    status: Optional[ProjectStatus] = None
    scheduled_date: Optional[str] = None
    completed_date: Optional[str] = None
    actual_hours: Optional[float] = None
    notes: Optional[str] = None

# Audit Log
class AuditLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    action: str
    entity_type: str
    entity_id: str
    user_id: Optional[str] = None
    user_email: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    details: dict = {}
    ip_address: Optional[str] = None

# Contact Form
class ContactForm(BaseModel):
    name: str
    email: EmailStr
    phone: str = ""
    subject: str
    message: str
    recaptcha_token: Optional[str] = None

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
    total_clients: int
    total_invoices: int
    total_projects: int
    conversion_rate: float

class CEODashboard(BaseModel):
    monthly_revenue: float
    monthly_costs: float
    monthly_profit: float
    average_margin_manual: float
    average_margin_tech: float
    top_services: List[dict]
    revenue_by_month: List[dict]
    pending_invoices_amount: float
    projects_in_progress: int
    conversion_rate: float

# ==================== BLOG MODELS ====================
class BlogPostStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"

class BlogPostBase(BaseModel):
    title: str
    slug: str
    excerpt: str = ""
    content: str
    featured_image: Optional[str] = None
    category: str = "general"
    tags: List[str] = []
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None

class BlogPostCreate(BlogPostBase):
    pass

class BlogPost(BlogPostBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: BlogPostStatus = BlogPostStatus.DRAFT
    author_id: Optional[str] = None
    author_name: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    published_at: Optional[datetime] = None
    view_count: int = 0

class BlogPostUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    excerpt: Optional[str] = None
    content: Optional[str] = None
    featured_image: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    status: Optional[BlogPostStatus] = None
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None

# ==================== CLIENT PORTAL MODELS ====================
class ClientPortalAccess(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_id: str
    email: EmailStr
    access_token: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc) + timedelta(days=30))
    is_active: bool = True

class ClientPortalLogin(BaseModel):
    email: EmailStr
    token: str

class ClientPortalData(BaseModel):
    client: dict
    quotes: List[dict]
    invoices: List[dict]
    projects: List[dict]

# ==================== DISCOUNT CODES MODELS ====================
class DiscountType(str, Enum):
    PERCENTAGE = "percentage"
    FIXED = "fixed"

class DiscountCodeBase(BaseModel):
    code: str
    description: str = ""
    discount_type: DiscountType = DiscountType.PERCENTAGE
    discount_value: float  # Percentage (0-100) or fixed amount
    min_order_amount: float = 0
    max_uses: Optional[int] = None
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    applicable_services: List[str] = []  # Empty = all services

class DiscountCodeCreate(DiscountCodeBase):
    pass

class DiscountCode(DiscountCodeBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    is_active: bool = True
    times_used: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DiscountCodeUpdate(BaseModel):
    description: Optional[str] = None
    discount_type: Optional[DiscountType] = None
    discount_value: Optional[float] = None
    min_order_amount: Optional[float] = None
    max_uses: Optional[int] = None
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    applicable_services: Optional[List[str]] = None
    is_active: Optional[bool] = None

# ==================== PRICING MODELS ====================
class PricingItemBase(BaseModel):
    name: str
    description: str = ""
    service_type: str  # manual, furniture, tech
    category: str = "general"
    unit: str = "unité"  # unité, heure, pied carré, etc.
    base_price: float
    min_price: Optional[float] = None
    max_price: Optional[float] = None

class PricingItemCreate(PricingItemBase):
    pass

class PricingItem(PricingItemBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PricingItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    base_price: Optional[float] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    is_active: Optional[bool] = None

# ==================== POLICIES MODELS ====================
class PolicyType(str, Enum):
    TERMS = "terms"
    PRIVACY = "privacy"
    WARRANTY = "warranty"
    CANCELLATION = "cancellation"
    PAYMENT = "payment"

class PolicyBase(BaseModel):
    policy_type: PolicyType
    title: str
    content: str
    version: str = "1.0"

class PolicyCreate(PolicyBase):
    pass

class Policy(PolicyBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PolicyUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    version: Optional[str] = None
    is_active: Optional[bool] = None

# ==================== AUTH HELPERS ====================
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_ACCESS_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "type": "refresh",
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_REFRESH_EXPIRATION_DAYS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
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

# ==================== EMAIL HELPERS ====================
async def send_email(to: str, subject: str, html_content: str):
    """Send email via Resend"""
    if not resend.api_key:
        logger.warning("Resend API key not configured, skipping email")
        return None
    
    try:
        params = {
            "from": SENDER_EMAIL,
            "to": [to],
            "subject": subject,
            "html": html_content
        }
        result = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Email sent to {to}: {result}")
        return result
    except Exception as e:
        logger.error(f"Failed to send email to {to}: {str(e)}")
        return None

def get_lead_notification_html(lead: dict) -> str:
    """Generate HTML email for new lead notification"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .header {{ background: #1a365d; color: white; padding: 20px; text-align: center; }}
            .content {{ padding: 20px; }}
            .label {{ font-weight: bold; color: #1a365d; }}
            .urgent {{ color: #dc2626; font-weight: bold; }}
            .footer {{ background: #f8fafc; padding: 15px; text-align: center; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🦁 CMGeorges - Nouvelle demande!</h1>
        </div>
        <div class="content">
            <h2>Nouveau lead reçu</h2>
            <p><span class="label">Nom:</span> {lead.get('full_name', 'N/A')}</p>
            <p><span class="label">Email:</span> {lead.get('email', 'N/A')}</p>
            <p><span class="label">Téléphone:</span> {lead.get('phone', 'N/A')}</p>
            <p><span class="label">Service:</span> {lead.get('service_type', 'N/A')}</p>
            <p><span class="label">Ville:</span> {lead.get('city', 'N/A')}</p>
            <p><span class="label">Urgence:</span> {'<span class="urgent">URGENT</span>' if lead.get('urgency_level') == 'urgent' else 'Normal'}</p>
            <p><span class="label">Description:</span></p>
            <p>{lead.get('description', 'Aucune description')}</p>
            {f"<p><span class='label'>Meubles:</span> {len(lead.get('items', []))} article(s)</p>" if lead.get('items') else ""}
        </div>
        <div class="footer">
            <p>Connectez-vous à l'admin pour gérer ce lead.</p>
            <p>CMGeorges - Montréal & Rive-Sud | 514-386-1743</p>
        </div>
    </body>
    </html>
    """

def get_lead_confirmation_html(lead: dict) -> str:
    """Generate HTML email for lead confirmation to client"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .header {{ background: #1a365d; color: white; padding: 20px; text-align: center; }}
            .header h1 {{ color: #d4af37; margin: 0; }}
            .content {{ padding: 30px; }}
            .highlight {{ background: #f8fafc; padding: 15px; border-left: 4px solid #d4af37; margin: 20px 0; }}
            .footer {{ background: #1a365d; color: white; padding: 20px; text-align: center; }}
            .cta {{ display: inline-block; background: #d4af37; color: #1a365d; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 5px; }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🦁 CMGeorges</h1>
            <p>Montréal & Rive-Sud</p>
        </div>
        <div class="content">
            <h2>Bonjour {lead.get('full_name', '').split()[0]}!</h2>
            <p>Merci pour votre demande de soumission. Nous l'avons bien reçue et nous vous contacterons dans les plus brefs délais.</p>
            
            <div class="highlight">
                <strong>Récapitulatif de votre demande:</strong><br>
                Service: {lead.get('service_type', 'N/A').replace('manual', 'Déco Touché').replace('furniture', 'Mobilier').replace('tech', 'Tech')}<br>
                {'Urgence: URGENT<br>' if lead.get('urgency_level') == 'urgent' else ''}
            </div>
            
            <p>Un membre de notre équipe vous contactera sous 24h pour discuter de votre projet.</p>
            
            <p>En attendant, n'hésitez pas à nous appeler:</p>
            <p style="text-align: center;">
                <a href="tel:+15143861743" class="cta">📞 514-386-1743</a>
            </p>
        </div>
        <div class="footer">
            <p>CMGeorges - Votre partenaire pour tous vos projets</p>
            <p>cmgeorges.cie@gmail.com | 514-386-1743</p>
        </div>
    </body>
    </html>
    """

# ==================== RECAPTCHA HELPER ====================
async def verify_recaptcha(token: str) -> bool:
    """Verify reCAPTCHA token"""
    if not RECAPTCHA_SECRET_KEY:
        logger.warning("reCAPTCHA secret key not configured, skipping verification")
        return True
    
    if not token:
        return False
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://www.google.com/recaptcha/api/siteverify",
                data={
                    "secret": RECAPTCHA_SECRET_KEY,
                    "response": token
                }
            )
            result = response.json()
            return result.get("success", False) and result.get("score", 0) >= 0.5
    except Exception as e:
        logger.error(f"reCAPTCHA verification failed: {str(e)}")
        return False

# ==================== AUDIT LOG HELPER ====================
async def create_audit_log(action: str, entity_type: str, entity_id: str, user: dict = None, details: dict = None, request: Request = None):
    """Create an audit log entry"""
    log = AuditLog(
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        user_id=user.get("id") if user else None,
        user_email=user.get("email") if user else None,
        details=details or {},
        ip_address=request.client.host if request else None
    )
    doc = log.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.audit_logs.insert_one(doc)

# ==================== INVOICE NUMBER HELPER ====================
async def get_next_invoice_number() -> str:
    """Generate next invoice number"""
    year = datetime.now().year
    prefix = f"CMG-{year}-"
    
    # Find the last invoice of the year
    last_invoice = await db.invoices.find_one(
        {"invoice_number": {"$regex": f"^{prefix}"}},
        {"_id": 0, "invoice_number": 1},
        sort=[("invoice_number", -1)]
    )
    
    if last_invoice:
        last_num = int(last_invoice["invoice_number"].split("-")[-1])
        return f"{prefix}{str(last_num + 1).zfill(4)}"
    
    return f"{prefix}0001"

# ==================== PUBLIC ENDPOINTS ====================
@v1_router.post("/leads", response_model=Lead)
async def create_lead(lead_data: LeadCreate, background_tasks: BackgroundTasks, request: Request):
    """Create a new lead from the public form"""
    # Verify reCAPTCHA
    if lead_data.recaptcha_token:
        is_valid = await verify_recaptcha(lead_data.recaptcha_token)
        if not is_valid:
            raise HTTPException(status_code=400, detail="reCAPTCHA verification failed")
    
    lead = Lead(**lead_data.model_dump(exclude={"items", "recaptcha_token"}))
    
    if lead_data.items:
        lead.items = [LeadItem(**item.model_dump()) for item in lead_data.items]
    
    doc = lead.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.leads.insert_one(doc)
    
    # Create audit log
    await create_audit_log("lead_created", "lead", lead.id, details={"source": lead.source, "service_type": lead.service_type}, request=request)
    
    # Send notification emails in background
    lead_dict = doc
    background_tasks.add_task(send_email, ADMIN_EMAIL, f"🦁 Nouveau lead: {lead.full_name}", get_lead_notification_html(lead_dict))
    background_tasks.add_task(send_email, lead.email, "CMGeorges - Confirmation de votre demande", get_lead_confirmation_html(lead_dict))
    
    return lead

@v1_router.post("/contact")
async def submit_contact(form: ContactForm, background_tasks: BackgroundTasks, request: Request):
    """Handle contact form submission"""
    # Verify reCAPTCHA
    if form.recaptcha_token:
        is_valid = await verify_recaptcha(form.recaptcha_token)
        if not is_valid:
            raise HTTPException(status_code=400, detail="reCAPTCHA verification failed")
    
    # Save to database
    contact_doc = {
        "id": str(uuid.uuid4()),
        "name": form.name,
        "email": form.email,
        "phone": form.phone,
        "subject": form.subject,
        "message": form.message,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "new"
    }
    await db.contact_messages.insert_one(contact_doc)
    
    # Send notification email
    html_content = f"""
    <h2>Nouveau message de contact</h2>
    <p><strong>De:</strong> {form.name} ({form.email})</p>
    <p><strong>Téléphone:</strong> {form.phone or 'Non fourni'}</p>
    <p><strong>Sujet:</strong> {form.subject}</p>
    <p><strong>Message:</strong></p>
    <p>{form.message}</p>
    """
    background_tasks.add_task(send_email, ADMIN_EMAIL, f"Contact CMGeorges: {form.subject}", html_content)
    
    return {"message": "Message envoyé avec succès"}

@v1_router.get("/services", response_model=List[ServiceInfo])
async def get_services():
    """Get list of available services"""
    services = [
        ServiceInfo(
            id="deco-touche",
            name="Déco Touché",
            description="Peinture, entretien et rénovation légère pour transformer votre espace",
            features=["Peinture intérieure/extérieure", "Rénovation légère", "Entretien général", "Installation déco", "TV murale"],
            price_range="À partir de 150$",
            icon="paintbrush",
            service_type=ServiceType.MANUAL
        ),
        ServiceInfo(
            id="mobilier",
            name="Fourniture & Installation Mobilier",
            description="Service clé en main: fourniture, livraison, assemblage et installation sécuritaire",
            features=["Assemblage IKEA/JYSK", "Livraison incluse", "Ancrage mural sécuritaire", "Garantie installation"],
            price_range="À partir de 50$/meuble",
            icon="sofa",
            service_type=ServiceType.FURNITURE
        ),
        ServiceInfo(
            id="tech",
            name="CMGeorges Tech",
            description="Solutions web, développement et DevOps pour propulser votre entreprise",
            features=["Sites web sur mesure", "Applications web", "DevOps & Cloud", "Maintenance"],
            price_range="70$/h ou forfait",
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

@v1_router.get("/pricing")
async def get_pricing():
    """Get public pricing info"""
    return {
        "manual": {
            "peinture_3_5": "À partir de 450$",
            "peinture_4_5": "À partir de 550$",
            "peinture_5_5": "À partir de 700$",
            "tv_murale": "À partir de 120$",
            "entretien": "45$/heure"
        },
        "furniture": {
            "lit_simple": "À partir de 75$",
            "commode": "À partir de 65$",
            "garde_robe": "À partir de 100$",
            "ancrage_mural": "25$/meuble",
            "livraison": "À partir de 50$"
        },
        "tech": {
            "taux_horaire": "70$/heure",
            "site_vitrine": "À partir de 1500$",
            "site_ecommerce": "À partir de 3500$",
            "maintenance": "150$/mois"
        }
    }

# ==================== AUTH ENDPOINTS ====================
@v1_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin, request: Request):
    """Admin/Staff login"""
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="Account disabled")
    
    access_token = create_access_token(user["id"], user["email"], user["role"])
    refresh_token = create_refresh_token(user["id"])
    
    # Audit log
    await create_audit_log("user_login", "user", user["id"], user=user, request=request)
    
    user_response = {k: v for k, v in user.items() if k != "password_hash"}
    
    return TokenResponse(access_token=access_token, refresh_token=refresh_token, user=user_response)

@v1_router.post("/auth/refresh", response_model=TokenResponse)
async def refresh_token(request: RefreshTokenRequest):
    """Refresh access token"""
    try:
        payload = jwt.decode(request.refresh_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        access_token = create_access_token(user["id"], user["email"], user["role"])
        new_refresh_token = create_refresh_token(user["id"])
        
        user_response = {k: v for k, v in user.items() if k != "password_hash"}
        
        return TokenResponse(access_token=access_token, refresh_token=new_refresh_token, user=user_response)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

@v1_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    """Get current user info"""
    return user

# ==================== ADMIN LEADS ENDPOINTS ====================
@admin_router.get("/leads", response_model=List[Lead])
async def get_leads(
    status: Optional[LeadStatus] = None,
    service_type: Optional[ServiceType] = None,
    skip: int = 0,
    limit: int = 100,
    user: dict = Depends(get_current_user)
):
    """Get all leads with optional filters and pagination"""
    query = {}
    if status:
        query["status"] = status
    if service_type:
        query["service_type"] = service_type
    
    leads = await db.leads.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(min(limit, 500)).to_list(min(limit, 500))
    
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
async def update_lead(lead_id: str, update: LeadUpdate, request: Request, user: dict = Depends(get_current_user)):
    """Update lead status or notes"""
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    result = await db.leads.update_one({"id": lead_id}, {"$set": update_data})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    await create_audit_log("lead_updated", "lead", lead_id, user=user, details=update_data, request=request)
    
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if isinstance(lead.get('created_at'), str):
        lead['created_at'] = datetime.fromisoformat(lead['created_at'])
    return lead

@admin_router.post("/leads/{lead_id}/convert-to-client", response_model=Client)
async def convert_lead_to_client(lead_id: str, request: Request, user: dict = Depends(get_current_user)):
    """Convert a lead to a client"""
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Check if already converted
    if lead.get("client_id"):
        existing_client = await db.clients.find_one({"id": lead["client_id"]}, {"_id": 0})
        if existing_client:
            return existing_client
    
    # Create client from lead
    client = Client(
        full_name=lead["full_name"],
        email=lead["email"],
        phone=lead["phone"],
        address=lead.get("address", ""),
        city=lead.get("city", ""),
        lead_id=lead_id
    )
    
    doc = client.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.clients.insert_one(doc)
    
    # Update lead with client_id
    await db.leads.update_one({"id": lead_id}, {"$set": {"client_id": client.id, "status": "won"}})
    
    await create_audit_log("lead_converted_to_client", "client", client.id, user=user, details={"lead_id": lead_id}, request=request)
    
    return client

# ==================== ADMIN CLIENTS ENDPOINTS ====================
@admin_router.get("/clients", response_model=List[Client])
async def get_clients(
    status: Optional[ClientStatus] = None, 
    skip: int = 0,
    limit: int = 100,
    user: dict = Depends(get_current_user)
):
    """Get all clients with pagination"""
    query = {}
    if status:
        query["status"] = status
    
    clients = await db.clients.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(min(limit, 500)).to_list(min(limit, 500))
    
    for client in clients:
        if isinstance(client.get('created_at'), str):
            client['created_at'] = datetime.fromisoformat(client['created_at'])
    
    return clients

@admin_router.post("/clients", response_model=Client)
async def create_client(client_data: ClientCreate, request: Request, user: dict = Depends(get_current_user)):
    """Create a new client"""
    client = Client(**client_data.model_dump())
    
    doc = client.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.clients.insert_one(doc)
    await create_audit_log("client_created", "client", client.id, user=user, request=request)
    
    return client

@admin_router.get("/clients/{client_id}", response_model=Client)
async def get_client(client_id: str, user: dict = Depends(get_current_user)):
    """Get a specific client"""
    client = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    if isinstance(client.get('created_at'), str):
        client['created_at'] = datetime.fromisoformat(client['created_at'])
    
    return client

@admin_router.patch("/clients/{client_id}", response_model=Client)
async def update_client(client_id: str, update: ClientUpdate, request: Request, user: dict = Depends(get_current_user)):
    """Update client"""
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    result = await db.clients.update_one({"id": client_id}, {"$set": update_data})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Client not found")
    
    await create_audit_log("client_updated", "client", client_id, user=user, details=update_data, request=request)
    
    client = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if isinstance(client.get('created_at'), str):
        client['created_at'] = datetime.fromisoformat(client['created_at'])
    return client

# ==================== ADMIN QUOTES ENDPOINTS ====================
@admin_router.post("/quotes", response_model=Quote)
async def create_quote(quote_data: QuoteCreate, request: Request, user: dict = Depends(get_current_user)):
    """Generate a quote for a lead with automatic calculations"""
    lead = await db.leads.find_one({"id": quote_data.lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    contingency = max(10.0, min(20.0, quote_data.contingency_percent))
    
    lines = []
    subtotal_material = 0
    subtotal_labor = 0
    market_price_total = 0
    total_cost = 0
    
    for line_data in quote_data.lines:
        line = QuoteLine(**line_data.model_dump())
        line.line_total = line.quantity * line.unit_price
        
        cost = line.cost_price or (line.unit_price * 0.4)
        line.margin_amount = line.line_total - (line.quantity * cost)
        total_cost += line.quantity * cost
        
        lines.append(line)
        
        if line.line_type == "material":
            subtotal_material += line.line_total
            if line.market_price:
                market_price_total += line.quantity * line.market_price
        elif line.line_type == "labor":
            subtotal_labor += line.line_total
    
    subtotal_before_contingency = subtotal_material + subtotal_labor + quote_data.delivery_fee + quote_data.urgency_fee
    contingency_amount = subtotal_before_contingency * (contingency / 100)
    subtotal_before_tax = subtotal_before_contingency + contingency_amount
    
    tps_amount = subtotal_before_tax * PRICING_CONFIG["taxes"]["tps_rate"]
    tvq_amount = subtotal_before_tax * PRICING_CONFIG["taxes"]["tvq_rate"]
    total_with_tax = subtotal_before_tax + tps_amount + tvq_amount
    
    cmgeorges_savings = market_price_total - subtotal_material if market_price_total > subtotal_material else 0
    
    gross_margin = subtotal_before_tax - total_cost
    margin_percent = (gross_margin / subtotal_before_tax * 100) if subtotal_before_tax > 0 else 0
    
    deposit_amount = subtotal_before_tax * PRICING_CONFIG["payment_terms"]["deposit"]
    milestone_amount = subtotal_before_tax * PRICING_CONFIG["payment_terms"]["milestone"]
    final_amount = subtotal_before_tax * PRICING_CONFIG["payment_terms"]["final"]
    
    quote = Quote(
        lead_id=quote_data.lead_id,
        client_id=lead.get("client_id"),
        valid_until=datetime.now(timezone.utc) + timedelta(days=quote_data.validity_days),
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
        total_cost=round(total_cost, 2),
        gross_margin=round(gross_margin, 2),
        margin_percent=round(margin_percent, 1),
        deposit_amount=round(deposit_amount, 2),
        milestone_amount=round(milestone_amount, 2),
        final_amount=round(final_amount, 2),
        notes=quote_data.notes
    )
    
    doc = quote.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['valid_until'] = doc['valid_until'].isoformat()
    
    await db.quotes.insert_one(doc)
    await db.leads.update_one({"id": quote_data.lead_id}, {"$set": {"status": "quoted"}})
    
    await create_audit_log("quote_created", "quote", quote.id, user=user, details={"lead_id": quote_data.lead_id, "total": quote.total_with_tax}, request=request)
    
    return quote

@admin_router.get("/quotes", response_model=List[Quote])
async def get_quotes(lead_id: Optional[str] = None, client_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    """Get all quotes"""
    query = {}
    if lead_id:
        query["lead_id"] = lead_id
    if client_id:
        query["client_id"] = client_id
    
    quotes = await db.quotes.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for quote in quotes:
        if isinstance(quote.get('created_at'), str):
            quote['created_at'] = datetime.fromisoformat(quote['created_at'])
        if isinstance(quote.get('valid_until'), str):
            quote['valid_until'] = datetime.fromisoformat(quote['valid_until'])
    
    return quotes

@admin_router.get("/quotes/{quote_id}", response_model=Quote)
async def get_quote(quote_id: str, user: dict = Depends(get_current_user)):
    """Get a specific quote"""
    quote = await db.quotes.find_one({"id": quote_id}, {"_id": 0})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    if isinstance(quote.get('created_at'), str):
        quote['created_at'] = datetime.fromisoformat(quote['created_at'])
    if isinstance(quote.get('valid_until'), str):
        quote['valid_until'] = datetime.fromisoformat(quote['valid_until'])
    
    return quote

# ==================== ADMIN INVOICES ENDPOINTS ====================
@admin_router.post("/invoices", response_model=Invoice)
async def create_invoice(invoice_data: InvoiceCreate, request: Request, user: dict = Depends(get_current_user)):
    """Create a new invoice"""
    client = await db.clients.find_one({"id": invoice_data.client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    invoice_number = await get_next_invoice_number()
    
    lines = []
    subtotal = 0
    for line_data in invoice_data.lines:
        line = InvoiceLine(**line_data.model_dump())
        line.line_total = line.quantity * line.unit_price
        subtotal += line.line_total
        lines.append(line)
    
    tps_amount = subtotal * PRICING_CONFIG["taxes"]["tps_rate"]
    tvq_amount = subtotal * PRICING_CONFIG["taxes"]["tvq_rate"]
    total = subtotal + tps_amount + tvq_amount
    
    due_date = None
    if invoice_data.due_date:
        due_date = datetime.fromisoformat(invoice_data.due_date)
    else:
        due_date = datetime.now(timezone.utc) + timedelta(days=30)
    
    invoice = Invoice(
        invoice_number=invoice_number,
        client_id=invoice_data.client_id,
        quote_id=invoice_data.quote_id,
        project_id=invoice_data.project_id,
        due_date=due_date,
        lines=[l.model_dump() for l in lines],
        subtotal=round(subtotal, 2),
        tps_amount=round(tps_amount, 2),
        tvq_amount=round(tvq_amount, 2),
        total=round(total, 2),
        balance_due=round(total, 2),
        payment_terms=invoice_data.payment_terms,
        notes=invoice_data.notes
    )
    
    doc = invoice.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    if doc.get('due_date'):
        doc['due_date'] = doc['due_date'].isoformat()
    
    await db.invoices.insert_one(doc)
    await create_audit_log("invoice_created", "invoice", invoice.id, user=user, details={"client_id": invoice_data.client_id, "total": invoice.total}, request=request)
    
    return invoice

@admin_router.get("/invoices", response_model=List[Invoice])
async def get_invoices(
    client_id: Optional[str] = None, 
    status: Optional[InvoiceStatus] = None, 
    skip: int = 0,
    limit: int = 100,
    user: dict = Depends(get_current_user)
):
    """Get all invoices with pagination"""
    query = {}
    if client_id:
        query["client_id"] = client_id
    if status:
        query["status"] = status
    
    invoices = await db.invoices.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(min(limit, 500)).to_list(min(limit, 500))
    
    for invoice in invoices:
        if isinstance(invoice.get('created_at'), str):
            invoice['created_at'] = datetime.fromisoformat(invoice['created_at'])
        if isinstance(invoice.get('due_date'), str):
            invoice['due_date'] = datetime.fromisoformat(invoice['due_date'])
    
    return invoices

@admin_router.get("/invoices/{invoice_id}", response_model=Invoice)
async def get_invoice(invoice_id: str, user: dict = Depends(get_current_user)):
    """Get a specific invoice"""
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    if isinstance(invoice.get('created_at'), str):
        invoice['created_at'] = datetime.fromisoformat(invoice['created_at'])
    if isinstance(invoice.get('due_date'), str):
        invoice['due_date'] = datetime.fromisoformat(invoice['due_date'])
    
    return invoice

@admin_router.patch("/invoices/{invoice_id}", response_model=Invoice)
async def update_invoice(invoice_id: str, update: InvoiceUpdate, request: Request, user: dict = Depends(get_current_user)):
    """Update invoice"""
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    if update_data.get("due_date"):
        update_data["due_date"] = datetime.fromisoformat(update_data["due_date"]).isoformat()
    
    result = await db.invoices.update_one({"id": invoice_id}, {"$set": update_data})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    await create_audit_log("invoice_updated", "invoice", invoice_id, user=user, details=update_data, request=request)
    
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if isinstance(invoice.get('created_at'), str):
        invoice['created_at'] = datetime.fromisoformat(invoice['created_at'])
    if isinstance(invoice.get('due_date'), str):
        invoice['due_date'] = datetime.fromisoformat(invoice['due_date'])
    return invoice

@admin_router.post("/invoices/{invoice_id}/payments", response_model=Invoice)
async def add_payment(invoice_id: str, payment: PaymentCreate, request: Request, user: dict = Depends(get_current_user)):
    """Add a payment to an invoice"""
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    payment_doc = {
        "id": str(uuid.uuid4()),
        "amount": payment.amount,
        "method": payment.method,
        "notes": payment.notes,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user["id"]
    }
    
    new_amount_paid = invoice.get("amount_paid", 0) + payment.amount
    new_balance = invoice["total"] - new_amount_paid
    
    new_status = invoice["status"]
    if new_balance <= 0:
        new_status = "paid"
    elif new_amount_paid > 0:
        new_status = "partial"
    
    await db.invoices.update_one(
        {"id": invoice_id},
        {
            "$push": {"payments": payment_doc},
            "$set": {
                "amount_paid": round(new_amount_paid, 2),
                "balance_due": round(max(0, new_balance), 2),
                "status": new_status
            }
        }
    )
    
    # Update client revenue
    if invoice.get("client_id"):
        await db.clients.update_one(
            {"id": invoice["client_id"]},
            {"$inc": {"total_revenue": payment.amount}}
        )
    
    await create_audit_log("payment_added", "invoice", invoice_id, user=user, details={"amount": payment.amount, "method": payment.method}, request=request)
    
    return await get_invoice(invoice_id, user)

# ==================== ADMIN PROJECTS ENDPOINTS ====================
@admin_router.post("/projects", response_model=Project)
async def create_project(project_data: ProjectCreate, request: Request, user: dict = Depends(get_current_user)):
    """Create a new project"""
    client = await db.clients.find_one({"id": project_data.client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    scheduled_date = None
    if project_data.scheduled_date:
        scheduled_date = datetime.fromisoformat(project_data.scheduled_date)
    
    project = Project(
        client_id=project_data.client_id,
        quote_id=project_data.quote_id,
        title=project_data.title,
        description=project_data.description,
        service_type=project_data.service_type,
        scheduled_date=scheduled_date,
        estimated_hours=project_data.estimated_hours
    )
    
    doc = project.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    if doc.get('scheduled_date'):
        doc['scheduled_date'] = doc['scheduled_date'].isoformat()
    if doc.get('completed_date'):
        doc['completed_date'] = doc['completed_date'].isoformat()
    
    await db.projects.insert_one(doc)
    await db.clients.update_one({"id": project_data.client_id}, {"$inc": {"total_projects": 1}})
    
    await create_audit_log("project_created", "project", project.id, user=user, details={"client_id": project_data.client_id}, request=request)
    
    return project

@admin_router.get("/projects", response_model=List[Project])
async def get_projects(
    client_id: Optional[str] = None, 
    status: Optional[ProjectStatus] = None, 
    skip: int = 0,
    limit: int = 100,
    user: dict = Depends(get_current_user)
):
    """Get all projects with pagination"""
    query = {}
    if client_id:
        query["client_id"] = client_id
    if status:
        query["status"] = status
    
    projects = await db.projects.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(min(limit, 500)).to_list(min(limit, 500))
    
    for project in projects:
        if isinstance(project.get('created_at'), str):
            project['created_at'] = datetime.fromisoformat(project['created_at'])
        if isinstance(project.get('scheduled_date'), str):
            project['scheduled_date'] = datetime.fromisoformat(project['scheduled_date'])
        if isinstance(project.get('completed_date'), str):
            project['completed_date'] = datetime.fromisoformat(project['completed_date'])
    
    return projects

@admin_router.get("/projects/{project_id}", response_model=Project)
async def get_project(project_id: str, user: dict = Depends(get_current_user)):
    """Get a specific project"""
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if isinstance(project.get('created_at'), str):
        project['created_at'] = datetime.fromisoformat(project['created_at'])
    if isinstance(project.get('scheduled_date'), str):
        project['scheduled_date'] = datetime.fromisoformat(project['scheduled_date'])
    if isinstance(project.get('completed_date'), str):
        project['completed_date'] = datetime.fromisoformat(project['completed_date'])
    
    return project

@admin_router.patch("/projects/{project_id}", response_model=Project)
async def update_project(project_id: str, update: ProjectUpdate, request: Request, user: dict = Depends(get_current_user)):
    """Update project"""
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    if update_data.get("scheduled_date"):
        update_data["scheduled_date"] = datetime.fromisoformat(update_data["scheduled_date"]).isoformat()
    if update_data.get("completed_date"):
        update_data["completed_date"] = datetime.fromisoformat(update_data["completed_date"]).isoformat()
    
    result = await db.projects.update_one({"id": project_id}, {"$set": update_data})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    
    await create_audit_log("project_updated", "project", project_id, user=user, details=update_data, request=request)
    
    return await get_project(project_id, user)

# ==================== ADMIN STATS & DASHBOARD ====================
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
    total_clients = await db.clients.count_documents({})
    total_invoices = await db.invoices.count_documents({})
    total_projects = await db.projects.count_documents({})
    
    conversion_rate = (won_leads / total_leads * 100) if total_leads > 0 else 0
    
    return DashboardStats(
        total_leads=total_leads,
        new_leads=new_leads,
        contacted_leads=contacted_leads,
        quoted_leads=quoted_leads,
        won_leads=won_leads,
        lost_leads=lost_leads,
        total_quotes=total_quotes,
        total_clients=total_clients,
        total_invoices=total_invoices,
        total_projects=total_projects,
        conversion_rate=round(conversion_rate, 1)
    )

@admin_router.get("/ceo-dashboard", response_model=CEODashboard)
async def get_ceo_dashboard(user: dict = Depends(require_admin)):
    """Get CEO dashboard with business metrics"""
    now = datetime.now(timezone.utc)
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    # Monthly revenue from paid invoices
    paid_invoices = await db.invoices.find({
        "status": "paid",
        "created_at": {"$gte": start_of_month.isoformat()}
    }, {"_id": 0, "total": 1}).to_list(1000)
    monthly_revenue = sum(inv.get("total", 0) for inv in paid_invoices)
    
    # Pending invoices
    pending_invoices = await db.invoices.find({
        "status": {"$in": ["sent", "partial"]}
    }, {"_id": 0, "balance_due": 1}).to_list(1000)
    pending_invoices_amount = sum(inv.get("balance_due", 0) for inv in pending_invoices)
    
    # Projects in progress
    projects_in_progress = await db.projects.count_documents({"status": "in_progress"})
    
    # Average margins from quotes - OPTIMIZED: Batch query instead of N+1
    quotes = await db.quotes.find(
        {"margin_percent": {"$exists": True, "$ne": None}}, 
        {"_id": 0, "margin_percent": 1, "lead_id": 1}
    ).to_list(500)
    
    # Get all lead IDs and fetch in one query
    lead_ids = list(set(q.get("lead_id") for q in quotes if q.get("lead_id")))
    leads_list = await db.leads.find(
        {"id": {"$in": lead_ids}}, 
        {"_id": 0, "id": 1, "service_type": 1}
    ).to_list(len(lead_ids)) if lead_ids else []
    lead_map = {l["id"]: l.get("service_type") for l in leads_list}
    
    manual_margins = []
    tech_margins = []
    for quote in quotes:
        if quote.get("margin_percent"):
            service_type = lead_map.get(quote.get("lead_id"))
            if service_type == "tech":
                tech_margins.append(quote["margin_percent"])
            elif service_type:
                manual_margins.append(quote["margin_percent"])
    
    average_margin_manual = sum(manual_margins) / len(manual_margins) if manual_margins else 55.0
    average_margin_tech = sum(tech_margins) / len(tech_margins) if tech_margins else 70.0
    
    # Estimated monthly costs (placeholder - would come from expense tracking)
    monthly_costs = monthly_revenue * 0.4
    monthly_profit = monthly_revenue - monthly_costs
    
    # Top services (from leads) - OPTIMIZED: Use aggregation
    pipeline = [
        {"$match": {"status": "won"}},
        {"$group": {"_id": "$service_type", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5}
    ]
    service_agg = await db.leads.aggregate(pipeline).to_list(5)
    top_services = [{"service": s["_id"] or "other", "count": s["count"]} for s in service_agg]
    
    # Revenue by month (last 6 months)
    revenue_by_month = []
    for i in range(5, -1, -1):
        month_start = (now.replace(day=1) - timedelta(days=i*30)).replace(day=1)
        month_end = (month_start + timedelta(days=32)).replace(day=1)
        
        month_invoices = await db.invoices.find({
            "status": "paid",
            "created_at": {"$gte": month_start.isoformat(), "$lt": month_end.isoformat()}
        }, {"_id": 0, "total": 1}).to_list(1000)
        
        month_revenue = sum(inv.get("total", 0) for inv in month_invoices)
        revenue_by_month.append({
            "month": month_start.strftime("%Y-%m"),
            "revenue": round(month_revenue, 2)
        })
    
    # Conversion rate
    total_leads = await db.leads.count_documents({})
    won_leads = await db.leads.count_documents({"status": "won"})
    conversion_rate = (won_leads / total_leads * 100) if total_leads > 0 else 0
    
    return CEODashboard(
        monthly_revenue=round(monthly_revenue, 2),
        monthly_costs=round(monthly_costs, 2),
        monthly_profit=round(monthly_profit, 2),
        average_margin_manual=round(average_margin_manual, 1),
        average_margin_tech=round(average_margin_tech, 1),
        top_services=top_services,
        revenue_by_month=revenue_by_month,
        pending_invoices_amount=round(pending_invoices_amount, 2),
        projects_in_progress=projects_in_progress,
        conversion_rate=round(conversion_rate, 1)
    )

@admin_router.get("/audit-logs")
async def get_audit_logs(
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    limit: int = 100,
    user: dict = Depends(require_admin)
):
    """Get audit logs"""
    query = {}
    if entity_type:
        query["entity_type"] = entity_type
    if entity_id:
        query["entity_id"] = entity_id
    
    logs = await db.audit_logs.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return logs

# ==================== HEALTH CHECK ====================
@api_router.get("/healthz")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat(), "version": "2.0.0"}

# ==================== SEED DATA ====================
@api_router.post("/seed")
async def seed_database():
    """Seed the database with initial data"""
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
    
    # Create sample blog posts
    blog_posts = [
        {
            "id": str(uuid.uuid4()),
            "title": "5 conseils pour réussir votre projet de peinture",
            "slug": "conseils-projet-peinture",
            "excerpt": "Découvrez nos meilleurs conseils pour un résultat professionnel lors de votre prochain projet de peinture.",
            "content": """
            <h2>1. Préparation des surfaces</h2>
            <p>La clé d'une peinture réussie réside dans la préparation. Nettoyez, réparez et poncez toutes les surfaces avant de commencer.</p>
            
            <h2>2. Choisir la bonne peinture</h2>
            <p>Optez pour une peinture de qualité adaptée à votre projet. Pour les pièces humides, privilégiez une peinture anti-moisissure.</p>
            
            <h2>3. Protection adéquate</h2>
            <p>Protégez vos meubles et sols avec des bâches. Le ruban de masquage est essentiel pour des lignes nettes.</p>
            
            <h2>4. Technique d'application</h2>
            <p>Appliquez la peinture en couches fines et régulières. Laissez sécher entre chaque couche.</p>
            
            <h2>5. Finition professionnelle</h2>
            <p>Retirez le ruban avant que la peinture soit complètement sèche pour éviter les arrachements.</p>
            """,
            "featured_image": "https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=800",
            "category": "conseils",
            "tags": ["peinture", "conseils", "DIY"],
            "status": "published",
            "author_name": "CMGeorges",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "published_at": datetime.now(timezone.utc).isoformat(),
            "view_count": 0
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Guide complet: Assemblage de meubles IKEA",
            "slug": "guide-assemblage-ikea",
            "excerpt": "Tout ce que vous devez savoir pour assembler vos meubles IKEA comme un pro.",
            "content": """
            <h2>Avant de commencer</h2>
            <p>Vérifiez que toutes les pièces sont présentes et lisez les instructions complètement.</p>
            
            <h2>Outils nécessaires</h2>
            <p>Un tournevis, un marteau et un niveau sont généralement suffisants. IKEA fournit souvent une clé Allen.</p>
            
            <h2>Conseils de pro</h2>
            <p>Ne serrez pas complètement les vis avant d'avoir assemblé toutes les pièces.</p>
            
            <h2>Ancrage mural</h2>
            <p>Pour la sécurité des enfants, ancrez toujours les meubles hauts au mur.</p>
            """,
            "featured_image": "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800",
            "category": "guides",
            "tags": ["IKEA", "assemblage", "mobilier"],
            "status": "published",
            "author_name": "CMGeorges",
            "created_at": (datetime.now(timezone.utc) - timedelta(days=7)).isoformat(),
            "updated_at": (datetime.now(timezone.utc) - timedelta(days=7)).isoformat(),
            "published_at": (datetime.now(timezone.utc) - timedelta(days=7)).isoformat(),
            "view_count": 0
        }
    ]
    await db.blog_posts.insert_many(blog_posts)
    
    return {"message": "Database seeded successfully", "admin_email": "admin@cmgeorges.com", "admin_password": "admin123"}

@api_router.post("/seed-crm")
async def seed_crm_data(force: bool = False):
    """Seed CRM data: discount codes, pricing, and policies"""
    # Check if already seeded
    existing_code = await db.discount_codes.find_one({})
    if existing_code and not force:
        return {"message": "CRM data already seeded. Use ?force=true to reseed."}
    
    if force:
        # Clear existing data
        await db.discount_codes.delete_many({})
        await db.pricing_items.delete_many({})
        await db.policies.delete_many({})
    
    now = datetime.now(timezone.utc)
    
    # Discount Codes
    discount_codes = [
        {
            "id": str(uuid.uuid4()),
            "code": "BIENVENUE10",
            "description": "10% de réduction pour les nouveaux clients",
            "discount_type": "percentage",
            "discount_value": 10,
            "min_order_amount": 100,
            "max_uses": 100,
            "valid_from": now.isoformat(),
            "valid_until": (now + timedelta(days=365)).isoformat(),
            "applicable_services": [],
            "is_active": True,
            "times_used": 0,
            "created_at": now.isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "code": "MOBILIER50",
            "description": "50$ de rabais sur assemblage de 3+ meubles",
            "discount_type": "fixed",
            "discount_value": 50,
            "min_order_amount": 200,
            "max_uses": 50,
            "valid_from": now.isoformat(),
            "valid_until": (now + timedelta(days=180)).isoformat(),
            "applicable_services": ["furniture"],
            "is_active": True,
            "times_used": 0,
            "created_at": now.isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "code": "TECH15",
            "description": "15% sur les services Tech",
            "discount_type": "percentage",
            "discount_value": 15,
            "min_order_amount": 500,
            "max_uses": None,
            "valid_from": now.isoformat(),
            "valid_until": (now + timedelta(days=90)).isoformat(),
            "applicable_services": ["tech"],
            "is_active": True,
            "times_used": 0,
            "created_at": now.isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "code": "PEINTURE100",
            "description": "100$ de rabais sur peinture 5½ et plus",
            "discount_type": "fixed",
            "discount_value": 100,
            "min_order_amount": 700,
            "max_uses": 25,
            "valid_from": now.isoformat(),
            "valid_until": (now + timedelta(days=60)).isoformat(),
            "applicable_services": ["manual"],
            "is_active": True,
            "times_used": 0,
            "created_at": now.isoformat()
        }
    ]
    await db.discount_codes.insert_many(discount_codes)
    
    # Pricing Items
    pricing_items = [
        # Manual - Peinture
        {"id": str(uuid.uuid4()), "name": "Peinture 3½ pièces", "description": "Peinture intérieure complète", "service_type": "manual", "category": "peinture", "unit": "forfait", "base_price": 450, "min_price": 400, "max_price": 550, "is_active": True, "created_at": now.isoformat(), "updated_at": now.isoformat()},
        {"id": str(uuid.uuid4()), "name": "Peinture 4½ pièces", "description": "Peinture intérieure complète", "service_type": "manual", "category": "peinture", "unit": "forfait", "base_price": 550, "min_price": 500, "max_price": 700, "is_active": True, "created_at": now.isoformat(), "updated_at": now.isoformat()},
        {"id": str(uuid.uuid4()), "name": "Peinture 5½ pièces", "description": "Peinture intérieure complète", "service_type": "manual", "category": "peinture", "unit": "forfait", "base_price": 700, "min_price": 650, "max_price": 900, "is_active": True, "created_at": now.isoformat(), "updated_at": now.isoformat()},
        {"id": str(uuid.uuid4()), "name": "Peinture par pièce", "description": "Pièce additionnelle", "service_type": "manual", "category": "peinture", "unit": "pièce", "base_price": 150, "min_price": 120, "max_price": 200, "is_active": True, "created_at": now.isoformat(), "updated_at": now.isoformat()},
        {"id": str(uuid.uuid4()), "name": "Installation TV murale", "description": "Montage et câblage", "service_type": "manual", "category": "installation", "unit": "unité", "base_price": 120, "min_price": 100, "max_price": 180, "is_active": True, "created_at": now.isoformat(), "updated_at": now.isoformat()},
        {"id": str(uuid.uuid4()), "name": "Entretien général", "description": "Main d'oeuvre générale", "service_type": "manual", "category": "general", "unit": "heure", "base_price": 45, "min_price": 40, "max_price": 55, "is_active": True, "created_at": now.isoformat(), "updated_at": now.isoformat()},
        {"id": str(uuid.uuid4()), "name": "Installation plancher", "description": "Plancher flottant", "service_type": "manual", "category": "plancher", "unit": "pied carré", "base_price": 2.25, "min_price": 1.75, "max_price": 3.50, "is_active": True, "created_at": now.isoformat(), "updated_at": now.isoformat()},
        
        # Furniture
        {"id": str(uuid.uuid4()), "name": "Assemblage lit simple/double", "description": "IKEA, JYSK ou similaire", "service_type": "furniture", "category": "assemblage", "unit": "unité", "base_price": 75, "min_price": 65, "max_price": 95, "is_active": True, "created_at": now.isoformat(), "updated_at": now.isoformat()},
        {"id": str(uuid.uuid4()), "name": "Assemblage lit Queen/King", "description": "Avec ou sans tiroirs", "service_type": "furniture", "category": "assemblage", "unit": "unité", "base_price": 95, "min_price": 85, "max_price": 125, "is_active": True, "created_at": now.isoformat(), "updated_at": now.isoformat()},
        {"id": str(uuid.uuid4()), "name": "Assemblage commode", "description": "4-6 tiroirs", "service_type": "furniture", "category": "assemblage", "unit": "unité", "base_price": 65, "min_price": 55, "max_price": 85, "is_active": True, "created_at": now.isoformat(), "updated_at": now.isoformat()},
        {"id": str(uuid.uuid4()), "name": "Assemblage garde-robe PAX", "description": "2-3 sections", "service_type": "furniture", "category": "assemblage", "unit": "unité", "base_price": 175, "min_price": 150, "max_price": 250, "is_active": True, "created_at": now.isoformat(), "updated_at": now.isoformat()},
        {"id": str(uuid.uuid4()), "name": "Assemblage bureau", "description": "Standard ou gaming", "service_type": "furniture", "category": "assemblage", "unit": "unité", "base_price": 60, "min_price": 50, "max_price": 80, "is_active": True, "created_at": now.isoformat(), "updated_at": now.isoformat()},
        {"id": str(uuid.uuid4()), "name": "Ancrage mural sécuritaire", "description": "Protection anti-basculement", "service_type": "furniture", "category": "installation", "unit": "unité", "base_price": 25, "min_price": 20, "max_price": 35, "is_active": True, "created_at": now.isoformat(), "updated_at": now.isoformat()},
        {"id": str(uuid.uuid4()), "name": "Livraison Montréal", "description": "Zone centrale", "service_type": "furniture", "category": "livraison", "unit": "forfait", "base_price": 50, "min_price": 40, "max_price": 75, "is_active": True, "created_at": now.isoformat(), "updated_at": now.isoformat()},
        
        # Tech
        {"id": str(uuid.uuid4()), "name": "Site vitrine", "description": "5-7 pages, design moderne", "service_type": "tech", "category": "web", "unit": "forfait", "base_price": 1500, "min_price": 1200, "max_price": 2500, "is_active": True, "created_at": now.isoformat(), "updated_at": now.isoformat()},
        {"id": str(uuid.uuid4()), "name": "Site e-commerce", "description": "Boutique complète", "service_type": "tech", "category": "web", "unit": "forfait", "base_price": 3500, "min_price": 2500, "max_price": 6000, "is_active": True, "created_at": now.isoformat(), "updated_at": now.isoformat()},
        {"id": str(uuid.uuid4()), "name": "Application web sur mesure", "description": "Solution personnalisée", "service_type": "tech", "category": "web", "unit": "forfait", "base_price": 5000, "min_price": 3000, "max_price": 15000, "is_active": True, "created_at": now.isoformat(), "updated_at": now.isoformat()},
        {"id": str(uuid.uuid4()), "name": "Développement horaire", "description": "Taux horaire standard", "service_type": "tech", "category": "devops", "unit": "heure", "base_price": 70, "min_price": 60, "max_price": 95, "is_active": True, "created_at": now.isoformat(), "updated_at": now.isoformat()},
        {"id": str(uuid.uuid4()), "name": "Maintenance mensuelle", "description": "Support et mises à jour", "service_type": "tech", "category": "maintenance", "unit": "mois", "base_price": 150, "min_price": 100, "max_price": 300, "is_active": True, "created_at": now.isoformat(), "updated_at": now.isoformat()},
        {"id": str(uuid.uuid4()), "name": "Audit DevOps/Cloud", "description": "Analyse infrastructure", "service_type": "tech", "category": "devops", "unit": "forfait", "base_price": 500, "min_price": 400, "max_price": 800, "is_active": True, "created_at": now.isoformat(), "updated_at": now.isoformat()}
    ]
    await db.pricing_items.insert_many(pricing_items)
    
    # Policies
    policies = [
        {
            "id": str(uuid.uuid4()),
            "policy_type": "terms",
            "title": "Conditions Générales de Service",
            "content": """CONDITIONS GÉNÉRALES DE SERVICE - CMGEORGES

1. SERVICES OFFERTS
CMGeorges offre des services de peinture, rénovation légère, assemblage de mobilier et solutions technologiques dans la région de Montréal et Rive-Sud.

2. SOUMISSIONS ET PRIX
- Toutes les soumissions sont valides pour 30 jours
- Les prix peuvent varier selon la complexité du travail
- Un dépôt de 30% est requis pour confirmer une réservation
- Le solde est payable à la fin des travaux

3. ANNULATION
- Annulation gratuite jusqu'à 48h avant le rendez-vous
- Frais de 50$ pour annulation moins de 48h à l'avance
- Report gratuit avec préavis de 24h

4. GARANTIE
- Garantie de satisfaction sur tous nos travaux
- Retouches gratuites dans les 30 jours suivant les travaux
- Garantie de 1 an sur l'assemblage de mobilier

5. RESPONSABILITÉ
CMGeorges est assuré et responsable des dommages causés pendant l'exécution des travaux. Le client doit signaler tout problème dans les 7 jours.

6. MATÉRIAUX
Sauf indication contraire, les matériaux (peinture, quincaillerie) sont à la charge du client. CMGeorges peut fournir les matériaux avec supplément.

Pour toute question: cmgeorges.cie@gmail.com | 514-386-1743""",
            "version": "2.0",
            "is_active": True,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "policy_type": "privacy",
            "title": "Politique de Confidentialité",
            "content": """POLITIQUE DE CONFIDENTIALITÉ - CMGEORGES

Dernière mise à jour: Février 2026

1. COLLECTE DES DONNÉES
Nous collectons les informations suivantes:
- Nom, adresse, téléphone, courriel
- Détails du projet et préférences
- Historique des services

2. UTILISATION DES DONNÉES
Vos données servent uniquement à:
- Fournir et améliorer nos services
- Communiquer avec vous concernant vos projets
- Envoyer des promotions (avec consentement)

3. PROTECTION
- Données stockées de manière sécurisée
- Accès limité au personnel autorisé
- Aucune vente à des tiers

4. VOS DROITS
Vous pouvez demander:
- L'accès à vos données personnelles
- La correction ou suppression de vos données
- Le retrait de notre liste marketing

Contact: privacy@cmgeorges.com""",
            "version": "1.0",
            "is_active": True,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "policy_type": "warranty",
            "title": "Politique de Garantie",
            "content": """GARANTIE CMGEORGES

PEINTURE & RÉNOVATION
- Garantie de 30 jours sur la main d'œuvre
- Retouches gratuites pour défauts d'application
- Ne couvre pas les dommages causés par le client

ASSEMBLAGE MOBILIER
- Garantie de 1 an sur la solidité de l'assemblage
- Réparation gratuite si l'assemblage se défait
- Ancrage mural garanti à vie

SERVICES TECH
- Garantie de 90 jours sur les développements
- Corrections de bugs gratuites
- Support technique inclus pendant la période de garantie

EXCLUSIONS
- Usure normale
- Mauvaise utilisation
- Dommages causés par des tiers

Pour une réclamation: garantie@cmgeorges.com""",
            "version": "1.0",
            "is_active": True,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "policy_type": "cancellation",
            "title": "Politique d'Annulation",
            "content": """POLITIQUE D'ANNULATION CMGEORGES

DÉLAIS D'ANNULATION
- Plus de 48h avant: Annulation gratuite, remboursement complet du dépôt
- Entre 24h et 48h: Frais de 50$ applicables
- Moins de 24h: Dépôt non remboursable

REPORT DE RENDEZ-VOUS
- Report gratuit avec préavis de 24h minimum
- Maximum 2 reports par projet
- Au-delà, des frais peuvent s'appliquer

REMBOURSEMENTS
- Traités dans les 5-10 jours ouvrables
- Par le même mode de paiement original
- Confirmation par courriel

EXCEPTIONS
En cas de force majeure (météo extrême, urgence médicale), contactez-nous pour une entente sans frais.

Contact: reservations@cmgeorges.com | 514-386-1743""",
            "version": "1.0",
            "is_active": True,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "policy_type": "payment",
            "title": "Modalités de Paiement",
            "content": """MODALITÉS DE PAIEMENT CMGEORGES

MODES DE PAIEMENT ACCEPTÉS
- Virement Interac (préféré)
- Comptant
- Carte de crédit (frais de 3% applicables)
- Chèque (clients établis uniquement)

STRUCTURE DE PAIEMENT
Pour projets de moins de 500$:
- Paiement complet à la fin des travaux

Pour projets de 500$ à 2000$:
- Dépôt de 30% à la réservation
- Solde à la fin des travaux

Pour projets de plus de 2000$:
- 30% à la réservation
- 30% à mi-projet
- 40% à la livraison finale

FACTURES
- Factures envoyées par courriel
- Paiement dû Net 30 jours
- Frais de retard de 2% par mois

Questions: facturation@cmgeorges.com""",
            "version": "1.0",
            "is_active": True,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat()
        }
    ]
    await db.policies.insert_many(policies)
    
    return {
        "message": "CRM data seeded successfully",
        "discount_codes": len(discount_codes),
        "pricing_items": len(pricing_items),
        "policies": len(policies)
    }

# ==================== BLOG PUBLIC ENDPOINTS ====================
@v1_router.get("/blog", response_model=List[BlogPost])
async def get_published_blog_posts(category: Optional[str] = None, tag: Optional[str] = None, limit: int = 10):
    """Get published blog posts for public view"""
    query = {"status": "published"}
    if category:
        query["category"] = category
    if tag:
        query["tags"] = tag
    
    posts = await db.blog_posts.find(query, {"_id": 0}).sort("published_at", -1).limit(limit).to_list(limit)
    
    for post in posts:
        if isinstance(post.get('created_at'), str):
            post['created_at'] = datetime.fromisoformat(post['created_at'])
        if isinstance(post.get('updated_at'), str):
            post['updated_at'] = datetime.fromisoformat(post['updated_at'])
        if isinstance(post.get('published_at'), str):
            post['published_at'] = datetime.fromisoformat(post['published_at'])
    
    return posts

@v1_router.get("/blog/{slug}")
async def get_blog_post_by_slug(slug: str):
    """Get a single blog post by slug and increment view count"""
    post = await db.blog_posts.find_one({"slug": slug, "status": "published"}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Article non trouvé")
    
    # Increment view count
    await db.blog_posts.update_one({"slug": slug}, {"$inc": {"view_count": 1}})
    
    if isinstance(post.get('created_at'), str):
        post['created_at'] = datetime.fromisoformat(post['created_at'])
    if isinstance(post.get('updated_at'), str):
        post['updated_at'] = datetime.fromisoformat(post['updated_at'])
    if isinstance(post.get('published_at'), str):
        post['published_at'] = datetime.fromisoformat(post['published_at'])
    
    return post

@v1_router.get("/blog-categories")
async def get_blog_categories():
    """Get all blog categories with post counts"""
    pipeline = [
        {"$match": {"status": "published"}},
        {"$group": {"_id": "$category", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    categories = await db.blog_posts.aggregate(pipeline).to_list(100)
    return [{"category": c["_id"], "count": c["count"]} for c in categories]

# ==================== ADMIN BLOG ENDPOINTS ====================
@admin_router.get("/blog", response_model=List[BlogPost])
async def admin_get_blog_posts(status: Optional[BlogPostStatus] = None, user: dict = Depends(get_current_user)):
    """Get all blog posts for admin"""
    query = {}
    if status:
        query["status"] = status
    
    posts = await db.blog_posts.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for post in posts:
        if isinstance(post.get('created_at'), str):
            post['created_at'] = datetime.fromisoformat(post['created_at'])
        if isinstance(post.get('updated_at'), str):
            post['updated_at'] = datetime.fromisoformat(post['updated_at'])
        if isinstance(post.get('published_at'), str):
            post['published_at'] = datetime.fromisoformat(post['published_at'])
    
    return posts

@admin_router.post("/blog", response_model=BlogPost)
async def create_blog_post(post_data: BlogPostCreate, request: Request, user: dict = Depends(get_current_user)):
    """Create a new blog post"""
    # Check for duplicate slug
    existing = await db.blog_posts.find_one({"slug": post_data.slug})
    if existing:
        raise HTTPException(status_code=400, detail="Un article avec ce slug existe déjà")
    
    post = BlogPost(
        **post_data.model_dump(),
        author_id=user["id"],
        author_name=user.get("full_name", user["email"])
    )
    
    doc = post.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    if doc.get('published_at'):
        doc['published_at'] = doc['published_at'].isoformat()
    
    await db.blog_posts.insert_one(doc)
    await create_audit_log("blog_post_created", "blog_post", post.id, user=user, request=request)
    
    return post

@admin_router.patch("/blog/{post_id}", response_model=BlogPost)
async def update_blog_post(post_id: str, update: BlogPostUpdate, request: Request, user: dict = Depends(get_current_user)):
    """Update a blog post"""
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # If publishing, set published_at
    if update_data.get("status") == "published":
        existing = await db.blog_posts.find_one({"id": post_id}, {"_id": 0, "published_at": 1})
        if not existing or not existing.get("published_at"):
            update_data["published_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.blog_posts.update_one({"id": post_id}, {"$set": update_data})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Article non trouvé")
    
    await create_audit_log("blog_post_updated", "blog_post", post_id, user=user, details=update_data, request=request)
    
    post = await db.blog_posts.find_one({"id": post_id}, {"_id": 0})
    if isinstance(post.get('created_at'), str):
        post['created_at'] = datetime.fromisoformat(post['created_at'])
    if isinstance(post.get('updated_at'), str):
        post['updated_at'] = datetime.fromisoformat(post['updated_at'])
    if isinstance(post.get('published_at'), str):
        post['published_at'] = datetime.fromisoformat(post['published_at'])
    
    return post

@admin_router.delete("/blog/{post_id}")
async def delete_blog_post(post_id: str, request: Request, user: dict = Depends(require_admin)):
    """Delete a blog post"""
    result = await db.blog_posts.delete_one({"id": post_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Article non trouvé")
    
    await create_audit_log("blog_post_deleted", "blog_post", post_id, user=user, request=request)
    return {"message": "Article supprimé"}

# ==================== PDF GENERATION ====================
def generate_quote_pdf(quote: dict, lead: dict, client: dict = None) -> BytesIO:
    """Generate PDF for a quote"""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=50, leftMargin=50, topMargin=50, bottomMargin=50)
    
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name='CMGHeader', fontSize=24, textColor=colors.HexColor('#1a365d'), spaceAfter=20, fontName='Helvetica-Bold'))
    styles.add(ParagraphStyle(name='CMGSubHeader', fontSize=12, textColor=colors.HexColor('#666666'), spaceAfter=10))
    styles.add(ParagraphStyle(name='CMGTitle', fontSize=16, textColor=colors.HexColor('#1a365d'), spaceAfter=15, fontName='Helvetica-Bold'))
    styles.add(ParagraphStyle(name='CMGRight', fontSize=10, alignment=TA_RIGHT))
    
    elements = []
    
    # Header
    elements.append(Paragraph("🦁 CMGeorges", styles['CMGHeader']))
    elements.append(Paragraph("Montréal & Rive-Sud | 514-386-1743 | cmgeorges.cie@gmail.com", styles['CMGSubHeader']))
    elements.append(Spacer(1, 20))
    
    # Quote Info
    elements.append(Paragraph("SOUMISSION", styles['CMGTitle']))
    
    quote_info = [
        ["Date:", quote.get('created_at', '')[:10] if isinstance(quote.get('created_at'), str) else str(quote.get('created_at', ''))[:10]],
        ["Valide jusqu'au:", quote.get('valid_until', '')[:10] if isinstance(quote.get('valid_until'), str) else str(quote.get('valid_until', ''))[:10]],
        ["Référence:", quote.get('id', '')[:8]],
    ]
    
    t = Table(quote_info, colWidths=[100, 200])
    t.setStyle(TableStyle([
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#666666')),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 20))
    
    # Client Info
    elements.append(Paragraph("CLIENT", styles['CMGTitle']))
    client_name = client.get('full_name') if client else lead.get('full_name', 'N/A')
    client_email = client.get('email') if client else lead.get('email', 'N/A')
    client_phone = client.get('phone') if client else lead.get('phone', 'N/A')
    client_address = client.get('address', lead.get('address', '')) if client else lead.get('address', '')
    
    elements.append(Paragraph(f"<b>{client_name}</b><br/>{client_email}<br/>{client_phone}<br/>{client_address}", styles['Normal']))
    elements.append(Spacer(1, 20))
    
    # Line Items
    elements.append(Paragraph("DÉTAILS", styles['CMGTitle']))
    
    table_data = [["Description", "Qté", "Prix unit.", "Total"]]
    for line in quote.get('lines', []):
        table_data.append([
            line.get('description', ''),
            str(line.get('quantity', 1)),
            f"{line.get('unit_price', 0):.2f} $",
            f"{line.get('line_total', 0):.2f} $"
        ])
    
    t = Table(table_data, colWidths=[280, 50, 80, 80])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1a365d')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cccccc')),
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 20))
    
    # Totals
    totals_data = [
        ["Sous-total:", f"{quote.get('subtotal_before_contingency', 0):.2f} $"],
        [f"Contingence ({quote.get('contingency_percent', 15)}%):", f"{quote.get('contingency_amount', 0):.2f} $"],
        ["TPS (5%):", f"{quote.get('tps_amount', 0):.2f} $"],
        ["TVQ (9.975%):", f"{quote.get('tvq_amount', 0):.2f} $"],
        ["TOTAL:", f"{quote.get('total_with_tax', 0):.2f} $"],
    ]
    
    t = Table(totals_data, colWidths=[380, 100])
    t.setStyle(TableStyle([
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('TEXTCOLOR', (0, -1), (-1, -1), colors.HexColor('#1a365d')),
        ('FONTSIZE', (0, -1), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LINEABOVE', (0, -1), (-1, -1), 1, colors.HexColor('#1a365d')),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 20))
    
    # Payment Terms
    elements.append(Paragraph("MODALITÉS DE PAIEMENT", styles['CMGTitle']))
    payment_text = f"""
    • Dépôt à la signature: {quote.get('deposit_amount', 0):.2f} $ (30%)<br/>
    • À mi-projet: {quote.get('milestone_amount', 0):.2f} $ (30%)<br/>
    • À la fin des travaux: {quote.get('final_amount', 0):.2f} $ (40%)
    """
    elements.append(Paragraph(payment_text, styles['Normal']))
    elements.append(Spacer(1, 20))
    
    # Notes
    if quote.get('notes'):
        elements.append(Paragraph("NOTES", styles['CMGTitle']))
        elements.append(Paragraph(quote['notes'], styles['Normal']))
        elements.append(Spacer(1, 20))
    
    # Footer
    elements.append(Spacer(1, 30))
    elements.append(Paragraph("Merci de votre confiance!", styles['CMGSubHeader']))
    elements.append(Paragraph("CMGeorges - Votre partenaire pour tous vos projets", styles['CMGSubHeader']))
    elements.append(Paragraph("TPS: 714767027 RT0001 | TVQ: 4023795081 TQ0001", styles['CMGSubHeader']))
    
    doc.build(elements)
    buffer.seek(0)
    return buffer

def generate_invoice_pdf(invoice: dict, client: dict) -> BytesIO:
    """Generate PDF for an invoice"""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=50, leftMargin=50, topMargin=50, bottomMargin=50)
    
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name='CMGHeader', fontSize=24, textColor=colors.HexColor('#1a365d'), spaceAfter=20, fontName='Helvetica-Bold'))
    styles.add(ParagraphStyle(name='CMGSubHeader', fontSize=12, textColor=colors.HexColor('#666666'), spaceAfter=10))
    styles.add(ParagraphStyle(name='CMGTitle', fontSize=16, textColor=colors.HexColor('#1a365d'), spaceAfter=15, fontName='Helvetica-Bold'))
    
    elements = []
    
    # Header
    elements.append(Paragraph("🦁 CMGeorges", styles['CMGHeader']))
    elements.append(Paragraph("Montréal & Rive-Sud | 514-386-1743 | cmgeorges.cie@gmail.com", styles['CMGSubHeader']))
    elements.append(Spacer(1, 20))
    
    # Invoice Info
    elements.append(Paragraph("FACTURE", styles['CMGTitle']))
    
    invoice_info = [
        ["Numéro:", invoice.get('invoice_number', '')],
        ["Date:", invoice.get('created_at', '')[:10] if isinstance(invoice.get('created_at'), str) else str(invoice.get('created_at', ''))[:10]],
        ["Échéance:", invoice.get('due_date', '')[:10] if isinstance(invoice.get('due_date'), str) else str(invoice.get('due_date', ''))[:10] if invoice.get('due_date') else 'N/A'],
        ["Statut:", invoice.get('status', 'draft').upper()],
    ]
    
    t = Table(invoice_info, colWidths=[100, 200])
    t.setStyle(TableStyle([
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#666666')),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 20))
    
    # Client Info
    elements.append(Paragraph("FACTURER À", styles['CMGTitle']))
    elements.append(Paragraph(f"<b>{client.get('full_name', 'N/A')}</b><br/>{client.get('email', '')}<br/>{client.get('phone', '')}<br/>{client.get('address', '')}", styles['Normal']))
    elements.append(Spacer(1, 20))
    
    # Line Items
    elements.append(Paragraph("DÉTAILS", styles['CMGTitle']))
    
    table_data = [["Description", "Qté", "Prix unit.", "Total"]]
    for line in invoice.get('lines', []):
        table_data.append([
            line.get('description', ''),
            str(line.get('quantity', 1)),
            f"{line.get('unit_price', 0):.2f} $",
            f"{line.get('line_total', 0):.2f} $"
        ])
    
    t = Table(table_data, colWidths=[280, 50, 80, 80])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1a365d')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cccccc')),
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 20))
    
    # Totals
    totals_data = [
        ["Sous-total:", f"{invoice.get('subtotal', 0):.2f} $"],
        ["TPS (5%):", f"{invoice.get('tps_amount', 0):.2f} $"],
        ["TVQ (9.975%):", f"{invoice.get('tvq_amount', 0):.2f} $"],
        ["TOTAL:", f"{invoice.get('total', 0):.2f} $"],
    ]
    
    if invoice.get('amount_paid', 0) > 0:
        totals_data.append(["Montant payé:", f"-{invoice.get('amount_paid', 0):.2f} $"])
        totals_data.append(["SOLDE DÛ:", f"{invoice.get('balance_due', 0):.2f} $"])
    
    t = Table(totals_data, colWidths=[380, 100])
    t.setStyle(TableStyle([
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('TEXTCOLOR', (0, -1), (-1, -1), colors.HexColor('#1a365d')),
        ('FONTSIZE', (0, -1), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LINEABOVE', (0, -1), (-1, -1), 1, colors.HexColor('#1a365d')),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 20))
    
    # Payment Info
    elements.append(Paragraph("MÉTHODES DE PAIEMENT", styles['CMGTitle']))
    elements.append(Paragraph("""
    • Virement Interac: cmgeorges.cie@gmail.com<br/>
    • Comptant<br/>
    • Chèque à l'ordre de CMGeorges
    """, styles['Normal']))
    
    # Footer
    elements.append(Spacer(1, 30))
    elements.append(Paragraph("Merci de votre confiance!", styles['CMGSubHeader']))
    elements.append(Paragraph("TPS: 714767027 RT0001 | TVQ: 4023795081 TQ0001", styles['CMGSubHeader']))
    
    doc.build(elements)
    buffer.seek(0)
    return buffer

@admin_router.get("/quotes/{quote_id}/pdf")
async def get_quote_pdf(quote_id: str, user: dict = Depends(get_current_user)):
    """Generate and return PDF for a quote"""
    quote = await db.quotes.find_one({"id": quote_id}, {"_id": 0})
    if not quote:
        raise HTTPException(status_code=404, detail="Soumission non trouvée")
    
    lead = await db.leads.find_one({"id": quote.get("lead_id")}, {"_id": 0})
    client = None
    if quote.get("client_id"):
        client = await db.clients.find_one({"id": quote["client_id"]}, {"_id": 0})
    
    pdf_buffer = generate_quote_pdf(quote, lead or {}, client)
    
    filename = f"soumission-cmgeorges-{quote_id[:8]}.pdf"
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@admin_router.get("/invoices/{invoice_id}/pdf")
async def get_invoice_pdf(invoice_id: str, user: dict = Depends(get_current_user)):
    """Generate and return PDF for an invoice"""
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    
    client = await db.clients.find_one({"id": invoice.get("client_id")}, {"_id": 0})
    if not client:
        client = {"full_name": "Client inconnu", "email": "", "phone": "", "address": ""}
    
    pdf_buffer = generate_invoice_pdf(invoice, client)
    
    filename = f"facture-{invoice.get('invoice_number', invoice_id[:8])}.pdf"
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# ==================== CLIENT PORTAL ====================
def generate_portal_token() -> str:
    """Generate a secure portal access token"""
    return secrets.token_urlsafe(32)

@admin_router.post("/clients/{client_id}/portal-access")
async def create_client_portal_access(client_id: str, background_tasks: BackgroundTasks, request: Request, user: dict = Depends(get_current_user)):
    """Create or refresh portal access for a client and send email"""
    client = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    # Generate new access token
    access_token = generate_portal_token()
    
    # Deactivate existing access
    await db.client_portal_access.update_many(
        {"client_id": client_id},
        {"$set": {"is_active": False}}
    )
    
    # Create new access
    portal_access = ClientPortalAccess(
        client_id=client_id,
        email=client["email"],
        access_token=access_token
    )
    
    doc = portal_access.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['expires_at'] = doc['expires_at'].isoformat()
    
    await db.client_portal_access.insert_one(doc)
    
    # Build portal URL using environment variable (required)
    app_url = os.environ.get('APP_URL') or os.environ.get('REACT_APP_BACKEND_URL')
    if not app_url:
        raise HTTPException(status_code=500, detail="APP_URL environment variable not configured")
    portal_url = f"{app_url}/portail-client?token={access_token}"
    
    # Send email to client
    email_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .header {{ background: #1a365d; color: white; padding: 20px; text-align: center; }}
            .header h1 {{ color: #d4af37; margin: 0; }}
            .content {{ padding: 30px; }}
            .button {{ display: inline-block; background: #d4af37; color: #1a365d; padding: 15px 30px; text-decoration: none; font-weight: bold; border-radius: 5px; }}
            .footer {{ background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🦁 CMGeorges</h1>
        </div>
        <div class="content">
            <h2>Bonjour {client.get('full_name', '').split()[0]}!</h2>
            <p>Vous pouvez maintenant accéder à votre portail client pour consulter vos soumissions, factures et projets.</p>
            <p style="text-align: center; margin: 30px 0;">
                <a href="{portal_url}" class="button">Accéder à mon portail</a>
            </p>
            <p>Ce lien est valide pendant 30 jours.</p>
            <p>Si vous n'avez pas demandé cet accès, veuillez ignorer ce courriel.</p>
        </div>
        <div class="footer">
            <p>CMGeorges - Montréal & Rive-Sud | 514-386-1743</p>
        </div>
    </body>
    </html>
    """
    
    background_tasks.add_task(send_email, client["email"], "CMGeorges - Accès à votre portail client", email_html)
    
    await create_audit_log("portal_access_created", "client_portal", portal_access.id, user=user, details={"client_id": client_id}, request=request)
    
    return {"message": "Accès portail créé et envoyé par courriel", "portal_url": portal_url}

@v1_router.post("/portal/login")
async def client_portal_login(login_data: ClientPortalLogin):
    """Authenticate client for portal access"""
    access = await db.client_portal_access.find_one({
        "email": login_data.email,
        "access_token": login_data.token,
        "is_active": True
    }, {"_id": 0})
    
    if not access:
        raise HTTPException(status_code=401, detail="Accès invalide ou expiré")
    
    # Check expiration
    expires_at = datetime.fromisoformat(access["expires_at"]) if isinstance(access["expires_at"], str) else access["expires_at"]
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Accès expiré")
    
    return {"client_id": access["client_id"], "email": access["email"]}

@v1_router.get("/portal/access")
async def get_portal_access_by_token(token: str):
    """Get portal access info by token"""
    access = await db.client_portal_access.find_one({
        "access_token": token,
        "is_active": True
    }, {"_id": 0})
    
    if not access:
        raise HTTPException(status_code=401, detail="Accès invalide")
    
    # Check expiration
    expires_at = datetime.fromisoformat(access["expires_at"]) if isinstance(access["expires_at"], str) else access["expires_at"]
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Accès expiré")
    
    return {"client_id": access["client_id"], "email": access["email"]}

@v1_router.get("/portal/data/{client_id}")
async def get_client_portal_data(client_id: str, token: str):
    """Get all data for client portal"""
    # Verify access token
    access = await db.client_portal_access.find_one({
        "client_id": client_id,
        "access_token": token,
        "is_active": True
    }, {"_id": 0})
    
    if not access:
        raise HTTPException(status_code=401, detail="Accès non autorisé")
    
    # Check expiration
    expires_at = datetime.fromisoformat(access["expires_at"]) if isinstance(access["expires_at"], str) else access["expires_at"]
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Accès expiré")
    
    # Get client data
    client = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    # Get quotes
    quotes = await db.quotes.find({"client_id": client_id}, {"_id": 0}).to_list(100)
    
    # Get invoices
    invoices = await db.invoices.find({"client_id": client_id}, {"_id": 0}).to_list(100)
    
    # Get projects
    projects = await db.projects.find({"client_id": client_id}, {"_id": 0}).to_list(100)
    
    return {
        "client": client,
        "quotes": quotes,
        "invoices": invoices,
        "projects": projects
    }

@v1_router.get("/portal/quote/{quote_id}/pdf")
async def get_portal_quote_pdf(quote_id: str, token: str):
    """Get quote PDF for client portal"""
    quote = await db.quotes.find_one({"id": quote_id}, {"_id": 0})
    if not quote:
        raise HTTPException(status_code=404, detail="Soumission non trouvée")
    
    # Verify access
    access = await db.client_portal_access.find_one({
        "client_id": quote.get("client_id"),
        "access_token": token,
        "is_active": True
    }, {"_id": 0})
    
    if not access:
        raise HTTPException(status_code=401, detail="Accès non autorisé")
    
    lead = await db.leads.find_one({"id": quote.get("lead_id")}, {"_id": 0})
    client = await db.clients.find_one({"id": quote.get("client_id")}, {"_id": 0})
    
    pdf_buffer = generate_quote_pdf(quote, lead or {}, client)
    
    filename = f"soumission-cmgeorges-{quote_id[:8]}.pdf"
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@v1_router.get("/portal/invoice/{invoice_id}/pdf")
async def get_portal_invoice_pdf(invoice_id: str, token: str):
    """Get invoice PDF for client portal"""
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    
    # Verify access
    access = await db.client_portal_access.find_one({
        "client_id": invoice.get("client_id"),
        "access_token": token,
        "is_active": True
    }, {"_id": 0})
    
    if not access:
        raise HTTPException(status_code=401, detail="Accès non autorisé")
    
    client = await db.clients.find_one({"id": invoice.get("client_id")}, {"_id": 0})
    if not client:
        client = {"full_name": "Client", "email": "", "phone": "", "address": ""}
    
    pdf_buffer = generate_invoice_pdf(invoice, client)
    
    filename = f"facture-{invoice.get('invoice_number', invoice_id[:8])}.pdf"
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# ==================== DISCOUNT CODES ENDPOINTS ====================
@admin_router.get("/discount-codes", response_model=List[DiscountCode])
async def get_discount_codes(is_active: Optional[bool] = None, user: dict = Depends(get_current_user)):
    """Get all discount codes"""
    query = {}
    if is_active is not None:
        query["is_active"] = is_active
    
    codes = await db.discount_codes.find(query, {"_id": 0}).to_list(1000)
    return codes

@admin_router.post("/discount-codes", response_model=DiscountCode)
async def create_discount_code(code_data: DiscountCodeCreate, request: Request, user: dict = Depends(get_current_user)):
    """Create a new discount code"""
    # Check for duplicate code
    existing = await db.discount_codes.find_one({"code": code_data.code.upper()})
    if existing:
        raise HTTPException(status_code=400, detail="Ce code existe déjà")
    
    discount = DiscountCode(**code_data.model_dump())
    discount.code = discount.code.upper()
    
    doc = discount.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    if doc.get('valid_from'):
        doc['valid_from'] = doc['valid_from'].isoformat()
    if doc.get('valid_until'):
        doc['valid_until'] = doc['valid_until'].isoformat()
    
    await db.discount_codes.insert_one(doc)
    await create_audit_log("discount_code_created", "discount_code", discount.id, user=user, request=request)
    
    return discount

@admin_router.patch("/discount-codes/{code_id}", response_model=DiscountCode)
async def update_discount_code(code_id: str, update: DiscountCodeUpdate, request: Request, user: dict = Depends(get_current_user)):
    """Update a discount code"""
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")
    
    result = await db.discount_codes.update_one({"id": code_id}, {"$set": update_data})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Code non trouvé")
    
    await create_audit_log("discount_code_updated", "discount_code", code_id, user=user, details=update_data, request=request)
    
    code = await db.discount_codes.find_one({"id": code_id}, {"_id": 0})
    return code

@admin_router.delete("/discount-codes/{code_id}")
async def delete_discount_code(code_id: str, request: Request, user: dict = Depends(require_admin)):
    """Delete a discount code"""
    result = await db.discount_codes.delete_one({"id": code_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Code non trouvé")
    
    await create_audit_log("discount_code_deleted", "discount_code", code_id, user=user, request=request)
    return {"message": "Code supprimé"}

@v1_router.post("/validate-discount")
async def validate_discount_code(code: str, subtotal: float = 0, service_type: str = ""):
    """Validate a discount code and return discount amount"""
    discount = await db.discount_codes.find_one({"code": code.upper(), "is_active": True}, {"_id": 0})
    
    if not discount:
        raise HTTPException(status_code=404, detail="Code invalide")
    
    # Check if max uses reached
    if discount.get("max_uses") and discount.get("times_used", 0) >= discount["max_uses"]:
        raise HTTPException(status_code=400, detail="Code expiré (limite d'utilisation atteinte)")
    
    # Check validity dates
    now = datetime.now(timezone.utc)
    if discount.get("valid_from"):
        valid_from = datetime.fromisoformat(discount["valid_from"]) if isinstance(discount["valid_from"], str) else discount["valid_from"]
        if now < valid_from:
            raise HTTPException(status_code=400, detail="Code pas encore actif")
    
    if discount.get("valid_until"):
        valid_until = datetime.fromisoformat(discount["valid_until"]) if isinstance(discount["valid_until"], str) else discount["valid_until"]
        if now > valid_until:
            raise HTTPException(status_code=400, detail="Code expiré")
    
    # Check minimum order
    if subtotal < discount.get("min_order_amount", 0):
        raise HTTPException(status_code=400, detail=f"Commande minimum: {discount['min_order_amount']}$")
    
    # Check applicable services
    if discount.get("applicable_services") and service_type:
        if service_type not in discount["applicable_services"]:
            raise HTTPException(status_code=400, detail="Code non applicable pour ce service")
    
    # Calculate discount
    if discount["discount_type"] == "percentage":
        discount_amount = subtotal * (discount["discount_value"] / 100)
    else:
        discount_amount = min(discount["discount_value"], subtotal)
    
    return {
        "valid": True,
        "code": discount["code"],
        "discount_type": discount["discount_type"],
        "discount_value": discount["discount_value"],
        "discount_amount": round(discount_amount, 2),
        "description": discount.get("description", "")
    }

# ==================== PRICING ENDPOINTS ====================
@admin_router.get("/pricing", response_model=List[PricingItem])
async def get_pricing_items(service_type: Optional[str] = None, is_active: Optional[bool] = True, user: dict = Depends(get_current_user)):
    """Get pricing items"""
    query = {}
    if service_type:
        query["service_type"] = service_type
    if is_active is not None:
        query["is_active"] = is_active
    
    items = await db.pricing_items.find(query, {"_id": 0}).sort("service_type", 1).to_list(1000)
    return items

@admin_router.post("/pricing", response_model=PricingItem)
async def create_pricing_item(item_data: PricingItemCreate, request: Request, user: dict = Depends(get_current_user)):
    """Create a new pricing item"""
    item = PricingItem(**item_data.model_dump())
    
    doc = item.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.pricing_items.insert_one(doc)
    await create_audit_log("pricing_item_created", "pricing_item", item.id, user=user, request=request)
    
    return item

@admin_router.patch("/pricing/{item_id}", response_model=PricingItem)
async def update_pricing_item(item_id: str, update: PricingItemUpdate, request: Request, user: dict = Depends(get_current_user)):
    """Update a pricing item"""
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.pricing_items.update_one({"id": item_id}, {"$set": update_data})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Item non trouvé")
    
    await create_audit_log("pricing_item_updated", "pricing_item", item_id, user=user, details=update_data, request=request)
    
    item = await db.pricing_items.find_one({"id": item_id}, {"_id": 0})
    return item

@admin_router.delete("/pricing/{item_id}")
async def delete_pricing_item(item_id: str, request: Request, user: dict = Depends(require_admin)):
    """Delete a pricing item"""
    result = await db.pricing_items.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item non trouvé")
    
    await create_audit_log("pricing_item_deleted", "pricing_item", item_id, user=user, request=request)
    return {"message": "Item supprimé"}

@v1_router.get("/pricing-public")
async def get_public_pricing():
    """Get public pricing items grouped by service"""
    items = await db.pricing_items.find({"is_active": True}, {"_id": 0}).to_list(1000)
    
    grouped = {}
    for item in items:
        service = item.get("service_type", "other")
        if service not in grouped:
            grouped[service] = []
        grouped[service].append(item)
    
    return grouped

# ==================== POLICIES ENDPOINTS ====================
@admin_router.get("/policies", response_model=List[Policy])
async def get_policies(policy_type: Optional[PolicyType] = None, user: dict = Depends(get_current_user)):
    """Get all policies"""
    query = {}
    if policy_type:
        query["policy_type"] = policy_type
    
    policies = await db.policies.find(query, {"_id": 0}).to_list(100)
    return policies

@admin_router.post("/policies", response_model=Policy)
async def create_policy(policy_data: PolicyCreate, request: Request, user: dict = Depends(get_current_user)):
    """Create a new policy"""
    # Deactivate existing policy of same type
    await db.policies.update_many(
        {"policy_type": policy_data.policy_type},
        {"$set": {"is_active": False}}
    )
    
    policy = Policy(**policy_data.model_dump())
    
    doc = policy.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.policies.insert_one(doc)
    await create_audit_log("policy_created", "policy", policy.id, user=user, request=request)
    
    return policy

@admin_router.patch("/policies/{policy_id}", response_model=Policy)
async def update_policy(policy_id: str, update: PolicyUpdate, request: Request, user: dict = Depends(get_current_user)):
    """Update a policy"""
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.policies.update_one({"id": policy_id}, {"$set": update_data})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Politique non trouvée")
    
    await create_audit_log("policy_updated", "policy", policy_id, user=user, details=update_data, request=request)
    
    policy = await db.policies.find_one({"id": policy_id}, {"_id": 0})
    return policy

@admin_router.delete("/policies/{policy_id}")
async def delete_policy(policy_id: str, request: Request, user: dict = Depends(require_admin)):
    """Delete a policy"""
    result = await db.policies.delete_one({"id": policy_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Politique non trouvée")
    
    await create_audit_log("policy_deleted", "policy", policy_id, user=user, request=request)
    return {"message": "Politique supprimée"}

@v1_router.get("/policies-public")
async def get_public_policies():
    """Get active policies for public view"""
    policies = await db.policies.find({"is_active": True}, {"_id": 0}).to_list(100)
    return {p["policy_type"]: p for p in policies}

# ==================== FULL CRUD FOR CLIENTS ====================
@admin_router.delete("/clients/{client_id}")
async def delete_client(client_id: str, request: Request, user: dict = Depends(require_admin)):
    """Delete a client"""
    result = await db.clients.delete_one({"id": client_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    await create_audit_log("client_deleted", "client", client_id, user=user, request=request)
    return {"message": "Client supprimé"}

# ==================== FULL CRUD FOR INVOICES ====================
@admin_router.delete("/invoices/{invoice_id}")
async def delete_invoice(invoice_id: str, request: Request, user: dict = Depends(require_admin)):
    """Delete an invoice"""
    result = await db.invoices.delete_one({"id": invoice_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    
    await create_audit_log("invoice_deleted", "invoice", invoice_id, user=user, request=request)
    return {"message": "Facture supprimée"}

# ==================== FULL CRUD FOR PROJECTS ====================
@admin_router.delete("/projects/{project_id}")
async def delete_project(project_id: str, request: Request, user: dict = Depends(require_admin)):
    """Delete a project"""
    result = await db.projects.delete_one({"id": project_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Projet non trouvé")
    
    await create_audit_log("project_deleted", "project", project_id, user=user, request=request)
    return {"message": "Projet supprimé"}

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
