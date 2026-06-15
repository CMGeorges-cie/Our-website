"""
Clients routes — Déco Touché.

Admin:
  GET    /api/v1/admin/clients
  POST   /api/v1/admin/clients
  GET    /api/v1/admin/clients/{client_id}
  PATCH  /api/v1/admin/clients/{client_id}
  DELETE /api/v1/admin/clients/{client_id}
"""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request

from models import Client, ClientCreate, ClientStatus, ClientUpdate


def build_clients_router(
    *,
    db,
    get_current_user,
    require_admin,
    create_audit_log,
) -> APIRouter:
    router = APIRouter(tags=["Clients"])

    @router.get("/admin/clients", response_model=List[Client])
    async def get_clients(
        status: Optional[ClientStatus] = None,
        user: dict = Depends(get_current_user),
    ):
        query = {}
        if status:
            query["status"] = status
        clients = await db.clients.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
        for client in clients:
            if isinstance(client.get("created_at"), str):
                client["created_at"] = datetime.fromisoformat(client["created_at"])
        return clients

    @router.post("/admin/clients", response_model=Client)
    async def create_client(
        client_data: ClientCreate,
        request: Request,
        user: dict = Depends(get_current_user),
    ):
        client = Client(**client_data.model_dump())
        doc = client.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()
        await db.clients.insert_one(doc)
        await create_audit_log(
            "client_created", "client", client.id, user=user, request=request
        )
        return client

    @router.get("/admin/clients/{client_id}", response_model=Client)
    async def get_client(client_id: str, user: dict = Depends(get_current_user)):
        client = await db.clients.find_one({"id": client_id}, {"_id": 0})
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
        if isinstance(client.get("created_at"), str):
            client["created_at"] = datetime.fromisoformat(client["created_at"])
        return client

    @router.patch("/admin/clients/{client_id}", response_model=Client)
    async def update_client(
        client_id: str,
        update: ClientUpdate,
        request: Request,
        user: dict = Depends(get_current_user),
    ):
        update_data = {k: v for k, v in update.model_dump().items() if v is not None}
        if not update_data:
            raise HTTPException(status_code=400, detail="No update data provided")
        result = await db.clients.update_one({"id": client_id}, {"$set": update_data})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Client not found")
        await create_audit_log(
            "client_updated",
            "client",
            client_id,
            user=user,
            details=update_data,
            request=request,
        )
        client = await db.clients.find_one({"id": client_id}, {"_id": 0})
        if isinstance(client.get("created_at"), str):
            client["created_at"] = datetime.fromisoformat(client["created_at"])
        return client

    @router.delete("/admin/clients/{client_id}")
    async def delete_client(
        client_id: str,
        request: Request,
        user: dict = Depends(require_admin),
    ):
        result = await db.clients.delete_one({"id": client_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Client non trouvé")
        await create_audit_log(
            "client_deleted", "client", client_id, user=user, request=request
        )
        return {"message": "Client supprimé"}

    return router
