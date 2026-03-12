from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Request, BackgroundTasks, Response
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

# Stripe
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

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

# Stripe Configuration
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', '')

# ServiceFlow SaaS Plans (backend-defined, never from frontend)
SERVICEFLOW_PLANS = {
    "starter": {"name": "Starter", "price": 29.00, "currency": "usd", "users": 2, "projects": 50},
    "pro": {"name": "Pro", "price": 79.00, "currency": "usd", "users": 5, "projects": 200},
    "business": {"name": "Business", "price": 149.00, "currency": "usd", "users": -1, "projects": -1},
}

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
    tasks: list = []
    photos: list = []
    timeline: list = []
    progress: int = 0

class ProjectTask(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str = ""
    status: str = "pending"  # pending, in_progress, completed
    assigned_to: Optional[str] = None
    due_date: Optional[str] = None
    completed_at: Optional[str] = None
    order: int = 0

class ProjectTaskCreate(BaseModel):
    title: str
    description: str = ""
    assigned_to: Optional[str] = None
    due_date: Optional[str] = None

class ProjectPhoto(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    url: str
    caption: str = ""
    uploaded_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    uploaded_by: Optional[str] = None

class ProjectTimelineEvent(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_type: str  # status_change, task_completed, photo_added, note_added, report_generated
    description: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    created_by: Optional[str] = None
    metadata: dict = {}

class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[ProjectStatus] = None
    scheduled_date: Optional[str] = None
    completed_date: Optional[str] = None
    actual_hours: Optional[float] = None
    notes: Optional[str] = None
    address: Optional[str] = None

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
            <p>info@cmgeorges.com | 514-386-1743</p>
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

# ==================== NOTIFICATION HELPER ====================
async def create_notification(
    title: str,
    body: str,
    notif_type: str,
    entity_type: str = None,
    entity_id: str = None,
    user_id: str = None,
    tenant_id: str = "default"
):
    """Create an in-app notification"""
    notif = {
        "id": str(uuid.uuid4()),
        "tenant_id": tenant_id,
        "user_id": user_id,
        "type": notif_type,
        "title": title,
        "body": body,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.notifications.insert_one(notif)
    return notif

def _notif_html(title: str, body_html: str, cta_text: str = None, cta_link: str = None) -> str:
    """Reusable ServiceFlow notification email template"""
    cta_block = ""
    if cta_text and cta_link:
        cta_block = f'<p style="text-align:center;margin-top:24px;"><a href="{cta_link}" style="background:#ffe700;color:#23153c;padding:12px 28px;font-weight:bold;border-radius:8px;text-decoration:none;display:inline-block;">{cta_text}</a></p>'
    return f"""<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{{font-family:Arial,sans-serif;background:#0d0d1f;margin:0;padding:0;}}
.wrap{{max-width:600px;margin:30px auto;background:#13132b;border-radius:12px;overflow:hidden;border:1px solid #2a2a4a;}}
.hdr{{background:#1a1a3e;padding:24px 32px;display:flex;align-items:center;gap:12px;}}
.logo-icon{{background:#ffe700;border-radius:8px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:20px;line-height:36px;text-align:center;}}
.brand{{font-size:20px;font-weight:900;color:white;}}
.brand span{{color:#ffe700;}}
.body{{padding:32px;color:#e0e0e0;}}
.body h2{{color:white;margin-top:0;font-size:18px;}}
.card{{background:#1e1e3a;border-radius:8px;padding:20px;margin:20px 0;border-left:4px solid #ffe700;}}
.card p{{margin:6px 0;font-size:14px;}}
.label{{color:#ffe700;font-weight:bold;}}
.footer{{background:#0d0d1f;padding:20px 32px;color:#555;font-size:12px;text-align:center;border-top:1px solid #2a2a4a;}}
</style></head><body>
<div class="wrap">
<div class="hdr">
<div class="logo-icon">⚡</div>
<div class="brand">Service<span>Flow</span></div>
</div>
<div class="body">
<h2>{title}</h2>
{body_html}
{cta_block}
</div>
<div class="footer">ServiceFlow — Plateforme CRM pour entreprises de services<br>CMGeorges | 514-386-1743 | info@cmgeorges.com</div>
</div></body></html>"""

async def notify_new_lead(lead: dict, background_tasks: BackgroundTasks):
    """Notification: new lead received"""
    urgence = "🚨 URGENT" if lead.get("urgency_level") == "urgent" else "Normal"
    service_map = {"manual": "Déco Touché", "furniture": "Mobilier", "tech": "Tech", "other": "Autre"}
    service = service_map.get(lead.get("service_type", ""), lead.get("service_type", "N/A"))
    body_html = f"""
    <p>Un nouveau lead a été reçu via le formulaire de soumission.</p>
    <div class="card">
        <p><span class="label">Nom:</span> {lead.get('full_name','N/A')}</p>
        <p><span class="label">Email:</span> {lead.get('email','N/A')}</p>
        <p><span class="label">Téléphone:</span> {lead.get('phone','N/A')}</p>
        <p><span class="label">Service:</span> {service}</p>
        <p><span class="label">Ville:</span> {lead.get('city','N/A')}</p>
        <p><span class="label">Urgence:</span> {urgence}</p>
        {f"<p><span class='label'>Description:</span> {lead.get('description','')[:200]}</p>" if lead.get('description') else ''}
    </div>
    """
    html = _notif_html(f"Nouveau lead : {lead.get('full_name','')}", body_html, "Voir dans l'admin", f"{os.environ.get('FRONTEND_URL','')}/admin/leads")
    background_tasks.add_task(send_email, ADMIN_EMAIL, f"🔔 Nouveau lead: {lead.get('full_name','')} — ServiceFlow", html)
    background_tasks.add_task(create_notification, f"Nouveau lead: {lead.get('full_name','')}", f"Service: {service} — Urgence: {urgence}", "new_lead", "lead", lead.get("id"))

async def notify_invoice_created(invoice: dict, client: dict, background_tasks: BackgroundTasks):
    """Notification: invoice created"""
    body_html = f"""
    <p>Une nouvelle facture a été créée pour le client <strong>{client.get('full_name','')}</strong>.</p>
    <div class="card">
        <p><span class="label">Numéro:</span> {invoice.get('invoice_number','')}</p>
        <p><span class="label">Client:</span> {client.get('full_name','')}</p>
        <p><span class="label">Montant total:</span> {invoice.get('total',0):.2f}$</p>
        <p><span class="label">Échéance:</span> {str(invoice.get('due_date','À réception'))[:10]}</p>
    </div>
    """
    html_admin = _notif_html(f"Facture {invoice.get('invoice_number','')} créée", body_html, "Voir la facture", f"{os.environ.get('FRONTEND_URL','')}/admin/invoices/{invoice.get('id','')}")
    background_tasks.add_task(send_email, ADMIN_EMAIL, f"📄 Facture {invoice.get('invoice_number','')} créée — ServiceFlow", html_admin)
    # Email to client
    if client.get("email"):
        client_body = f"""
        <p>Bonjour {client.get('full_name','').split()[0]},</p>
        <p>Une facture a été émise à votre attention.</p>
        <div class="card">
            <p><span class="label">Numéro:</span> {invoice.get('invoice_number','')}</p>
            <p><span class="label">Montant total:</span> {invoice.get('total',0):.2f}$</p>
            <p><span class="label">Date d'échéance:</span> {str(invoice.get('due_date','À réception'))[:10]}</p>
        </div>
        <p>Vous pouvez consulter et payer cette facture via votre portail client.</p>
        """
        html_client = _notif_html(f"Votre facture {invoice.get('invoice_number','')}", client_body, "Accéder au portail client", f"{os.environ.get('FRONTEND_URL','')}/client/login")
        background_tasks.add_task(send_email, client["email"], f"Votre facture {invoice.get('invoice_number','')} — CMGeorges", html_client)
    background_tasks.add_task(create_notification, f"Facture {invoice.get('invoice_number','')} créée", f"Client: {client.get('full_name','')} — {invoice.get('total',0):.2f}$", "invoice_created", "invoice", invoice.get("id"))

async def notify_payment_received(invoice: dict, client: dict, amount: float, background_tasks: BackgroundTasks):
    """Notification: payment received"""
    body_html = f"""
    <p>Un paiement a été reçu pour la facture <strong>{invoice.get('invoice_number','')}</strong>.</p>
    <div class="card">
        <p><span class="label">Client:</span> {client.get('full_name','') if client else 'N/A'}</p>
        <p><span class="label">Montant reçu:</span> {amount:.2f}$</p>
        <p><span class="label">Solde restant:</span> {invoice.get('balance_due',0):.2f}$</p>
        <p><span class="label">Statut:</span> {'✅ Payée en totalité' if invoice.get('status') == 'paid' else '⚠️ Paiement partiel'}</p>
    </div>
    """
    html = _notif_html(f"Paiement reçu — {invoice.get('invoice_number','')}", body_html, "Voir la facture", f"{os.environ.get('FRONTEND_URL','')}/admin/invoices/{invoice.get('id','')}")
    background_tasks.add_task(send_email, ADMIN_EMAIL, f"💰 Paiement reçu: {amount:.2f}$ — {invoice.get('invoice_number','')} — ServiceFlow", html)
    background_tasks.add_task(create_notification, f"Paiement de {amount:.2f}$ reçu", f"Facture {invoice.get('invoice_number','')} — Solde: {invoice.get('balance_due',0):.2f}$", "payment_received", "invoice", invoice.get("id"))

async def notify_project_status(project: dict, old_status: str, new_status: str, client: dict, background_tasks: BackgroundTasks):
    """Notification: project status changed"""
    status_labels = {"draft":"Brouillon","scheduled":"Planifié","in_progress":"En cours","on_hold":"En pause","completed":"Terminé ✅","cancelled":"Annulé"}
    old_lbl = status_labels.get(old_status, old_status)
    new_lbl = status_labels.get(new_status, new_status)
    body_html = f"""
    <p>Le statut du projet <strong>{project.get('title','')}</strong> a changé.</p>
    <div class="card">
        <p><span class="label">Projet:</span> {project.get('title','')}</p>
        <p><span class="label">Client:</span> {client.get('full_name','N/A') if client else 'N/A'}</p>
        <p><span class="label">Ancien statut:</span> {old_lbl}</p>
        <p><span class="label">Nouveau statut:</span> {new_lbl}</p>
    </div>
    """
    html_admin = _notif_html(f"Projet mis à jour: {project.get('title','')}", body_html, "Voir le projet", f"{os.environ.get('FRONTEND_URL','')}/admin/projects/{project.get('id','')}")
    background_tasks.add_task(send_email, ADMIN_EMAIL, f"🔄 Projet {new_lbl}: {project.get('title','')} — ServiceFlow", html_admin)
    if client and client.get("email"):
        client_body = f"""
        <p>Bonjour {client.get('full_name','').split()[0]},</p>
        <p>Votre projet <strong>{project.get('title','')}</strong> a été mis à jour.</p>
        <div class="card">
            <p><span class="label">Nouveau statut:</span> {new_lbl}</p>
            {f"<p><span class='label'>Progression:</span> {project.get('progress',0)}%</p>" if project.get('progress') else ''}
        </div>
        <p>Connectez-vous au portail client pour plus de détails.</p>
        """
        html_client = _notif_html(f"Mise à jour de votre projet", client_body, "Voir mon projet", f"{os.environ.get('FRONTEND_URL','')}/client/dashboard")
        background_tasks.add_task(send_email, client["email"], f"Mise à jour: {project.get('title','')} — CMGeorges", html_client)
    background_tasks.add_task(create_notification, f"Projet: {new_lbl}", f"{project.get('title','')} — {old_lbl} → {new_lbl}", "project_status", "project", project.get("id"))


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
    
    # Send notification emails + create in-app notification
    lead_dict = {**doc, "id": lead.id}
    await notify_new_lead(lead_dict, background_tasks)
    # Confirmation email to client
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
async def get_clients(status: Optional[ClientStatus] = None, user: dict = Depends(get_current_user)):
    """Get all clients"""
    query = {}
    if status:
        query["status"] = status
    
    clients = await db.clients.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
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
    
    # Email + in-app notification
    background_tasks = BackgroundTasks()
    invoice_dict = {**doc, "id": invoice.id}
    await notify_invoice_created(invoice_dict, client, background_tasks)
    for task in background_tasks.tasks:
        asyncio.create_task(task.func(*task.args, **task.kwargs))
    
    return invoice

@admin_router.get("/invoices", response_model=List[Invoice])
async def get_invoices(client_id: Optional[str] = None, status: Optional[InvoiceStatus] = None, user: dict = Depends(get_current_user)):
    """Get all invoices"""
    query = {}
    if client_id:
        query["client_id"] = client_id
    if status:
        query["status"] = status
    
    invoices = await db.invoices.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
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
async def add_payment(invoice_id: str, payment: PaymentCreate, request: Request, background_tasks: BackgroundTasks, user: dict = Depends(get_current_user)):
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
    client = None
    if invoice.get("client_id"):
        await db.clients.update_one(
            {"id": invoice["client_id"]},
            {"$inc": {"total_revenue": payment.amount}}
        )
        client = await db.clients.find_one({"id": invoice["client_id"]}, {"_id": 0})
    
    await create_audit_log("payment_added", "invoice", invoice_id, user=user, details={"amount": payment.amount, "method": payment.method}, request=request)
    
    # Send payment notification
    updated_invoice = {**invoice, "id": invoice_id, "balance_due": round(max(0, new_balance), 2), "status": new_status}
    await notify_payment_received(updated_invoice, client, payment.amount, background_tasks)
    
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
async def get_projects(client_id: Optional[str] = None, status: Optional[ProjectStatus] = None, user: dict = Depends(get_current_user)):
    """Get all projects"""
    query = {}
    if client_id:
        query["client_id"] = client_id
    if status:
        query["status"] = status
    
    projects = await db.projects.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
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
async def update_project(project_id: str, update: ProjectUpdate, request: Request, background_tasks: BackgroundTasks, user: dict = Depends(get_current_user)):
    """Update project"""
    # Get current project to check status change
    current_project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not current_project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    old_status = current_project.get("status")
    
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
    
    # Send notification if status changed
    new_status = update_data.get("status")
    if new_status and new_status != old_status:
        updated_project = {**current_project, **update_data, "id": project_id}
        client = None
        if current_project.get("client_id"):
            client = await db.clients.find_one({"id": current_project["client_id"]}, {"_id": 0})
        await notify_project_status(updated_project, old_status, new_status, client, background_tasks)
    
    return await get_project(project_id, user)


# ==================== PROJECT TASKS ====================
@admin_router.post("/projects/{project_id}/tasks")
async def create_project_task(project_id: str, task: ProjectTaskCreate, user: dict = Depends(get_current_user)):
    """Add a task to a project"""
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    tasks = project.get("tasks", [])
    new_task = {
        "id": str(uuid.uuid4()),
        "title": task.title,
        "description": task.description,
        "status": "pending",
        "assigned_to": task.assigned_to,
        "due_date": task.due_date,
        "completed_at": None,
        "order": len(tasks)
    }
    tasks.append(new_task)
    
    # Recalculate progress
    completed_count = sum(1 for t in tasks if t.get("status") == "completed")
    progress = int((completed_count / len(tasks)) * 100) if tasks else 0
    
    # Add timeline event
    timeline = project.get("timeline", [])
    timeline.append({
        "id": str(uuid.uuid4()),
        "event_type": "task_added",
        "description": f"Tâche ajoutée: {task.title}",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.get("full_name", user.get("email")),
        "metadata": {"task_id": new_task["id"]}
    })
    
    await db.projects.update_one(
        {"id": project_id},
        {"$set": {"tasks": tasks, "progress": progress, "timeline": timeline}}
    )
    
    return {"task": new_task, "progress": progress}


@admin_router.patch("/projects/{project_id}/tasks/{task_id}")
async def update_project_task(project_id: str, task_id: str, status: str, user: dict = Depends(get_current_user)):
    """Update a task status"""
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    tasks = project.get("tasks", [])
    task_found = False
    task_title = ""
    
    for task in tasks:
        if task.get("id") == task_id:
            task["status"] = status
            task_title = task.get("title", "")
            if status == "completed":
                task["completed_at"] = datetime.now(timezone.utc).isoformat()
            task_found = True
            break
    
    if not task_found:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Recalculate progress
    completed_count = sum(1 for t in tasks if t.get("status") == "completed")
    progress = int((completed_count / len(tasks)) * 100) if tasks else 0
    
    # Add timeline event if task completed
    timeline = project.get("timeline", [])
    if status == "completed":
        timeline.append({
            "id": str(uuid.uuid4()),
            "event_type": "task_completed",
            "description": f"Tâche complétée: {task_title}",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": user.get("full_name", user.get("email")),
            "metadata": {"task_id": task_id}
        })
    
    # Update project status based on progress
    new_project_status = project.get("status")
    if progress == 100:
        new_project_status = "completed"
    elif progress > 0 and project.get("status") == "pending":
        new_project_status = "in_progress"
    
    await db.projects.update_one(
        {"id": project_id},
        {"$set": {"tasks": tasks, "progress": progress, "timeline": timeline, "status": new_project_status}}
    )
    
    return {"progress": progress, "status": new_project_status}


@admin_router.delete("/projects/{project_id}/tasks/{task_id}")
async def delete_project_task(project_id: str, task_id: str, user: dict = Depends(get_current_user)):
    """Delete a task from a project"""
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    tasks = [t for t in project.get("tasks", []) if t.get("id") != task_id]
    
    # Recalculate progress
    completed_count = sum(1 for t in tasks if t.get("status") == "completed")
    progress = int((completed_count / len(tasks)) * 100) if tasks else 0
    
    await db.projects.update_one(
        {"id": project_id},
        {"$set": {"tasks": tasks, "progress": progress}}
    )
    
    return {"success": True, "progress": progress}


@admin_router.post("/projects/{project_id}/timeline")
async def add_timeline_event(project_id: str, event_type: str, description: str, user: dict = Depends(get_current_user)):
    """Add a timeline event (note) to a project"""
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    timeline = project.get("timeline", [])
    new_event = {
        "id": str(uuid.uuid4()),
        "event_type": event_type,
        "description": description,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.get("full_name", user.get("email")),
        "metadata": {}
    }
    timeline.append(new_event)
    
    await db.projects.update_one(
        {"id": project_id},
        {"$set": {"timeline": timeline}}
    )
    
    return new_event


@admin_router.get("/projects/{project_id}/report")
async def generate_project_report(project_id: str, user: dict = Depends(get_current_user)):
    """Generate a project intervention report"""
    from io import BytesIO
    from fpdf import FPDF
    
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    client = None
    if project.get("client_id"):
        client = await db.clients.find_one({"id": project["client_id"]}, {"_id": 0})
    
    # Create PDF
    pdf = FPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)
    
    # Header
    pdf.set_font("Helvetica", "B", 20)
    pdf.cell(0, 15, "Rapport d'intervention", ln=True, align="C")
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 8, f"Genere le {datetime.now().strftime('%d/%m/%Y a %H:%M')}", ln=True, align="C")
    pdf.ln(10)
    
    # Project Info
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 10, project.get("title", "Sans titre"), ln=True)
    pdf.set_font("Helvetica", "", 11)
    
    service_labels = {"manual": "Deco Touche", "furniture": "Mobilier", "tech": "Tech"}
    pdf.cell(0, 7, f"Service: {service_labels.get(project.get('service_type', ''), project.get('service_type', ''))}", ln=True)
    
    status_labels = {"pending": "En attente", "in_progress": "En cours", "completed": "Termine", "on_hold": "En pause"}
    pdf.cell(0, 7, f"Statut: {status_labels.get(project.get('status', ''), project.get('status', ''))}", ln=True)
    pdf.cell(0, 7, f"Progression: {project.get('progress', 0)}%", ln=True)
    pdf.ln(5)
    
    # Client Info
    if client:
        pdf.set_font("Helvetica", "B", 12)
        pdf.cell(0, 8, "Client", ln=True)
        pdf.set_font("Helvetica", "", 11)
        pdf.cell(0, 7, f"Nom: {client.get('full_name', 'N/A')}", ln=True)
        pdf.cell(0, 7, f"Email: {client.get('email', 'N/A')}", ln=True)
        pdf.cell(0, 7, f"Telephone: {client.get('phone', 'N/A')}", ln=True)
        if client.get("address"):
            pdf.cell(0, 7, f"Adresse: {client.get('address', '')}, {client.get('city', '')}", ln=True)
        pdf.ln(5)
    
    # Description
    if project.get("description"):
        pdf.set_font("Helvetica", "B", 12)
        pdf.cell(0, 8, "Description", ln=True)
        pdf.set_font("Helvetica", "", 11)
        pdf.multi_cell(0, 7, project.get("description", ""))
        pdf.ln(5)
    
    # Tasks
    tasks = project.get("tasks", [])
    if tasks:
        pdf.set_font("Helvetica", "B", 12)
        pdf.cell(0, 8, f"Taches ({len(tasks)})", ln=True)
        pdf.set_font("Helvetica", "", 10)
        for task in tasks:
            status_icon = "[X]" if task.get("status") == "completed" else "[ ]"
            pdf.cell(0, 6, f"  {status_icon} {task.get('title', '')}", ln=True)
        pdf.ln(5)
    
    # Timeline
    timeline = project.get("timeline", [])
    if timeline:
        pdf.set_font("Helvetica", "B", 12)
        pdf.cell(0, 8, "Historique", ln=True)
        pdf.set_font("Helvetica", "", 9)
        for event in sorted(timeline, key=lambda x: x.get("created_at", ""), reverse=True)[:10]:
            date_str = event.get("created_at", "")[:10]
            pdf.cell(0, 5, f"  - [{date_str}] {event.get('description', '')}", ln=True)
    
    # Notes
    if project.get("notes"):
        pdf.ln(5)
        pdf.set_font("Helvetica", "B", 12)
        pdf.cell(0, 8, "Notes", ln=True)
        pdf.set_font("Helvetica", "", 11)
        pdf.multi_cell(0, 7, project.get("notes", ""))
    
    # Footer
    pdf.ln(10)
    pdf.set_font("Helvetica", "I", 9)
    pdf.cell(0, 5, "CMGeorges - Montreal & Rive-Sud", ln=True, align="C")
    
    # Output
    pdf_bytes = BytesIO()
    pdf.output(pdf_bytes)
    pdf_bytes.seek(0)
    
    # Add timeline event
    timeline = project.get("timeline", [])
    timeline.append({
        "id": str(uuid.uuid4()),
        "event_type": "report_generated",
        "description": "Rapport d'intervention genere",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.get("full_name", user.get("email")),
        "metadata": {}
    })
    await db.projects.update_one({"id": project_id}, {"$set": {"timeline": timeline}})
    
    return Response(
        content=pdf_bytes.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=rapport_{project_id[:8]}.pdf"}
    )


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
    
    # Average margins from quotes
    quotes = await db.quotes.find({}, {"_id": 0, "margin_percent": 1, "lead_id": 1}).to_list(1000)
    
    manual_margins = []
    tech_margins = []
    for quote in quotes:
        if quote.get("margin_percent"):
            lead = await db.leads.find_one({"id": quote.get("lead_id")}, {"_id": 0, "service_type": 1})
            if lead:
                if lead.get("service_type") == "tech":
                    tech_margins.append(quote["margin_percent"])
                else:
                    manual_margins.append(quote["margin_percent"])
    
    average_margin_manual = sum(manual_margins) / len(manual_margins) if manual_margins else 55.0
    average_margin_tech = sum(tech_margins) / len(tech_margins) if tech_margins else 70.0
    
    # Estimated monthly costs (placeholder - would come from expense tracking)
    monthly_costs = monthly_revenue * 0.4
    monthly_profit = monthly_revenue - monthly_costs
    
    # Top services (from leads)
    service_counts = {}
    leads = await db.leads.find({"status": "won"}, {"_id": 0, "service_type": 1}).to_list(1000)
    for lead in leads:
        stype = lead.get("service_type", "other")
        service_counts[stype] = service_counts.get(stype, 0) + 1
    
    top_services = [{"service": k, "count": v} for k, v in sorted(service_counts.items(), key=lambda x: x[1], reverse=True)][:5]
    
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
    elements.append(Paragraph("Montréal & Rive-Sud | 514-386-1743 | info@cmgeorges.com", styles['CMGSubHeader']))
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
    elements.append(Paragraph("Montréal & Rive-Sud | 514-386-1743 | info@cmgeorges.com", styles['CMGSubHeader']))
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
    
    # Build portal URL
    portal_url = f"https://flow-preview-6.preview.emergentagent.com/portail-client?token={access_token}"
    
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

# ==================== DELETE LEAD ====================
@admin_router.delete("/leads/{lead_id}")
async def delete_lead(lead_id: str, request: Request, user: dict = Depends(require_admin)):
    """Delete a lead"""
    result = await db.leads.delete_one({"id": lead_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lead non trouvé")
    await create_audit_log("lead_deleted", "lead", lead_id, user=user, request=request)
    return {"message": "Lead supprimé"}

# ==================== SEND INVOICE BY EMAIL ====================
@admin_router.post("/invoices/{invoice_id}/send-email")
async def send_invoice_by_email(invoice_id: str, request: Request, user: dict = Depends(get_current_user)):
    """Send invoice PDF by email to client"""
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Facture non trouvée")

    client = await db.clients.find_one({"id": invoice["client_id"]}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")

    pdf_buffer = generate_invoice_pdf(invoice, client)
    pdf_bytes = pdf_buffer.getvalue()

    due_date_str = invoice.get("due_date", "À réception")
    if isinstance(due_date_str, str) and "T" in str(due_date_str):
        try:
            due_date_str = datetime.fromisoformat(str(due_date_str)).strftime("%d/%m/%Y")
        except Exception:
            pass

    html_content = f"""
    <!DOCTYPE html><html><head><style>
    body{{font-family:Arial,sans-serif;color:#333;}}
    .header{{background:#1a365d;color:white;padding:20px;text-align:center;}}
    .header h1{{color:#d4af37;margin:0;}}
    .content{{padding:30px;}}
    .highlight{{background:#f8fafc;border-left:4px solid #d4af37;padding:15px;margin:20px 0;}}
    .footer{{background:#1a365d;color:white;padding:20px;text-align:center;}}
    </style></head><body>
    <div class="header"><h1>CMGeorges</h1><p>Montréal & Rive-Sud</p></div>
    <div class="content">
    <h2>Bonjour {client['full_name']},</h2>
    <p>Veuillez trouver ci-joint votre facture.</p>
    <div class="highlight">
    <strong>Facture:</strong> {invoice['invoice_number']}<br>
    <strong>Montant total:</strong> {invoice['total']:.2f}$<br>
    <strong>Date d'échéance:</strong> {due_date_str}
    </div>
    <p>Pour toute question, contactez-nous au 514-386-1743 ou info@cmgeorges.com</p>
    <p>Merci de votre confiance!</p>
    </div>
    <div class="footer"><p>CMGeorges | 514-386-1743 | info@cmgeorges.com</p></div>
    </body></html>
    """

    if not resend.api_key:
        return {"message": "Resend non configuré - PDF disponible en téléchargement direct"}

    try:
        params = {
            "from": SENDER_EMAIL,
            "to": [client["email"]],
            "subject": f"Facture {invoice['invoice_number']} - CMGeorges",
            "html": html_content,
            "attachments": [{"filename": f"facture-{invoice['invoice_number']}.pdf", "content": list(pdf_bytes)}]
        }
        await asyncio.to_thread(resend.Emails.send, params)
        await db.invoices.update_one({"id": invoice_id}, {"$set": {"status": "sent"}})
        await create_audit_log("invoice_sent_email", "invoice", invoice_id, user=user, request=request)
        return {"message": f"Facture envoyée à {client['email']}"}
    except Exception as e:
        logger.error(f"Failed to send invoice email: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur d'envoi: {str(e)}")

# ==================== SEND QUOTE BY EMAIL ====================
@admin_router.post("/quotes/{quote_id}/send-email")
async def send_quote_by_email(quote_id: str, request: Request, user: dict = Depends(get_current_user)):
    """Send quote PDF by email to lead/client"""
    quote = await db.quotes.find_one({"id": quote_id}, {"_id": 0})
    if not quote:
        raise HTTPException(status_code=404, detail="Soumission non trouvée")

    lead = await db.leads.find_one({"id": quote["lead_id"]}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead non trouvé")

    client = None
    if quote.get("client_id"):
        client = await db.clients.find_one({"id": quote["client_id"]}, {"_id": 0})

    pdf_buffer = generate_quote_pdf(quote, lead, client)
    pdf_bytes = pdf_buffer.getvalue()

    html_content = f"""
    <!DOCTYPE html><html><head><style>
    body{{font-family:Arial,sans-serif;color:#333;}}
    .header{{background:#1a365d;color:white;padding:20px;text-align:center;}}
    .header h1{{color:#d4af37;margin:0;}}
    .content{{padding:30px;}}
    .highlight{{background:#f8fafc;border-left:4px solid #d4af37;padding:15px;margin:20px 0;}}
    .footer{{background:#1a365d;color:white;padding:20px;text-align:center;}}
    </style></head><body>
    <div class="header"><h1>CMGeorges</h1><p>Montréal & Rive-Sud</p></div>
    <div class="content">
    <h2>Bonjour {lead['full_name']},</h2>
    <p>Veuillez trouver ci-joint votre soumission.</p>
    <div class="highlight">
    <strong>Montant total (taxes incluses):</strong> {quote['total_with_tax']:.2f}$<br>
    <strong>Validité:</strong> 30 jours
    </div>
    <p>Pour accepter ou pour toute question, contactez-nous au 514-386-1743 ou info@cmgeorges.com</p>
    <p>Merci de votre confiance!</p>
    </div>
    <div class="footer"><p>CMGeorges | 514-386-1743 | info@cmgeorges.com</p></div>
    </body></html>
    """

    if not resend.api_key:
        return {"message": "Resend non configuré - PDF disponible en téléchargement direct"}

    try:
        params = {
            "from": SENDER_EMAIL,
            "to": [lead["email"]],
            "subject": f"Soumission CMGeorges - {lead['full_name']}",
            "html": html_content,
            "attachments": [{"filename": f"soumission-{quote['id'][:8]}.pdf", "content": list(pdf_bytes)}]
        }
        await asyncio.to_thread(resend.Emails.send, params)
        await db.quotes.update_one({"id": quote_id}, {"$set": {"status": "sent"}})
        await create_audit_log("quote_sent_email", "quote", quote_id, user=user, request=request)
        return {"message": f"Soumission envoyée à {lead['email']}"}
    except Exception as e:
        logger.error(f"Failed to send quote email: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur d'envoi: {str(e)}")

    try:
        params = {
            "from": SENDER_EMAIL,
            "to": [lead["email"]],
            "subject": f"Soumission CMGeorges - {lead['full_name']}",
            "html": html_content,
            "attachments": [{"filename": f"soumission-{quote['id'][:8]}.pdf", "content": list(pdf_bytes)}]
        }
        await asyncio.to_thread(resend.Emails.send, params)
        await db.quotes.update_one({"id": quote_id}, {"$set": {"status": "sent"}})
        await create_audit_log("quote_sent_email", "quote", quote_id, user=user, request=request)
        return {"message": f"Soumission envoyée à {lead['email']}"}
    except Exception as e:
        logger.error(f"Failed to send quote email: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur d'envoi: {str(e)}")


# ===================== TENANT MANAGEMENT =====================

class TenantCreate(BaseModel):
    name: str
    slug: str
    owner_email: str
    plan: str = "starter"

@v1_router.get("/tenants/current")
async def get_current_tenant(user: dict = Depends(get_current_user)):
    """Get the current user's tenant info"""
    tenant_id = user.get("tenant_id", "default")
    tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
    if not tenant:
        return {"id": "default", "name": "CMGeorges", "slug": "cmgeorges", "plan": "pro"}
    return tenant

@v1_router.get("/admin/users-list")
async def get_users_list(user: dict = Depends(require_admin)):
    """Get all users for admin management"""
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(200)
    return users

@v1_router.post("/admin/users-create")
async def create_user_admin(data: dict, request: Request, user: dict = Depends(require_admin)):
    """Create a new user"""
    if not data.get("email") or not data.get("password"):
        raise HTTPException(status_code=400, detail="Email et mot de passe requis")
    existing = await db.users.find_one({"email": data["email"]})
    if existing:
        raise HTTPException(status_code=400, detail="Cet email existe déjà")
    pw_hash = bcrypt.hashpw(data["password"].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    new_user = {
        "id": str(uuid.uuid4()),
        "email": data["email"],
        "full_name": data.get("full_name", ""),
        "role": data.get("role", "staff"),
        "type": data.get("type", "staff"),
        "is_active": True,
        "password_hash": pw_hash,
        "tenant_id": data.get("tenant_id", "default"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(new_user)
    await create_audit_log("user_created", "user", new_user["id"], user=user, request=request)
    return {"id": new_user["id"], "email": new_user["email"], "role": new_user["role"]}

@v1_router.patch("/admin/users/{user_id}")
async def update_user_admin(user_id: str, data: dict, request: Request, user: dict = Depends(require_admin)):
    """Update a user"""
    update_data = {}
    if "role" in data:
        update_data["role"] = data["role"]
    if "is_active" in data:
        update_data["is_active"] = data["is_active"]
    if "full_name" in data:
        update_data["full_name"] = data["full_name"]
    if data.get("password"):
        update_data["password_hash"] = bcrypt.hashpw(data["password"].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    if not update_data:
        raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")
    result = await db.users.update_one({"id": user_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    await create_audit_log("user_updated", "user", user_id, user=user, request=request)
    return {"message": "Utilisateur mis à jour"}

@v1_router.delete("/admin/users/{user_id}")
async def delete_user_admin(user_id: str, request: Request, user: dict = Depends(require_admin)):
    """Delete a user"""
    target = await db.users.find_one({"id": user_id})
    if not target:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    if target.get("role") == "super_admin":
        raise HTTPException(status_code=403, detail="Impossible de supprimer un super admin")
    await db.users.delete_one({"id": user_id})
    await create_audit_log("user_deleted", "user", user_id, user=user, request=request)
    return {"message": "Utilisateur supprimé"}


# ===================== CLIENT PORTAL AUTH =====================

class ClientRegister(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    phone: Optional[str] = None

class ClientLogin(BaseModel):
    email: EmailStr
    password: str

client_router = APIRouter(prefix="/client")

@client_router.post("/register")
async def client_register(data: ClientRegister):
    """Register a new client portal user"""
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")
    pw_hash = bcrypt.hashpw(data.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    user_id = str(uuid.uuid4())
    new_user = {
        "id": user_id,
        "email": data.email,
        "full_name": data.full_name,
        "phone": data.phone or "",
        "role": "client",
        "type": "client",
        "is_active": True,
        "password_hash": pw_hash,
        "tenant_id": "default",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(new_user)
    # Create corresponding client record
    client_record = {
        "id": str(uuid.uuid4()),
        "full_name": data.full_name,
        "email": data.email,
        "phone": data.phone or "",
        "portal_user_id": user_id,
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.clients.insert_one(client_record)
    token = create_access_token(user_id, data.email, "client")
    return {"access_token": token, "user": {"id": user_id, "email": data.email, "full_name": data.full_name, "role": "client"}}

@client_router.post("/login")
async def client_login(credentials: ClientLogin):
    """Client portal login"""
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Identifiants invalides")
    try:
        if not bcrypt.checkpw(credentials.password.encode('utf-8'), user.get("password_hash", "").encode('utf-8')):
            raise HTTPException(status_code=401, detail="Identifiants invalides")
    except Exception:
        raise HTTPException(status_code=401, detail="Identifiants invalides")
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Compte désactivé")
    token = create_access_token(user["id"], user["email"], user.get("role", "client"))
    return {"access_token": token, "user": {"id": user["id"], "email": user["email"], "full_name": user.get("full_name", ""), "role": user.get("role", "client")}}

@client_router.get("/dashboard")
async def client_dashboard(user: dict = Depends(get_current_user)):
    """Get client dashboard data"""
    # Find the client record linked to this user
    client = await db.clients.find_one({"portal_user_id": user["id"]}, {"_id": 0})
    if not client:
        # Fallback: find by email
        client = await db.clients.find_one({"email": user["email"]}, {"_id": 0})
    
    projects, invoices, quotes = [], [], []
    if client:
        client_id = client["id"]
        projects = await db.projects.find({"client_id": client_id}, {"_id": 0}).sort("created_at", -1).to_list(20)
        invoices = await db.invoices.find({"client_id": client_id}, {"_id": 0}).sort("created_at", -1).to_list(20)
        quotes = await db.quotes.find({"client_id": client_id}, {"_id": 0}).sort("created_at", -1).to_list(10)
    
    return {
        "client": client,
        "stats": {
            "projects_count": len(projects),
            "invoices_count": len(invoices),
            "pending_amount": sum(i.get("balance_due", 0) for i in invoices if i.get("status") not in ["paid", "cancelled"]),
            "active_projects": len([p for p in projects if p.get("status") in ["in_progress", "scheduled"]]),
        },
        "recent_projects": projects[:5],
        "recent_invoices": invoices[:5],
    }

@client_router.get("/projects")
async def client_projects(user: dict = Depends(get_current_user)):
    """Get all projects for the logged-in client"""
    client = await db.clients.find_one({"portal_user_id": user["id"]}, {"_id": 0})
    if not client:
        client = await db.clients.find_one({"email": user["email"]}, {"_id": 0})
    if not client:
        return []
    return await db.projects.find({"client_id": client["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)

@client_router.get("/invoices")
async def client_invoices(user: dict = Depends(get_current_user)):
    """Get all invoices for the logged-in client"""
    client = await db.clients.find_one({"portal_user_id": user["id"]}, {"_id": 0})
    if not client:
        client = await db.clients.find_one({"email": user["email"]}, {"_id": 0})
    if not client:
        return []
    return await db.invoices.find({"client_id": client["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)


# ===================== STRIPE SAAS SUBSCRIPTIONS =====================

saas_router = APIRouter(prefix="/saas")

@saas_router.get("/plans")
async def get_saas_plans():
    """Get available ServiceFlow SaaS subscription plans"""
    return [
        {
            "id": "starter",
            "name": "Starter",
            "price": 29.00,
            "currency": "CAD",
            "interval": "mois",
            "description": "Pour les petites équipes",
            "features": ["2 utilisateurs", "50 projets", "5GB stockage", "Portail client", "PDF & Email"],
            "recommended": False
        },
        {
            "id": "pro",
            "name": "Pro",
            "price": 79.00,
            "currency": "CAD",
            "interval": "mois",
            "description": "Pour les entreprises en croissance",
            "features": ["5 utilisateurs", "200 projets", "25GB stockage", "Portail client", "PDF & Email", "Work Orders", "Calendrier"],
            "recommended": True
        },
        {
            "id": "business",
            "name": "Business",
            "price": 149.00,
            "currency": "CAD",
            "interval": "mois",
            "description": "Pour les grandes équipes",
            "features": ["Utilisateurs illimités", "Projets illimités", "100GB stockage", "Tout Pro inclus", "Multi-tenant", "API Access", "Support prioritaire"],
            "recommended": False
        }
    ]

@saas_router.post("/subscribe")
async def create_subscription_checkout(data: dict, request: Request, user: dict = Depends(get_current_user)):
    """Create a Stripe checkout session for a SaaS subscription"""
    plan_id = data.get("plan_id")
    if plan_id not in SERVICEFLOW_PLANS:
        raise HTTPException(status_code=400, detail="Plan invalide")
    
    plan = SERVICEFLOW_PLANS[plan_id]
    host_url = data.get("origin_url", str(request.base_url).rstrip('/'))
    
    stripe_checkout = StripeCheckout(
        api_key=STRIPE_API_KEY,
        webhook_url=f"{str(request.base_url).rstrip('/')}/api/webhook/stripe"
    )
    
    success_url = f"{host_url}/admin/subscription?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{host_url}/serviceflow/pricing"
    
    checkout_req = CheckoutSessionRequest(
        amount=float(plan["price"]),
        currency=plan["currency"],
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "type": "saas_subscription",
            "plan_id": plan_id,
            "user_id": user["id"],
            "user_email": user["email"],
        }
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_req)
    
    # Store pending transaction
    await db.payment_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "type": "saas_subscription",
        "plan_id": plan_id,
        "amount": plan["price"],
        "currency": plan["currency"],
        "user_id": user["id"],
        "user_email": user["email"],
        "payment_status": "pending",
        "status": "initiated",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "_id_exclude": True
    })
    
    return {"url": session.url, "session_id": session.session_id}

@saas_router.get("/checkout-status/{session_id}")
async def get_checkout_status(session_id: str, request: Request, user: dict = Depends(get_current_user)):
    """Check Stripe checkout session status and activate subscription"""
    stripe_checkout = StripeCheckout(
        api_key=STRIPE_API_KEY,
        webhook_url=f"{str(request.base_url).rstrip('/')}/api/webhook/stripe"
    )
    
    checkout_status = await stripe_checkout.get_checkout_status(session_id)
    
    # Update payment transaction
    existing = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if existing and existing.get("payment_status") != "paid" and checkout_status.payment_status == "paid":
        # Activate subscription
        plan_id = existing.get("plan_id", "starter")
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": "paid", "status": "completed", "paid_at": datetime.now(timezone.utc).isoformat()}}
        )
        # Create/update subscription record
        await db.subscriptions.update_one(
            {"user_id": user["id"]},
            {"$set": {
                "id": str(uuid.uuid4()),
                "user_id": user["id"],
                "tenant_id": user.get("tenant_id", "default"),
                "plan_id": plan_id,
                "status": "active",
                "session_id": session_id,
                "amount": existing.get("amount"),
                "activated_at": datetime.now(timezone.utc).isoformat(),
                "current_period_end": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }},
            upsert=True
        )
        await create_audit_log("subscription_activated", "subscription", session_id, user=user, request=request)
    
    return {
        "status": checkout_status.status,
        "payment_status": checkout_status.payment_status,
        "amount": checkout_status.amount_total / 100,
        "plan_id": existing.get("plan_id") if existing else None,
    }

@saas_router.get("/subscription")
async def get_my_subscription(user: dict = Depends(get_current_user)):
    """Get current user's subscription"""
    sub = await db.subscriptions.find_one({"user_id": user["id"]}, {"_id": 0})
    if not sub:
        return {"status": "none", "plan_id": None}
    return sub

# Invoice payment via Stripe
invoice_pay_router = APIRouter(prefix="/pay")

@invoice_pay_router.post("/invoice/{invoice_id}")
async def pay_invoice_online(invoice_id: str, data: dict, request: Request, user: dict = Depends(get_current_user)):
    """Create Stripe checkout for invoice payment"""
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    balance = invoice.get("balance_due", invoice.get("total", 0))
    if balance <= 0:
        raise HTTPException(status_code=400, detail="Facture déjà payée")
    
    host_url = data.get("origin_url", str(request.base_url).rstrip('/'))
    stripe_checkout = StripeCheckout(
        api_key=STRIPE_API_KEY,
        webhook_url=f"{str(request.base_url).rstrip('/')}/api/webhook/stripe"
    )
    
    success_url = f"{host_url}/client/invoices?session_id={{CHECKOUT_SESSION_ID}}&invoice={invoice_id}"
    cancel_url = f"{host_url}/client/invoices"
    
    checkout_req = CheckoutSessionRequest(
        amount=float(round(balance, 2)),
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"type": "invoice_payment", "invoice_id": invoice_id, "user_id": user["id"]}
    )
    session = await stripe_checkout.create_checkout_session(checkout_req)
    
    await db.payment_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "type": "invoice_payment",
        "invoice_id": invoice_id,
        "amount": balance,
        "currency": "usd",
        "user_id": user["id"],
        "payment_status": "pending",
        "status": "initiated",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    
    return {"url": session.url, "session_id": session.session_id}

@invoice_pay_router.get("/status/{session_id}")
async def get_invoice_payment_status(session_id: str, request: Request, user: dict = Depends(get_current_user)):
    """Check invoice payment status"""
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=f"{str(request.base_url).rstrip('/')}/api/webhook/stripe")
    checkout_status = await stripe_checkout.get_checkout_status(session_id)
    
    existing = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if existing and existing.get("payment_status") != "paid" and checkout_status.payment_status == "paid":
        invoice_id = existing.get("invoice_id")
        amount = existing.get("amount", 0)
        await db.payment_transactions.update_one({"session_id": session_id}, {"$set": {"payment_status": "paid", "status": "completed"}})
        if invoice_id:
            invoice = await db.invoices.find_one({"id": invoice_id})
            if invoice:
                new_paid = invoice.get("amount_paid", 0) + amount
                new_balance = max(0, invoice.get("total", 0) - new_paid)
                new_status = "paid" if new_balance <= 0 else "partial"
                await db.invoices.update_one({"id": invoice_id}, {"$set": {"amount_paid": new_paid, "balance_due": new_balance, "status": new_status}})
    
    return {"status": checkout_status.status, "payment_status": checkout_status.payment_status}


# Stripe Webhook
@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhooks"""
    body = await request.body()
    stripe_sig = request.headers.get("Stripe-Signature", "")
    try:
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
        event = await stripe_checkout.handle_webhook(body, stripe_sig)
        if event.payment_status == "paid":
            await db.payment_transactions.update_one(
                {"session_id": event.session_id},
                {"$set": {"payment_status": "paid", "status": "completed"}}
            )
        logger.info(f"Stripe webhook: {event.event_type}")
    except Exception as e:
        logger.warning(f"Stripe webhook handling: {str(e)}")
    return {"received": True}


# ==================== NOTIFICATIONS ENDPOINTS ====================
@admin_router.get("/notifications")
async def get_notifications(
    unread_only: bool = False,
    limit: int = 50,
    user: dict = Depends(get_current_user)
):
    """Get notifications for admin users"""
    query = {}
    if unread_only:
        query["is_read"] = False
    
    notifications = await db.notifications.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return notifications

@admin_router.get("/notifications/unread-count")
async def get_unread_notification_count(user: dict = Depends(get_current_user)):
    """Get count of unread notifications"""
    count = await db.notifications.count_documents({"is_read": False})
    return {"count": count}

@admin_router.patch("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user: dict = Depends(get_current_user)):
    """Mark a notification as read"""
    result = await db.notifications.update_one(
        {"id": notification_id},
        {"$set": {"is_read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"success": True}

@admin_router.patch("/notifications/mark-all-read")
async def mark_all_notifications_read(user: dict = Depends(get_current_user)):
    """Mark all notifications as read"""
    result = await db.notifications.update_many(
        {"is_read": False},
        {"$set": {"is_read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"marked_read": result.modified_count}

@admin_router.delete("/notifications/{notification_id}")
async def delete_notification(notification_id: str, user: dict = Depends(get_current_user)):
    """Delete a notification"""
    result = await db.notifications.delete_one({"id": notification_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"success": True}


# Include routers
v1_router.include_router(admin_router)
v1_router.include_router(client_router)
v1_router.include_router(saas_router)
v1_router.include_router(invoice_pay_router)
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
