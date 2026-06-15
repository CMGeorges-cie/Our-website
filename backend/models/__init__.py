"""Shared Pydantic models for Déco Touché — extracted from server.py.

Used by server.py and by routers/ extracted from the monolith.
Keep this module side-effect free: no DB, no logger, no env vars.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
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
    ETRANSFER = "etransfer"
    CREDIT_CARD = "credit_card"
    CHEQUE = "cheque"
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
