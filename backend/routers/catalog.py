"""
Service Catalog Router for ServiceFlow
Manage predefined services that can be offered to clients
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from enum import Enum
import uuid

from services.database import get_database, TenantRepository
from middleware.tenant import TenantContext, get_tenant_context, require_role
from routers.auth import get_current_user

router = APIRouter(prefix="/catalog", tags=["Service Catalog"])


# ==================== SCHEMAS ====================
class ServiceCategory(str, Enum):
    RENOVATION = "renovation"
    PAINTING = "painting"
    FURNITURE = "furniture"
    TECH = "tech"
    MAINTENANCE = "maintenance"
    INSTALLATION = "installation"
    OTHER = "other"


class PricingType(str, Enum):
    FIXED = "fixed"           # Prix fixe
    HOURLY = "hourly"         # Prix à l'heure
    PER_UNIT = "per_unit"     # Prix par unité (m², pièce, etc.)
    QUOTE = "quote"           # Sur devis


class ServiceCreate(BaseModel):
    name: str
    description: str = ""
    category: ServiceCategory
    pricing_type: PricingType = PricingType.FIXED
    base_price: float
    unit: str = "forfait"  # forfait, heure, m², pièce, etc.
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    estimated_duration: Optional[str] = None  # "2h", "1 jour", etc.
    includes: List[str] = []  # Ce qui est inclus
    excludes: List[str] = []  # Ce qui n'est pas inclus
    is_featured: bool = False
    sort_order: int = 0


class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[ServiceCategory] = None
    pricing_type: Optional[PricingType] = None
    base_price: Optional[float] = None
    unit: Optional[str] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    estimated_duration: Optional[str] = None
    includes: Optional[List[str]] = None
    excludes: Optional[List[str]] = None
    is_active: Optional[bool] = None
    is_featured: Optional[bool] = None
    sort_order: Optional[int] = None


class ServicePackageCreate(BaseModel):
    """Package grouping multiple services"""
    name: str
    description: str = ""
    service_ids: List[str]
    discount_percent: float = 0  # Réduction en %
    is_featured: bool = False


# ==================== ENDPOINTS ====================
@router.get("")
async def list_services(
    category: Optional[ServiceCategory] = None,
    is_active: bool = True,
    is_featured: Optional[bool] = None,
    tenant_ctx: TenantContext = Depends(get_tenant_context)
):
    """List all services in the catalog"""
    repo = TenantRepository("service_catalog", tenant_ctx.tenant_id)
    
    query = {"is_active": is_active}
    if category:
        query["category"] = category.value
    if is_featured is not None:
        query["is_featured"] = is_featured
    
    services = await repo.find_many(
        query=query,
        sort=[("sort_order", 1), ("name", 1)]
    )
    
    return services


@router.get("/public")
async def list_public_services(
    category: Optional[ServiceCategory] = None,
):
    """List services for public display (no auth required)"""
    db = get_database()
    
    query = {"is_active": True, "tenant_id": "default"}
    if category:
        query["category"] = category.value
    
    services = await db.service_catalog.find(
        query,
        {"_id": 0, "cost_price": 0}  # Hide cost info from public
    ).sort([("is_featured", -1), ("sort_order", 1)]).to_list(100)
    
    return services


@router.post("")
async def create_service(
    data: ServiceCreate,
    tenant_ctx: TenantContext = Depends(require_role("admin"))
):
    """Create a new service in the catalog (admin only)"""
    repo = TenantRepository("service_catalog", tenant_ctx.tenant_id)
    
    service = {
        "id": str(uuid.uuid4()),
        "name": data.name,
        "description": data.description,
        "category": data.category.value,
        "pricing_type": data.pricing_type.value,
        "base_price": data.base_price,
        "unit": data.unit,
        "min_price": data.min_price,
        "max_price": data.max_price,
        "estimated_duration": data.estimated_duration,
        "includes": data.includes,
        "excludes": data.excludes,
        "is_active": True,
        "is_featured": data.is_featured,
        "sort_order": data.sort_order,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": tenant_ctx.user_id,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    
    await repo.insert_one(service)
    return service


@router.get("/{service_id}")
async def get_service(
    service_id: str,
    tenant_ctx: TenantContext = Depends(get_tenant_context)
):
    """Get a specific service"""
    repo = TenantRepository("service_catalog", tenant_ctx.tenant_id)
    
    service = await repo.find_one({"id": service_id})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    return service


@router.patch("/{service_id}")
async def update_service(
    service_id: str,
    data: ServiceUpdate,
    tenant_ctx: TenantContext = Depends(require_role("admin"))
):
    """Update a service (admin only)"""
    repo = TenantRepository("service_catalog", tenant_ctx.tenant_id)
    db = get_database()
    
    service = await repo.find_one({"id": service_id})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    # Convert enums to values
    if "category" in update_data:
        update_data["category"] = update_data["category"].value
    if "pricing_type" in update_data:
        update_data["pricing_type"] = update_data["pricing_type"].value
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    update_data["updated_by"] = tenant_ctx.user_id
    
    await db.service_catalog.update_one(
        {"id": service_id, "tenant_id": tenant_ctx.tenant_id},
        {"$set": update_data}
    )
    
    return await repo.find_one({"id": service_id})


@router.delete("/{service_id}")
async def delete_service(
    service_id: str,
    tenant_ctx: TenantContext = Depends(require_role("admin"))
):
    """Delete a service (admin only)"""
    repo = TenantRepository("service_catalog", tenant_ctx.tenant_id)
    
    service = await repo.find_one({"id": service_id})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    await repo.delete_one({"id": service_id})
    
    return {"message": "Service deleted"}


# ==================== PACKAGES ====================
@router.get("/packages/list")
async def list_packages(
    tenant_ctx: TenantContext = Depends(get_tenant_context)
):
    """List all service packages"""
    repo = TenantRepository("service_packages", tenant_ctx.tenant_id)
    
    packages = await repo.find_many(
        query={"is_active": True},
        sort=[("sort_order", 1)]
    )
    
    # Enrich with service details
    db = get_database()
    for pkg in packages:
        if pkg.get("service_ids"):
            services = await db.service_catalog.find(
                {"id": {"$in": pkg["service_ids"]}, "tenant_id": tenant_ctx.tenant_id},
                {"_id": 0}
            ).to_list(100)
            pkg["services"] = services
            pkg["total_value"] = sum(s.get("base_price", 0) for s in services)
            pkg["package_price"] = pkg["total_value"] * (1 - pkg.get("discount_percent", 0) / 100)
    
    return packages


@router.post("/packages")
async def create_package(
    data: ServicePackageCreate,
    tenant_ctx: TenantContext = Depends(require_role("admin"))
):
    """Create a service package (admin only)"""
    repo = TenantRepository("service_packages", tenant_ctx.tenant_id)
    
    package = {
        "id": str(uuid.uuid4()),
        "name": data.name,
        "description": data.description,
        "service_ids": data.service_ids,
        "discount_percent": data.discount_percent,
        "is_active": True,
        "is_featured": data.is_featured,
        "sort_order": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": tenant_ctx.user_id,
    }
    
    await repo.insert_one(package)
    return package


# ==================== SEED DEFAULT SERVICES ====================
@router.post("/seed-defaults")
async def seed_default_services(
    tenant_ctx: TenantContext = Depends(require_role("admin"))
):
    """Seed default Déco Touché services"""
    db = get_database()
    
    default_services = [
        # Peinture
        {
            "name": "Peinture 3½",
            "description": "Peinture complète d'un appartement 3½ (salon, chambre, cuisine)",
            "category": "painting",
            "pricing_type": "fixed",
            "base_price": 450,
            "unit": "forfait",
            "estimated_duration": "1-2 jours",
            "includes": ["Préparation des surfaces", "2 couches de peinture", "Protection du mobilier", "Nettoyage"],
            "excludes": ["Peinture fournie", "Réparation de murs"],
            "is_featured": True,
            "sort_order": 1,
        },
        {
            "name": "Peinture 4½",
            "description": "Peinture complète d'un appartement 4½",
            "category": "painting",
            "pricing_type": "fixed",
            "base_price": 550,
            "unit": "forfait",
            "estimated_duration": "2 jours",
            "includes": ["Préparation des surfaces", "2 couches de peinture", "Protection du mobilier", "Nettoyage"],
            "excludes": ["Peinture fournie", "Réparation de murs"],
            "is_featured": True,
            "sort_order": 2,
        },
        {
            "name": "Peinture 5½+",
            "description": "Peinture complète d'un appartement 5½ ou plus",
            "category": "painting",
            "pricing_type": "fixed",
            "base_price": 700,
            "unit": "forfait",
            "estimated_duration": "2-3 jours",
            "includes": ["Préparation des surfaces", "2 couches de peinture", "Protection du mobilier", "Nettoyage"],
            "excludes": ["Peinture fournie", "Réparation de murs"],
            "is_featured": False,
            "sort_order": 3,
        },
        # Installation
        {
            "name": "Installation TV murale",
            "description": "Installation sécuritaire de votre téléviseur au mur",
            "category": "installation",
            "pricing_type": "fixed",
            "base_price": 120,
            "unit": "forfait",
            "estimated_duration": "1-2 heures",
            "includes": ["Installation du support", "Fixation de la TV", "Gestion des câbles"],
            "excludes": ["Support mural", "Câbles HDMI"],
            "is_featured": True,
            "sort_order": 10,
        },
        # Mobilier
        {
            "name": "Assemblage meuble simple",
            "description": "Assemblage d'un meuble IKEA ou similaire (commode, bureau, table)",
            "category": "furniture",
            "pricing_type": "fixed",
            "base_price": 65,
            "unit": "meuble",
            "estimated_duration": "1 heure",
            "includes": ["Assemblage complet", "Ancrage mural si nécessaire"],
            "excludes": ["Livraison"],
            "is_featured": False,
            "sort_order": 20,
        },
        {
            "name": "Assemblage lit",
            "description": "Assemblage d'un lit (simple, double, queen, king)",
            "category": "furniture",
            "pricing_type": "fixed",
            "base_price": 95,
            "unit": "lit",
            "estimated_duration": "1-2 heures",
            "includes": ["Assemblage complet", "Installation matelas"],
            "excludes": ["Livraison"],
            "is_featured": True,
            "sort_order": 21,
        },
        {
            "name": "Assemblage garde-robe PAX",
            "description": "Assemblage d'une garde-robe IKEA PAX ou similaire",
            "category": "furniture",
            "pricing_type": "fixed",
            "base_price": 175,
            "unit": "unité",
            "estimated_duration": "3-4 heures",
            "includes": ["Assemblage complet", "Ancrage mural", "Installation portes"],
            "excludes": ["Livraison"],
            "is_featured": True,
            "sort_order": 22,
        },
        # Maintenance
        {
            "name": "Homme à tout faire",
            "description": "Service d'entretien général et petites réparations",
            "category": "maintenance",
            "pricing_type": "hourly",
            "base_price": 45,
            "unit": "heure",
            "min_price": 45,
            "estimated_duration": "Variable",
            "includes": ["Main d'œuvre", "Outils de base"],
            "excludes": ["Pièces de remplacement", "Matériaux"],
            "is_featured": True,
            "sort_order": 30,
        },
        # Tech
        {
            "name": "Site web vitrine",
            "description": "Création d'un site web professionnel pour votre entreprise",
            "category": "tech",
            "pricing_type": "fixed",
            "base_price": 1500,
            "unit": "projet",
            "estimated_duration": "2-3 semaines",
            "includes": ["Design sur mesure", "5 pages", "Responsive", "SEO de base"],
            "excludes": ["Hébergement annuel", "Nom de domaine"],
            "is_featured": False,
            "sort_order": 40,
        },
    ]
    
    inserted = 0
    for service_data in default_services:
        # Check if service already exists
        existing = await db.service_catalog.find_one({
            "name": service_data["name"],
            "tenant_id": tenant_ctx.tenant_id
        })
        
        if not existing:
            service = {
                "id": str(uuid.uuid4()),
                **service_data,
                "tenant_id": tenant_ctx.tenant_id,
                "is_active": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "created_by": tenant_ctx.user_id,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
            await db.service_catalog.insert_one(service)
            inserted += 1
    
    return {"message": f"{inserted} services créés", "total": len(default_services)}
