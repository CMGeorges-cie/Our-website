"""
Policies routes — Déco Touché.

Public:
  GET /api/v1/policies-public

Admin:
  GET    /api/v1/admin/policies
  POST   /api/v1/admin/policies
  PATCH  /api/v1/admin/policies/{policy_id}
  DELETE /api/v1/admin/policies/{policy_id}
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field


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


def build_policies_router(db, get_current_user, require_admin, create_audit_log) -> APIRouter:
    router = APIRouter(tags=["Policies"])

    @router.get("/policies-public")
    async def get_public_policies():
        policies = await db.policies.find({"is_active": True}, {"_id": 0}).to_list(100)
        return {p["policy_type"]: p for p in policies}

    @router.get("/admin/policies", response_model=List[Policy])
    async def get_policies(
        policy_type: Optional[PolicyType] = None,
        user: dict = Depends(get_current_user),
    ):
        query = {}
        if policy_type:
            query["policy_type"] = policy_type
        return await db.policies.find(query, {"_id": 0}).to_list(100)

    @router.post("/admin/policies", response_model=Policy)
    async def create_policy(
        policy_data: PolicyCreate,
        request: Request,
        user: dict = Depends(get_current_user),
    ):
        await db.policies.update_many(
            {"policy_type": policy_data.policy_type}, {"$set": {"is_active": False}}
        )
        policy = Policy(**policy_data.model_dump())
        doc = policy.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()
        doc["updated_at"] = doc["updated_at"].isoformat()
        await db.policies.insert_one(doc)
        await create_audit_log(
            "policy_created", "policy", policy.id, user=user, request=request
        )
        return policy

    @router.patch("/admin/policies/{policy_id}", response_model=Policy)
    async def update_policy(
        policy_id: str,
        update: PolicyUpdate,
        request: Request,
        user: dict = Depends(get_current_user),
    ):
        update_data = {k: v for k, v in update.model_dump().items() if v is not None}
        if not update_data:
            raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        result = await db.policies.update_one({"id": policy_id}, {"$set": update_data})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Politique non trouvée")
        await create_audit_log(
            "policy_updated",
            "policy",
            policy_id,
            user=user,
            details=update_data,
            request=request,
        )
        return await db.policies.find_one({"id": policy_id}, {"_id": 0})

    @router.delete("/admin/policies/{policy_id}")
    async def delete_policy(
        policy_id: str, request: Request, user: dict = Depends(require_admin)
    ):
        result = await db.policies.delete_one({"id": policy_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Politique non trouvée")
        await create_audit_log(
            "policy_deleted", "policy", policy_id, user=user, request=request
        )
        return {"message": "Politique supprimée"}

    return router
