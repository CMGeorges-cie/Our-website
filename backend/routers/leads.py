"""
Leads routes — Déco Touché.

Public:
  POST /api/v1/leads

Admin:
  GET    /api/v1/admin/leads
  GET    /api/v1/admin/leads/{lead_id}
  PATCH  /api/v1/admin/leads/{lead_id}
  POST   /api/v1/admin/leads/{lead_id}/convert-to-client
  DELETE /api/v1/admin/leads/{lead_id}
"""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request

from models import (
    Client,
    Lead,
    LeadCreate,
    LeadItem,
    LeadStatus,
    LeadUpdate,
    ServiceType,
)


def build_leads_router(
    *,
    db,
    get_current_user,
    require_admin,
    create_audit_log,
    verify_recaptcha,
    recaptcha_secret_key: str,
    notify_new_lead,
    send_email,
    get_lead_confirmation_html,
) -> APIRouter:
    router = APIRouter(tags=["Leads"])

    # ---------------- Public ----------------
    @router.post("/leads", response_model=Lead)
    async def create_lead(
        lead_data: LeadCreate,
        background_tasks: BackgroundTasks,
        request: Request,
    ):
        if recaptcha_secret_key:
            if not lead_data.recaptcha_token:
                raise HTTPException(
                    status_code=400,
                    detail="reCAPTCHA requis. Veuillez cocher la case « Je ne suis pas un robot ».",
                )
            is_valid = await verify_recaptcha(lead_data.recaptcha_token)
            if not is_valid:
                raise HTTPException(
                    status_code=400,
                    detail="Échec de la vérification reCAPTCHA. Veuillez réessayer.",
                )

        lead = Lead(**lead_data.model_dump(exclude={"items", "recaptcha_token"}))
        if lead_data.items:
            lead.items = [LeadItem(**item.model_dump()) for item in lead_data.items]

        doc = lead.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()
        await db.leads.insert_one(doc)

        await create_audit_log(
            "lead_created",
            "lead",
            lead.id,
            details={"source": lead.source, "service_type": lead.service_type},
            request=request,
        )

        lead_dict = {**doc, "id": lead.id}
        await notify_new_lead(lead_dict, background_tasks)
        background_tasks.add_task(
            send_email,
            lead.email,
            "Déco Touché - Confirmation de votre demande",
            get_lead_confirmation_html(lead_dict),
        )
        return lead

    # ---------------- Admin ----------------
    @router.get("/admin/leads", response_model=List[Lead])
    async def get_leads(
        status: Optional[LeadStatus] = None,
        service_type: Optional[ServiceType] = None,
        user: dict = Depends(get_current_user),
    ):
        query = {}
        if status:
            query["status"] = status
        if service_type:
            query["service_type"] = service_type
        leads = await db.leads.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
        for lead in leads:
            if isinstance(lead.get("created_at"), str):
                lead["created_at"] = datetime.fromisoformat(lead["created_at"])
        return leads

    @router.get("/admin/leads/{lead_id}", response_model=Lead)
    async def get_lead(lead_id: str, user: dict = Depends(get_current_user)):
        lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")
        if isinstance(lead.get("created_at"), str):
            lead["created_at"] = datetime.fromisoformat(lead["created_at"])
        return lead

    @router.patch("/admin/leads/{lead_id}", response_model=Lead)
    async def update_lead(
        lead_id: str,
        update: LeadUpdate,
        request: Request,
        user: dict = Depends(get_current_user),
    ):
        update_data = {k: v for k, v in update.model_dump().items() if v is not None}
        if not update_data:
            raise HTTPException(status_code=400, detail="No update data provided")

        result = await db.leads.update_one({"id": lead_id}, {"$set": update_data})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Lead not found")

        await create_audit_log(
            "lead_updated",
            "lead",
            lead_id,
            user=user,
            details=update_data,
            request=request,
        )

        lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
        if isinstance(lead.get("created_at"), str):
            lead["created_at"] = datetime.fromisoformat(lead["created_at"])
        return lead

    @router.post("/admin/leads/{lead_id}/convert-to-client", response_model=Client)
    async def convert_lead_to_client(
        lead_id: str,
        request: Request,
        user: dict = Depends(get_current_user),
    ):
        lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")

        if lead.get("client_id"):
            existing_client = await db.clients.find_one(
                {"id": lead["client_id"]}, {"_id": 0}
            )
            if existing_client:
                return existing_client

        client = Client(
            full_name=lead["full_name"],
            email=lead["email"],
            phone=lead["phone"],
            address=lead.get("address", ""),
            city=lead.get("city", ""),
            lead_id=lead_id,
            contact_channels=lead.get("contact_channels") or {},
            preferred_channel=lead.get("preferred_channel", ""),
            source="site web",
        )
        doc = client.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()
        await db.clients.insert_one(doc)

        await db.leads.update_one(
            {"id": lead_id}, {"$set": {"client_id": client.id, "status": "won"}}
        )
        await create_audit_log(
            "lead_converted_to_client",
            "client",
            client.id,
            user=user,
            details={"lead_id": lead_id},
            request=request,
        )
        return client

    @router.delete("/admin/leads/{lead_id}")
    async def delete_lead(
        lead_id: str,
        request: Request,
        user: dict = Depends(require_admin),
    ):
        result = await db.leads.delete_one({"id": lead_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Lead not found")
        await create_audit_log(
            "lead_deleted", "lead", lead_id, user=user, request=request
        )
        return {"message": "Lead supprimé"}

    return router
