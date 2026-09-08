"""Shared Pydantic models for Déco Touché — extracted from server.py.

Used by server.py and by routers/ extracted from the monolith.
Keep this module side-effect free: no DB, no logger, no env vars.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# ==================== ENUMS ====================
class ServiceType(str, Enum):
    MANUAL = "manual"
    FURNITURE = "furniture"
    TECH = "tech"
    MURS_ACCENT = "murs-accent"
    DEMOLITION = "demolition"


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
    ETRANSFER = "etransfer"       # Interac e-Transfer (Canadian)
    CREDIT_CARD = "credit_card"
    CHEQUE = "cheque"
    STRIPE = "stripe"             # Automated: Stripe checkout (card/Apple Pay/Google Pay)
    WISE = "wise"                 # International wire via Wise
    OTHER = "other"


# ==================== LEAD MODELS ====================
class LeadItemBase(BaseModel):
    item_type: ItemType
    brand: ItemBrand
    model: str = ""
    quantity: int = 1
    wall_anchor_required: bool = False


class LeadItem(LeadItemBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))


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
    photos: List[str] = []


class Lead(LeadBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: LeadStatus = LeadStatus.NEW
    items: List[LeadItem] = []
    photos: List[str] = []
    notes: str = ""
    client_id: Optional[str] = None


class LeadUpdate(BaseModel):
    status: Optional[LeadStatus] = None
    notes: Optional[str] = None
    client_id: Optional[str] = None


# ==================== CLIENT MODELS ====================
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


# ==================== CONTACT FORM ====================
class ContactForm(BaseModel):
    name: str
    email: EmailStr
    phone: str = ""
    subject: str
    message: str
    recaptcha_token: Optional[str] = None


# ==================== QUOTE MODELS ====================
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
    valid_until: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc) + timedelta(days=30)
    )
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


# ==================== SIGNATURE ====================
class SignatureData(BaseModel):
    signature_base64: str
    signer_name: Optional[str] = None
    signer_email: Optional[str] = None


# ==================== INVOICE MODELS ====================
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
    payment_link_token: Optional[str] = None
    payment_link_created_at: Optional[str] = None


class InvoiceUpdate(BaseModel):
    status: Optional[InvoiceStatus] = None
    notes: Optional[str] = None
    due_date: Optional[str] = None


class PaymentCreate(BaseModel):
    amount: float
    method: PaymentMethod
    notes: str = ""
