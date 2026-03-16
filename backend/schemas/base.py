"""Base schemas and enums used throughout ServiceFlow"""

from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from enum import Enum
import uuid


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
    CLIENT = "client"
    TECHNICIAN = "technician"


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


class BlogPostStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class DiscountType(str, Enum):
    PERCENTAGE = "percentage"
    FIXED = "fixed"


class PolicyType(str, Enum):
    TERMS = "terms"
    PRIVACY = "privacy"
    WARRANTY = "warranty"
    CANCELLATION = "cancellation"
    PAYMENT = "payment"


# ==================== BASE MODELS ====================
class TenantMixin(BaseModel):
    """Mixin for multi-tenant models"""
    tenant_id: str = "default"


def generate_uuid() -> str:
    return str(uuid.uuid4())


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()
