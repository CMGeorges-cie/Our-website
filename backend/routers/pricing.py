"""
Pricing items routes — Déco Touché.

Public:
  GET /api/v1/pricing-public

Admin:
  GET    /api/v1/admin/pricing
  POST   /api/v1/admin/pricing
  PATCH  /api/v1/admin/pricing/{item_id}
  DELETE /api/v1/admin/pricing/{item_id}
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import List, Optional

from services.test_data import exclude_test
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field


class PricingItemBase(BaseModel):
    name: str
    description: str = ""
    service_type: str  # manual, furniture, tech
    category: str = "general"
    unit: str = "unité"
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


def build_pricing_router(db, get_current_user, require_admin, create_audit_log) -> APIRouter:
    router = APIRouter(tags=["Pricing"])

    @router.get("/pricing-public")
    async def get_public_pricing():
        items = await db.pricing_items.find({"is_active": True, **exclude_test("pricing_items")}, {"_id": 0}).to_list(1000)
        grouped: dict = {}
        for item in items:
            service = item.get("service_type", "other")
            grouped.setdefault(service, []).append(item)
        return grouped

    @router.get("/admin/pricing", response_model=List[PricingItem])
    async def get_pricing_items(
        service_type: Optional[str] = None,
        is_active: Optional[bool] = True,
        user: dict = Depends(get_current_user),
    ):
        query = {}
        if service_type:
            query["service_type"] = service_type
        if is_active is not None:
            query["is_active"] = is_active
        return await db.pricing_items.find(query, {"_id": 0}).sort("service_type", 1).to_list(1000)

    @router.post("/admin/pricing", response_model=PricingItem)
    async def create_pricing_item(
        item_data: PricingItemCreate,
        request: Request,
        user: dict = Depends(get_current_user),
    ):
        item = PricingItem(**item_data.model_dump())
        doc = item.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()
        doc["updated_at"] = doc["updated_at"].isoformat()
        await db.pricing_items.insert_one(doc)
        await create_audit_log(
            "pricing_item_created", "pricing_item", item.id, user=user, request=request
        )
        return item

    @router.patch("/admin/pricing/{item_id}", response_model=PricingItem)
    async def update_pricing_item(
        item_id: str,
        update: PricingItemUpdate,
        request: Request,
        user: dict = Depends(get_current_user),
    ):
        update_data = {k: v for k, v in update.model_dump().items() if v is not None}
        if not update_data:
            raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        result = await db.pricing_items.update_one({"id": item_id}, {"$set": update_data})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Item non trouvé")
        await create_audit_log(
            "pricing_item_updated",
            "pricing_item",
            item_id,
            user=user,
            details=update_data,
            request=request,
        )
        return await db.pricing_items.find_one({"id": item_id}, {"_id": 0})

    @router.delete("/admin/pricing/{item_id}")
    async def delete_pricing_item(
        item_id: str, request: Request, user: dict = Depends(require_admin)
    ):
        result = await db.pricing_items.delete_one({"id": item_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Item non trouvé")
        await create_audit_log(
            "pricing_item_deleted", "pricing_item", item_id, user=user, request=request
        )
        return {"message": "Item supprimé"}

    return router
