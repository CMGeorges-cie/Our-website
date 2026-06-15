"""
Discount codes routes — Déco Touché.

Public:
  POST /api/v1/validate-discount

Admin:
  GET    /api/v1/admin/discount-codes
  POST   /api/v1/admin/discount-codes
  PATCH  /api/v1/admin/discount-codes/{code_id}
  DELETE /api/v1/admin/discount-codes/{code_id}
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field


class DiscountType(str, Enum):
    PERCENTAGE = "percentage"
    FIXED = "fixed"


class DiscountCodeBase(BaseModel):
    code: str
    description: str = ""
    discount_type: DiscountType = DiscountType.PERCENTAGE
    discount_value: float
    min_order_amount: float = 0
    max_uses: Optional[int] = None
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    applicable_services: List[str] = []


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


def build_discounts_router(db, get_current_user, require_admin, create_audit_log) -> APIRouter:
    router = APIRouter(tags=["Discount Codes"])

    @router.post("/validate-discount")
    async def validate_discount_code(code: str, subtotal: float = 0, service_type: str = ""):
        discount = await db.discount_codes.find_one(
            {"code": code.upper(), "is_active": True}, {"_id": 0}
        )
        if not discount:
            raise HTTPException(status_code=404, detail="Code invalide")

        if discount.get("max_uses") and discount.get("times_used", 0) >= discount["max_uses"]:
            raise HTTPException(
                status_code=400, detail="Code expiré (limite d'utilisation atteinte)"
            )

        now = datetime.now(timezone.utc)
        if discount.get("valid_from"):
            valid_from = (
                datetime.fromisoformat(discount["valid_from"])
                if isinstance(discount["valid_from"], str)
                else discount["valid_from"]
            )
            if now < valid_from:
                raise HTTPException(status_code=400, detail="Code pas encore actif")

        if discount.get("valid_until"):
            valid_until = (
                datetime.fromisoformat(discount["valid_until"])
                if isinstance(discount["valid_until"], str)
                else discount["valid_until"]
            )
            if now > valid_until:
                raise HTTPException(status_code=400, detail="Code expiré")

        if subtotal < discount.get("min_order_amount", 0):
            raise HTTPException(
                status_code=400,
                detail=f"Commande minimum: {discount['min_order_amount']}$",
            )

        if discount.get("applicable_services") and service_type:
            if service_type not in discount["applicable_services"]:
                raise HTTPException(
                    status_code=400, detail="Code non applicable pour ce service"
                )

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
            "description": discount.get("description", ""),
        }

    @router.get("/admin/discount-codes", response_model=List[DiscountCode])
    async def get_discount_codes(
        is_active: Optional[bool] = None,
        user: dict = Depends(get_current_user),
    ):
        query = {}
        if is_active is not None:
            query["is_active"] = is_active
        return await db.discount_codes.find(query, {"_id": 0}).to_list(1000)

    @router.post("/admin/discount-codes", response_model=DiscountCode)
    async def create_discount_code(
        code_data: DiscountCodeCreate,
        request: Request,
        user: dict = Depends(get_current_user),
    ):
        existing = await db.discount_codes.find_one({"code": code_data.code.upper()})
        if existing:
            raise HTTPException(status_code=400, detail="Ce code existe déjà")

        discount = DiscountCode(**code_data.model_dump())
        discount.code = discount.code.upper()

        doc = discount.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()
        if doc.get("valid_from"):
            doc["valid_from"] = doc["valid_from"].isoformat()
        if doc.get("valid_until"):
            doc["valid_until"] = doc["valid_until"].isoformat()

        await db.discount_codes.insert_one(doc)
        await create_audit_log(
            "discount_code_created",
            "discount_code",
            discount.id,
            user=user,
            request=request,
        )
        return discount

    @router.patch("/admin/discount-codes/{code_id}", response_model=DiscountCode)
    async def update_discount_code(
        code_id: str,
        update: DiscountCodeUpdate,
        request: Request,
        user: dict = Depends(get_current_user),
    ):
        update_data = {k: v for k, v in update.model_dump().items() if v is not None}
        if not update_data:
            raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")
        # Serialize datetime values
        for k in ("valid_from", "valid_until"):
            if isinstance(update_data.get(k), datetime):
                update_data[k] = update_data[k].isoformat()

        result = await db.discount_codes.update_one({"id": code_id}, {"$set": update_data})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Code non trouvé")

        await create_audit_log(
            "discount_code_updated",
            "discount_code",
            code_id,
            user=user,
            details=update_data,
            request=request,
        )
        return await db.discount_codes.find_one({"id": code_id}, {"_id": 0})

    @router.delete("/admin/discount-codes/{code_id}")
    async def delete_discount_code(
        code_id: str, request: Request, user: dict = Depends(require_admin)
    ):
        result = await db.discount_codes.delete_one({"id": code_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Code non trouvé")
        await create_audit_log(
            "discount_code_deleted",
            "discount_code",
            code_id,
            user=user,
            request=request,
        )
        return {"message": "Code supprimé"}

    return router
